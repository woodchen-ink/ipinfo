package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"go.uber.org/zap"
)

// CoordinateResult holds the resolved coordinates.
type CoordinateResult struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Accuracy  string  `json:"accuracy,omitempty"`
	Source    string  `json:"source"` // "geocn" or "nominatim"
}

type nominatimResult struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

// GeocodeService resolves location names to coordinates using Nominatim.
type GeocodeService struct {
	baseURL string
	cache   *cache.GenericCache
	logger  *zap.Logger

	mu              sync.Mutex
	lastRequestTime time.Time
	rateLimitDelay  time.Duration
}

func NewGeocodeService(baseURL string, geocodeCache *cache.GenericCache, logger *zap.Logger) *GeocodeService {
	return &GeocodeService{
		baseURL:        baseURL,
		cache:          geocodeCache,
		logger:         logger,
		rateLimitDelay: time.Second, // 1 request per second
	}
}

// GetCoordinates returns coordinates, preferring GeoCN data, falling back to Nominatim.
func (s *GeocodeService) GetCoordinates(ctx context.Context, geocnLat, geocnLng float64, province, city, district string) *CoordinateResult {
	// Prefer GeoCN original coordinates
	if geocnLat != 0 && geocnLng != 0 {
		return &CoordinateResult{
			Latitude:  geocnLat,
			Longitude: geocnLng,
			Accuracy:  "high",
			Source:    "geocn",
		}
	}

	// Build location query
	query := buildLocationQuery(province, city, district)
	if query == "" {
		return nil
	}

	// Check cache
	if s.cache != nil {
		data, err := s.cache.Get(ctx, query)
		if err == nil && data != nil {
			var result CoordinateResult
			if json.Unmarshal(data, &result) == nil {
				return &result
			}
		}
	}

	// Call Nominatim API
	result, err := s.geocodeLocation(ctx, query)
	if err != nil {
		s.logger.Debug("地理编码失败", zap.String("query", query), zap.Error(err))
		return nil
	}

	// Cache result
	if result != nil && s.cache != nil {
		s.cache.Set(ctx, query, result)
	}

	return result
}

func (s *GeocodeService) geocodeLocation(ctx context.Context, query string) (*CoordinateResult, error) {
	s.enforceRateLimit()

	u, err := url.Parse(s.baseURL)
	if err != nil {
		return nil, err
	}

	q := u.Query()
	q.Set("format", "json")
	q.Set("q", query)
	q.Set("limit", "1")
	q.Set("accept-language", "zh-CN")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "IPInfo-Geocoder/1.0")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nominatim HTTP %d", resp.StatusCode)
	}

	var results []nominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, nil
	}

	var lat, lng float64
	fmt.Sscanf(results[0].Lat, "%f", &lat)
	fmt.Sscanf(results[0].Lon, "%f", &lng)

	return &CoordinateResult{
		Latitude:  lat,
		Longitude: lng,
		Accuracy:  "medium",
		Source:    "nominatim",
	}, nil
}

func (s *GeocodeService) enforceRateLimit() {
	s.mu.Lock()
	defer s.mu.Unlock()

	elapsed := time.Since(s.lastRequestTime)
	if elapsed < s.rateLimitDelay {
		time.Sleep(s.rateLimitDelay - elapsed)
	}
	s.lastRequestTime = time.Now()
}

func buildLocationQuery(province, city, district string) string {
	var parts []string

	if province != "" {
		parts = append(parts, province)
	}

	if city != "" {
		cleanCity := strings.TrimRight(city, "市县区")
		cleanProv := strings.TrimRight(province, "省市")
		if cleanCity != "" && cleanCity != cleanProv {
			parts = append(parts, cleanCity)
		}
	}

	if district != "" {
		cleanDistrict := strings.TrimRight(district, "区县")
		cleanCity := strings.TrimRight(city, "市县区")
		if cleanDistrict != "" && cleanDistrict != cleanCity {
			parts = append(parts, cleanDistrict)
		}
	}

	if len(parts) == 0 {
		return ""
	}

	return strings.Join(parts, " ") + " 中国"
}
