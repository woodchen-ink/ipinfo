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

// BGPService queries BGP peer information from bgpview.io.
type BGPService struct {
	cache  *cache.GenericCache
	logger *zap.Logger
}

func NewBGPService(bgpCache *cache.GenericCache, logger *zap.Logger) *BGPService {
	return &BGPService{cache: bgpCache, logger: logger}
}

// QueryPeers fetches and deduplicates BGP peers for the given ASN.
func (s *BGPService) QueryPeers(ctx context.Context, asn int) (*model.ProcessedBGPData, error) {
	// Check cache
	cacheKey := fmt.Sprintf("%d", asn)
	if s.cache != nil {
		data, err := s.cache.Get(ctx, cacheKey)
		if err == nil && data != nil {
			var result model.ProcessedBGPData
			if json.Unmarshal(data, &result) == nil {
				return &result, nil
			}
		}
	}

	// Call bgpview.io
	url := fmt.Sprintf("https://api.bgpview.io/asn/%d/peers", asn)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "IPInfo-Query-App/1.0")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return nil, fmt.Errorf("BGP查询超时")
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// continue
	case http.StatusNotFound:
		return nil, fmt.Errorf("ASN %d 未找到", asn)
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("BGP API请求过于频繁")
	case http.StatusServiceUnavailable:
		return nil, fmt.Errorf("BGP服务暂时不可用")
	default:
		return nil, fmt.Errorf("BGP查询失败: HTTP %d", resp.StatusCode)
	}

	var bgpResp model.BGPViewResponse
	if err := json.NewDecoder(resp.Body).Decode(&bgpResp); err != nil {
		return nil, fmt.Errorf("BGP响应解析失败: %w", err)
	}

	// Process and deduplicate
	result := s.processResponse(asn, &bgpResp)

	// Cache result
	if s.cache != nil {
		s.cache.Set(ctx, cacheKey, result)
	}

	return result, nil
}

func (s *BGPService) processResponse(asn int, resp *model.BGPViewResponse) *model.ProcessedBGPData {
	result := &model.ProcessedBGPData{
		CenterASN:  asn,
		CenterName: fmt.Sprintf("AS%d", asn),
	}

	// Convert IPv4 peers
	for _, p := range resp.Data.IPv4Peers {
		result.IPv4Peers = append(result.IPv4Peers, model.BGPPeer{
			ASN:         p.ASN,
			Name:        p.Name,
			Description: p.Description,
			CountryCode: p.CountryCode,
		})
	}

	// Convert IPv6 peers
	for _, p := range resp.Data.IPv6Peers {
		result.IPv6Peers = append(result.IPv6Peers, model.BGPPeer{
			ASN:         p.ASN,
			Name:        p.Name,
			Description: p.Description,
			CountryCode: p.CountryCode,
		})
	}

	// Deduplicate all peers
	seen := make(map[int]bool)
	for _, p := range result.IPv4Peers {
		if !seen[p.ASN] {
			seen[p.ASN] = true
			result.AllPeers = append(result.AllPeers, p)
		}
	}
	for _, p := range result.IPv6Peers {
		if !seen[p.ASN] {
			seen[p.ASN] = true
			result.AllPeers = append(result.AllPeers, p)
		}
	}

	// Ensure non-nil slices for JSON
	if result.IPv4Peers == nil {
		result.IPv4Peers = []model.BGPPeer{}
	}
	if result.IPv6Peers == nil {
		result.IPv6Peers = []model.BGPPeer{}
	}
	if result.AllPeers == nil {
		result.AllPeers = []model.BGPPeer{}
	}

	return result
}
