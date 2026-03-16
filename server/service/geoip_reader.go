package service

import (
	"fmt"
	"net"
	"net/netip"
	"os"
	"path/filepath"
	"sync"

	"github.com/oschwald/geoip2-golang"
	maxminddb "github.com/oschwald/maxminddb-golang/v2"
	"go.uber.org/zap"
)

// GeoCNResult matches the custom MMDB schema used by GeoCN.mmdb.
type GeoCNResult struct {
	Country  string  `maxminddb:"country"`
	Province string  `maxminddb:"province"`
	City     string  `maxminddb:"city"`
	District string  `maxminddb:"district"`
	ISP      string  `maxminddb:"isp"`
	Type     string  `maxminddb:"type"`
	Desc     string  `maxminddb:"desc"`
	Lat      float64 `maxminddb:"lat"`
	Lng      float64 `maxminddb:"lng"`
}

// RawQueryResult wraps a single data source result.
type RawQueryResult struct {
	Source      string  // "maxmind" or "geocn"
	Accuracy    float64 // 0-1
	Completeness float64 // 0-1

	// MaxMind results (nil if not available)
	CityData *geoip2.City
	ASNData  *geoip2.ASN

	// GeoCN result (nil if not available)
	GeoCNData *GeoCNResult
}

// GeoIPReader manages the three MMDB database files.
type GeoIPReader struct {
	cityReader *geoip2.Reader
	asnReader  *geoip2.Reader
	geocnReader *maxminddb.Reader

	mu     sync.RWMutex
	logger *zap.Logger
}

// NewGeoIPReader opens the MMDB databases from the given directory.
func NewGeoIPReader(dataDir string, logger *zap.Logger) (*GeoIPReader, error) {
	reader := &GeoIPReader{logger: logger}

	cityPath := filepath.Join(dataDir, "GeoLite2-City.mmdb")
	asnPath := filepath.Join(dataDir, "GeoLite2-ASN.mmdb")
	geocnPath := filepath.Join(dataDir, "GeoCN.mmdb")

	var cityErr, asnErr, geocnErr error

	// Open MaxMind City
	if _, err := os.Stat(cityPath); err == nil {
		reader.cityReader, cityErr = geoip2.Open(cityPath)
		if cityErr != nil {
			logger.Warn("MaxMind City数据库初始化失败", zap.Error(cityErr))
		}
	} else {
		logger.Warn("MaxMind City数据库文件不存在", zap.String("path", cityPath))
	}

	// Open MaxMind ASN
	if _, err := os.Stat(asnPath); err == nil {
		reader.asnReader, asnErr = geoip2.Open(asnPath)
		if asnErr != nil {
			logger.Warn("MaxMind ASN数据库初始化失败", zap.Error(asnErr))
		}
	} else {
		logger.Warn("MaxMind ASN数据库文件不存在", zap.String("path", asnPath))
	}

	// Open GeoCN
	if _, err := os.Stat(geocnPath); err == nil {
		reader.geocnReader, geocnErr = maxminddb.Open(geocnPath)
		if geocnErr != nil {
			logger.Warn("GeoCN数据库初始化失败", zap.Error(geocnErr))
		}
	} else {
		logger.Warn("GeoCN数据库文件不存在", zap.String("path", geocnPath))
	}

	if reader.cityReader == nil && reader.geocnReader == nil {
		return nil, fmt.Errorf("所有数据库初始化失败: city=%v, asn=%v, geocn=%v", cityErr, asnErr, geocnErr)
	}

	logger.Info("GeoIP数据库初始化完成")
	return reader, nil
}

// QueryIP queries all available databases for the given IP.
func (r *GeoIPReader) QueryIP(ip string) ([]RawQueryResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	parsed := net.ParseIP(ip)
	if parsed == nil {
		return nil, fmt.Errorf("无效的IP地址格式: %s", ip)
	}

	var results []RawQueryResult

	// Query MaxMind
	if r.cityReader != nil {
		result := r.queryMaxMind(parsed)
		if result != nil {
			results = append(results, *result)
		}
	}

	// Query GeoCN
	if r.geocnReader != nil {
		result := r.queryGeoCN(parsed)
		if result != nil {
			results = append(results, *result)
		}
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到IP地址 %s 的地理位置信息", ip)
	}

	return results, nil
}

func (r *GeoIPReader) queryMaxMind(ip net.IP) *RawQueryResult {
	cityResult, cityErr := r.cityReader.City(ip)
	if cityErr != nil {
		r.logger.Debug("MaxMind City查询失败", zap.Error(cityErr))
		return nil
	}

	var asnResult *geoip2.ASN
	if r.asnReader != nil {
		asn, err := r.asnReader.ASN(ip)
		if err != nil {
			r.logger.Debug("MaxMind ASN查询失败", zap.Error(err))
		} else {
			asnResult = asn
		}
	}

	accuracy := evaluateMaxMindAccuracy(cityResult)
	completeness := evaluateMaxMindCompleteness(cityResult, asnResult)

	return &RawQueryResult{
		Source:       "maxmind",
		Accuracy:     accuracy,
		Completeness: completeness,
		CityData:     cityResult,
		ASNData:      asnResult,
	}
}

func (r *GeoIPReader) queryGeoCN(ip net.IP) *RawQueryResult {
	// maxminddb-golang/v2 requires netip.Addr
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		r.logger.Debug("GeoCN: 无法转换IP为netip.Addr")
		return nil
	}
	var result GeoCNResult
	err := r.geocnReader.Lookup(addr).Decode(&result)
	if err != nil {
		r.logger.Debug("GeoCN查询失败", zap.Error(err))
		return nil
	}

	// Empty result check
	if result.Country == "" && result.Province == "" && result.City == "" {
		return nil
	}

	accuracy := evaluateGeoCNAccuracy(&result)
	completeness := evaluateGeoCNCompleteness(&result)

	return &RawQueryResult{
		Source:       "geocn",
		Accuracy:     accuracy,
		Completeness: completeness,
		GeoCNData:    &result,
	}
}

// Close releases all database resources.
func (r *GeoIPReader) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.cityReader != nil {
		r.cityReader.Close()
	}
	if r.asnReader != nil {
		r.asnReader.Close()
	}
	if r.geocnReader != nil {
		r.geocnReader.Close()
	}
}
