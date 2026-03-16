package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
)

type ipinfoAPIResponse struct {
	IP            string `json:"ip"`
	ASN           string `json:"asn"`
	ASName        string `json:"as_name"`
	ASDomain      string `json:"as_domain"`
	CountryCode   string `json:"country_code"`
	Country       string `json:"country"`
	ContinentCode string `json:"continent_code"`
	Continent     string `json:"continent"`
}

// IPInfoFallbackService queries IPInfo.io as a secondary fallback.
type IPInfoFallbackService struct {
	baseURL string
	token   string
}

func NewIPInfoFallbackService(token string) *IPInfoFallbackService {
	return &IPInfoFallbackService{
		baseURL: "https://api.ipinfo.io/lite",
		token:   token,
	}
}

func (s *IPInfoFallbackService) IsAvailable() bool {
	return s.token != ""
}

func (s *IPInfoFallbackService) QueryIP(ctx context.Context, ip string) (*model.IPInfo, error) {
	if !s.IsAvailable() {
		return nil, fmt.Errorf("IPInfo token not configured")
	}

	url := fmt.Sprintf("%s/%s?token=%s", s.baseURL, ip, s.token)

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
		return nil, fmt.Errorf("IPInfo API: HTTP %d", resp.StatusCode)
	}

	var data ipinfoAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return s.transformResponse(&data), nil
}

func (s *IPInfoFallbackService) transformResponse(data *ipinfoAPIResponse) *model.IPInfo {
	ipVersion := "IPv4"
	if strings.Contains(data.IP, ":") {
		ipVersion = "IPv6"
	}

	info := &model.IPInfo{
		IP:          data.IP,
		Country:     data.Country,
		CountryCode: data.CountryCode,
		City:        "未知",
		Location: model.Location{
			Latitude: 0, Longitude: 0, AccuracyRadius: 0,
		},
		Accuracy:  "low",
		Source:    "MaxMind", // Keep original label for UI compatibility
		IPVersion: ipVersion,
		ISP:       data.ASName,
		Timezone:  "UTC",
		RegisteredCountry: &model.RegisteredCountry{
			Code: data.CountryCode,
			Name: data.Country,
		},
	}

	if data.Country == "" {
		info.Country = "未知"
	}
	if data.CountryCode == "" {
		info.CountryCode = "UNKNOWN"
	}
	if data.ASName == "" {
		info.ISP = "未知运营商"
	}

	if data.ASN != "" {
		asnNum, _ := strconv.Atoi(strings.TrimPrefix(data.ASN, "AS"))
		if asnNum > 0 {
			info.AS = &model.ASInfo{
				Number: asnNum,
				Name:   data.ASName,
				Info:   data.ASDomain,
			}
		}
	}

	return info
}
