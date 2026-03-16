package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"sync"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"go.uber.org/zap"
)

// BGPService queries BGP peer information from RIPEstat.
type BGPService struct {
	cache  *cache.GenericCache
	logger *zap.Logger
}

func NewBGPService(bgpCache *cache.GenericCache, logger *zap.Logger) *BGPService {
	return &BGPService{cache: bgpCache, logger: logger}
}

// QueryPeers fetches BGP neighbours for the given ASN from RIPEstat.
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

	// Fetch neighbours and ASN overview concurrently
	var (
		neighbourResp model.RIPEStatResponse
		overviewResp  model.RIPEStatOverviewResponse
		neighbourErr  error
		overviewErr   error
		wg            sync.WaitGroup
	)

	wg.Add(2)

	go func() {
		defer wg.Done()
		neighbourResp, neighbourErr = s.fetchNeighbours(ctx, asn)
	}()

	go func() {
		defer wg.Done()
		overviewResp, overviewErr = s.fetchOverview(ctx, asn)
	}()

	wg.Wait()

	if neighbourErr != nil {
		return nil, neighbourErr
	}

	// Build result
	centerName := fmt.Sprintf("AS%d", asn)
	if overviewErr == nil && overviewResp.Data.Holder != "" {
		centerName = overviewResp.Data.Holder
	}

	result := s.processResponse(asn, centerName, &neighbourResp)

	// Cache result
	if s.cache != nil {
		s.cache.Set(ctx, cacheKey, result)
	}

	return result, nil
}

func (s *BGPService) fetchNeighbours(ctx context.Context, asn int) (model.RIPEStatResponse, error) {
	url := fmt.Sprintf("https://stat.ripe.net/data/asn-neighbours/data.json?resource=AS%d", asn)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return model.RIPEStatResponse{}, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return model.RIPEStatResponse{}, fmt.Errorf("BGP查询超时")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return model.RIPEStatResponse{}, fmt.Errorf("BGP查询失败: HTTP %d", resp.StatusCode)
	}

	var result model.RIPEStatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return model.RIPEStatResponse{}, fmt.Errorf("BGP响应解析失败: %w", err)
	}

	if result.Status != "ok" {
		return model.RIPEStatResponse{}, fmt.Errorf("BGP查询失败: %s", result.Status)
	}

	return result, nil
}

func (s *BGPService) fetchOverview(ctx context.Context, asn int) (model.RIPEStatOverviewResponse, error) {
	url := fmt.Sprintf("https://stat.ripe.net/data/as-overview/data.json?resource=AS%d", asn)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return model.RIPEStatOverviewResponse{}, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return model.RIPEStatOverviewResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return model.RIPEStatOverviewResponse{}, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var result model.RIPEStatOverviewResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return model.RIPEStatOverviewResponse{}, err
	}

	return result, nil
}

func (s *BGPService) processResponse(asn int, centerName string, resp *model.RIPEStatResponse) *model.ProcessedBGPData {
	result := &model.ProcessedBGPData{
		CenterASN:  asn,
		CenterName: centerName,
	}

	for _, n := range resp.Data.Neighbours {
		peer := model.BGPPeer{
			ASN:    n.ASN,
			Type:   n.Type,
			Power:  n.Power,
			V4Peer: n.V4Peers,
			V6Peer: n.V6Peers,
		}

		switch n.Type {
		case "left":
			result.Upstreams = append(result.Upstreams, peer)
		case "right":
			result.Downstreams = append(result.Downstreams, peer)
		default:
			result.Uncertain = append(result.Uncertain, peer)
		}

		result.AllPeers = append(result.AllPeers, peer)
	}

	// Sort by power descending
	sortByPower := func(peers []model.BGPPeer) {
		sort.Slice(peers, func(i, j int) bool {
			return peers[i].Power > peers[j].Power
		})
	}
	sortByPower(result.Upstreams)
	sortByPower(result.Downstreams)
	sortByPower(result.Uncertain)
	sortByPower(result.AllPeers)

	// Ensure non-nil slices for JSON
	if result.Upstreams == nil {
		result.Upstreams = []model.BGPPeer{}
	}
	if result.Downstreams == nil {
		result.Downstreams = []model.BGPPeer{}
	}
	if result.Uncertain == nil {
		result.Uncertain = []model.BGPPeer{}
	}
	if result.AllPeers == nil {
		result.AllPeers = []model.BGPPeer{}
	}

	return result
}
