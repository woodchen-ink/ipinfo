package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"go.uber.org/zap"
)

// NcgyService queries ip.nc.gy for supplementary IP classification data.
type NcgyService struct {
	baseURL string
	cache   *cache.GenericCache
	logger  *zap.Logger
}

func NewNcgyService(ncgyCache *cache.GenericCache, logger *zap.Logger) *NcgyService {
	return &NcgyService{
		baseURL: "https://ip.nc.gy/json",
		cache:   ncgyCache,
		logger:  logger,
	}
}

// QueryIP queries ip.nc.gy for the given IP and returns simplified info.
func (s *NcgyService) QueryIP(ctx context.Context, ip string) (*model.NcgyInfo, error) {
	// Check cache
	if s.cache != nil {
		data, err := s.cache.Get(ctx, ip)
		if err == nil && data != nil {
			var result model.NcgyInfo
			if json.Unmarshal(data, &result) == nil {
				return &result, nil
			}
		}
	}

	url := fmt.Sprintf("%s?ip=%s", s.baseURL, ip)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "IPInfo-Query-App/1.0")

	resp, err := httpclient.Short.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ip.nc.gy API: HTTP %d", resp.StatusCode)
	}

	var raw model.NcgyAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("ip.nc.gy: 解析响应失败: %w", err)
	}

	result := s.transformResponse(&raw)

	// Cache result
	if s.cache != nil {
		if err := s.cache.Set(ctx, ip, result); err != nil {
			s.logger.Warn("ip.nc.gy 缓存写入失败", zap.Error(err))
		}
	}

	return result, nil
}

func (s *NcgyService) transformResponse(raw *model.NcgyAPIResponse) *model.NcgyInfo {
	info := &model.NcgyInfo{}

	// Extract city name (prefer zh-CN, fallback to en)
	if raw.City != nil && raw.City.Names != nil {
		if name, ok := raw.City.Names["zh-CN"]; ok {
			info.City = name
		} else if name, ok := raw.City.Names["en"]; ok {
			info.City = name
		}
	}

	// Extract country
	if raw.Country != nil {
		info.CountryCode = raw.Country.ISOCode
		if raw.Country.Names != nil {
			if name, ok := raw.Country.Names["zh-CN"]; ok {
				info.Country = name
			} else if name, ok := raw.Country.Names["en"]; ok {
				info.Country = name
			}
		}
	}

	// Extract province/subdivision
	if len(raw.Subdivisions) > 0 && raw.Subdivisions[0].Names != nil {
		if name, ok := raw.Subdivisions[0].Names["zh-CN"]; ok {
			info.Province = name
		} else if name, ok := raw.Subdivisions[0].Names["en"]; ok {
			info.Province = name
		}
	}

	// Extract ASN
	if raw.ASN != nil {
		info.ASN = raw.ASN.Number
		info.ASOrg = raw.ASN.Org
	}

	// Extract proxy detection
	if raw.Proxy != nil {
		info.Proxy = &model.NcgyProxy{
			IsProxy:     raw.Proxy.IsProxy,
			IsVPN:       raw.Proxy.IsVPN,
			IsTor:       raw.Proxy.IsTor,
			IsHosting:   raw.Proxy.IsHosting,
			IsCDN:       raw.Proxy.IsCDN,
			IsSchool:    raw.Proxy.IsSchool,
			IsAnonymous: raw.Proxy.IsAnonymous,
		}
	}

	return info
}
