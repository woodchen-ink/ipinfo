package service

import (
	"context"
	"fmt"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
	"go.uber.org/zap"
)

// GeoIPService is the main orchestrator for IP geolocation queries.
type GeoIPService struct {
	reader          *GeoIPReader
	ipCache         *cache.IPCache
	merger          *DataMerger
	maxmindFallback *MaxMindFallbackService
	ipinfoFallback  *IPInfoFallbackService
	logger          *zap.Logger
}

func NewGeoIPService(
	reader *GeoIPReader,
	ipCache *cache.IPCache,
	geocodeSvc *GeocodeService,
	maxmindFallback *MaxMindFallbackService,
	ipinfoFallback *IPInfoFallbackService,
	logger *zap.Logger,
) *GeoIPService {
	return &GeoIPService{
		reader:          reader,
		ipCache:         ipCache,
		merger:          NewDataMerger(geocodeSvc),
		maxmindFallback: maxmindFallback,
		ipinfoFallback:  ipinfoFallback,
		logger:          logger,
	}
}

// QueryIPInfo queries geolocation info for the given IP address.
func (s *GeoIPService) QueryIPInfo(ctx context.Context, ip string) (*model.IPInfo, error) {
	// 1. Check cache
	cached, err := s.ipCache.Get(ctx, ip)
	if err != nil {
		s.logger.Warn("缓存读取失败", zap.Error(err))
	}
	if cached != nil {
		return cached, nil
	}

	// 2. Handle private IPs
	if iputil.IsPrivateIP(ip) {
		info := CreatePrivateIPInfo(ip)
		s.ipCache.Set(ctx, ip, info)
		return info, nil
	}

	// 3. Query MMDB databases
	rawResults, err := s.reader.QueryIP(ip)
	if err == nil && len(rawResults) > 0 {
		// 4. Merge data sources
		info, mergeErr := s.merger.Merge(ctx, ip, rawResults)
		if mergeErr == nil {
			// 5. Cache result
			s.ipCache.Set(ctx, ip, info)
			return info, nil
		}
		s.logger.Warn("数据合并失败", zap.Error(mergeErr))
	} else if err != nil {
		s.logger.Warn("MMDB查询失败", zap.Error(err))
	}

	// 6. Fallback chain
	// Try MaxMind Web API
	if s.maxmindFallback != nil && s.maxmindFallback.IsAvailable() {
		s.logger.Info("尝试MaxMind Web API回退", zap.String("ip", ip))
		info, fallbackErr := s.maxmindFallback.QueryIP(ctx, ip)
		if fallbackErr == nil && info != nil {
			s.ipCache.Set(ctx, ip, info)
			return info, nil
		}
		s.logger.Warn("MaxMind Web API回退失败", zap.Error(fallbackErr))
	}

	// Try IPInfo.io
	if s.ipinfoFallback != nil && s.ipinfoFallback.IsAvailable() {
		s.logger.Info("尝试IPInfo.io回退", zap.String("ip", ip))
		info, fallbackErr := s.ipinfoFallback.QueryIP(ctx, ip)
		if fallbackErr == nil && info != nil {
			s.ipCache.Set(ctx, ip, info)
			return info, nil
		}
		s.logger.Warn("IPInfo.io回退失败", zap.Error(fallbackErr))
	}

	return nil, fmt.Errorf("IP查询失败: %s", ip)
}

// GetCacheStats returns cache statistics.
func (s *GeoIPService) GetCacheStats(ctx context.Context) (map[string]interface{}, error) {
	return s.ipCache.GetStats(ctx)
}

// Close releases resources.
func (s *GeoIPService) Close() {
	if s.reader != nil {
		s.reader.Close()
	}
}
