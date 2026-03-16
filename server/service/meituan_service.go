package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
	"go.uber.org/zap"
)

const (
	meituanIPAPIURL       = "https://apimobile.meituan.com/locate/v2/ip/loc"
	meituanLocationAPIURL = "https://apimobile.meituan.com/group/v1/city/latlng"
)

// MeituanService queries Meituan APIs for enhanced Chinese IP geolocation.
type MeituanService struct {
	cache  *cache.GenericCache
	logger *zap.Logger
}

func NewMeituanService(meituanCache *cache.GenericCache, logger *zap.Logger) *MeituanService {
	return &MeituanService{cache: meituanCache, logger: logger}
}

// EnhancedIPQuery performs a two-step query: IP location → detail address.
func (s *MeituanService) EnhancedIPQuery(ctx context.Context, ip string) (*model.IPInfo, error) {
	// Check cache
	if s.cache != nil {
		data, err := s.cache.Get(ctx, ip)
		if err == nil && data != nil {
			var result model.IPInfo
			if json.Unmarshal(data, &result) == nil {
				return &result, nil
			}
		}
	}

	// Step 1: Query IP location
	ipInfo, err := s.queryIPLocation(ctx, ip)
	if err != nil {
		return nil, err
	}

	// Step 2: Query location details
	if ipInfo.Location.Latitude != 0 && ipInfo.Location.Longitude != 0 {
		details, err := s.queryLocationDetails(ctx, ipInfo.Location.Latitude, ipInfo.Location.Longitude)
		if err == nil && details != nil {
			ipInfo.Meituan = &model.MeituanData{
				AreaName:     details.Data.AreaName,
				Detail:       details.Data.Detail,
				CityPinyin:   details.Data.CityPinyin,
				OpenCityName: details.Data.OpenCityName,
				IsForeign:    details.Data.IsForeign,
				DpCityId:     details.Data.DpCityId,
				Area:         details.Data.Area,
				ParentArea:   details.Data.ParentArea,
				Fromwhere:    ipInfo.Meituan.Fromwhere,
				Adcode:       ipInfo.Meituan.Adcode,
			}
			ipInfo.Accuracy = "high"
		}
	}

	// Cache result
	if s.cache != nil {
		s.cache.Set(ctx, ip, ipInfo)
	}

	return ipInfo, nil
}

func (s *MeituanService) queryIPLocation(ctx context.Context, ip string) (*model.IPInfo, error) {
	url := fmt.Sprintf("%s?rgeo=true&ip=%s", meituanIPAPIURL, ip)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.meituan.com/")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return nil, fmt.Errorf("美团API请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("美团API请求失败: HTTP %d", resp.StatusCode)
	}

	var result model.MeituanIPResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("美团API响应解析失败: %w", err)
	}

	ipVersion := iputil.DetectIPVersion(ip)
	countryCode := "XX"
	if result.Data.Rgeo.Country == "中国" {
		countryCode = "CN"
	}

	return &model.IPInfo{
		IP:          ip,
		Country:     result.Data.Rgeo.Country,
		CountryCode: countryCode,
		Province:    result.Data.Rgeo.Province,
		City:        result.Data.Rgeo.City,
		District:    result.Data.Rgeo.District,
		Location: model.Location{
			Latitude:  result.Data.Lat,
			Longitude: result.Data.Lng,
		},
		Accuracy:  "medium",
		Source:    "MeiTuan",
		IPVersion: ipVersion,
		Meituan: &model.MeituanData{
			Fromwhere: result.Data.Fromwhere,
			Adcode:    result.Data.Rgeo.Adcode,
		},
	}, nil
}

func (s *MeituanService) queryLocationDetails(ctx context.Context, lat, lng float64) (*model.MeituanLocationResponse, error) {
	url := fmt.Sprintf("%s/%f,%f?tag=0", meituanLocationAPIURL, lat, lng)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.meituan.com/")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("美团地址查询失败: HTTP %d", resp.StatusCode)
	}

	var result model.MeituanLocationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// IsSuitableForMeituan checks if the IP is valid for Meituan queries.
func (s *MeituanService) IsSuitableForMeituan(ip string) bool {
	return iputil.IsValidIP(ip) && !iputil.IsPrivateIP(ip)
}
