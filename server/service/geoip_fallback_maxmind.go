package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
)

type maxmindAPIResponse struct {
	Country *struct {
		IsoCode string            `json:"iso_code"`
		Names   map[string]string `json:"names"`
	} `json:"country"`
	Subdivisions []struct {
		IsoCode string            `json:"iso_code"`
		Names   map[string]string `json:"names"`
	} `json:"subdivisions"`
	City *struct {
		Names map[string]string `json:"names"`
	} `json:"city"`
	Location *struct {
		Latitude       float64 `json:"latitude"`
		Longitude      float64 `json:"longitude"`
		AccuracyRadius int     `json:"accuracy_radius"`
		TimeZone       string  `json:"time_zone"`
	} `json:"location"`
	Postal *struct {
		Code string `json:"code"`
	} `json:"postal"`
	RegisteredCountry *struct {
		IsoCode string            `json:"iso_code"`
		Names   map[string]string `json:"names"`
	} `json:"registered_country"`
	// ASN endpoint fields
	AutonomousSystemNumber       int    `json:"autonomous_system_number"`
	AutonomousSystemOrganization string `json:"autonomous_system_organization"`
	Network                      string `json:"network"`
}

// MaxMindFallbackService queries the MaxMind Web API as a fallback.
type MaxMindFallbackService struct {
	baseURL    string
	accountID  string
	licenseKey string
}

func NewMaxMindFallbackService(accountID, licenseKey string) *MaxMindFallbackService {
	return &MaxMindFallbackService{
		baseURL:    "https://geolite.info/geoip/v2.1",
		accountID:  accountID,
		licenseKey: licenseKey,
	}
}

func (s *MaxMindFallbackService) IsAvailable() bool {
	return s.accountID != "" && s.licenseKey != ""
}

func (s *MaxMindFallbackService) QueryIP(ctx context.Context, ip string) (*model.IPInfo, error) {
	if !s.IsAvailable() {
		return nil, fmt.Errorf("MaxMind credentials not configured")
	}

	cityData, _ := s.queryEndpoint(ctx, "city", ip)
	asnData, _ := s.queryEndpoint(ctx, "asn", ip)

	if cityData == nil && asnData == nil {
		return nil, fmt.Errorf("MaxMind API: no data for IP %s", ip)
	}

	return s.transformResponse(ip, cityData, asnData), nil
}

func (s *MaxMindFallbackService) queryEndpoint(ctx context.Context, endpoint, ip string) (*maxmindAPIResponse, error) {
	url := fmt.Sprintf("%s/%s/%s", s.baseURL, endpoint, ip)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.accountID, s.licenseKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "IPInfo-Query-App/1.0")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MaxMind %s API: HTTP %d", endpoint, resp.StatusCode)
	}

	var result maxmindAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *MaxMindFallbackService) transformResponse(ip string, city, asn *maxmindAPIResponse) *model.IPInfo {
	getName := func(names map[string]string) string {
		if names == nil {
			return "未知"
		}
		if n, ok := names["zh-CN"]; ok && n != "" {
			return n
		}
		if n, ok := names["en"]; ok && n != "" {
			return n
		}
		return "未知"
	}

	info := &model.IPInfo{
		IP:        ip,
		Country:   "未知",
		CountryCode: "UNKNOWN",
		Location: model.Location{
			Latitude: 0, Longitude: 0, AccuracyRadius: 0,
		},
		Accuracy:  "medium",
		Source:    "MaxMind",
		IPVersion: iputil.DetectIPVersion(ip),
		ISP:       "未知运营商",
		Timezone:  "UTC",
	}

	if city != nil {
		if city.Country != nil {
			info.Country = getName(city.Country.Names)
			info.CountryCode = city.Country.IsoCode
		}
		if len(city.Subdivisions) > 0 {
			info.Province = getName(city.Subdivisions[0].Names)
			info.ProvinceCode = city.Subdivisions[0].IsoCode
		}
		if city.City != nil {
			info.City = getName(city.City.Names)
		}
		if city.Location != nil {
			info.Location = model.Location{
				Latitude:       city.Location.Latitude,
				Longitude:      city.Location.Longitude,
				AccuracyRadius: city.Location.AccuracyRadius,
			}
			info.Timezone = city.Location.TimeZone
			info.Accuracy = "high"
		}
		if city.Postal != nil {
			info.Postal = city.Postal.Code
		}
		if city.RegisteredCountry != nil {
			info.RegisteredCountry = &model.RegisteredCountry{
				Code: city.RegisteredCountry.IsoCode,
				Name: getName(city.RegisteredCountry.Names),
			}
		}
	}

	if asn != nil && asn.AutonomousSystemNumber > 0 {
		info.AS = &model.ASInfo{
			Number: asn.AutonomousSystemNumber,
			Name:   asn.AutonomousSystemOrganization,
			Info:   asn.Network,
		}
		info.ISP = asn.AutonomousSystemOrganization
	}

	// Detect IP version
	if strings.Contains(ip, ":") {
		info.IPVersion = "IPv6"
	} else {
		info.IPVersion = "IPv4"
	}

	return info
}
