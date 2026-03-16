package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/httpclient"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

var ipipRegex = regexp.MustCompile(`当前 IP：(\d+\.\d+\.\d+\.\d+)`)

// ProxyDetectionService detects proxy/VPN usage by comparing multiple IP sources.
type ProxyDetectionService struct {
	cache  *cache.GenericCache
	logger *zap.Logger
}

func NewProxyDetectionService(proxyCache *cache.GenericCache, logger *zap.Logger) *ProxyDetectionService {
	return &ProxyDetectionService{cache: proxyCache, logger: logger}
}

// Detect checks whether the client is using a proxy.
func (s *ProxyDetectionService) Detect(ctx context.Context, headerIP string) (*model.ProxyDetectionResult, error) {
	// Check cache
	if headerIP != "" && s.cache != nil {
		data, err := s.cache.Get(ctx, headerIP)
		if err == nil && data != nil {
			var result model.ProxyDetectionResult
			if json.Unmarshal(data, &result) == nil {
				return &result, nil
			}
		}
	}

	startTime := time.Now()
	var errors []string

	var domesticIP, foreignIP string

	g, gctx := errgroup.WithContext(ctx)

	// Fetch domestic IP (IPIP.NET)
	g.Go(func() error {
		ip, err := fetchDomesticIP(gctx)
		if err != nil {
			errors = append(errors, fmt.Sprintf("国内源(IPIP.NET) 获取失败: %s", err.Error()))
			return nil // Don't fail the group
		}
		domesticIP = ip
		return nil
	})

	// Fetch foreign IP (IPINFO.IO)
	g.Go(func() error {
		ip, err := fetchForeignIP(gctx)
		if err != nil {
			errors = append(errors, fmt.Sprintf("国外源(IPINFO.IO) 获取失败: %s", err.Error()))
			return nil
		}
		foreignIP = ip
		return nil
	})

	g.Wait()

	// Analyze proxy type
	proxyType, confidence := analyzeProxyType(headerIP, domesticIP, foreignIP)
	isUsingProxy := proxyType != "direct" && proxyType != "unknown"

	detectionTime := time.Since(startTime).Milliseconds()

	var headerIPPtr, domesticIPPtr, foreignIPPtr *string
	if headerIP != "" {
		headerIPPtr = &headerIP
	}
	if domesticIP != "" {
		domesticIPPtr = &domesticIP
	}
	if foreignIP != "" {
		foreignIPPtr = &foreignIP
	}

	if errors == nil {
		errors = []string{}
	}

	result := &model.ProxyDetectionResult{
		HeaderIP:      headerIPPtr,
		DomesticIP:    domesticIPPtr,
		ForeignIP:     foreignIPPtr,
		IsUsingProxy:  isUsingProxy,
		ProxyType:     proxyType,
		Confidence:    confidence,
		Errors:        errors,
		DetectionTime: detectionTime,
	}

	// Cache result
	if headerIP != "" && s.cache != nil {
		s.cache.Set(ctx, headerIP, result)
	}

	return result, nil
}

func fetchDomesticIP(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://myip.ipip.net/", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := httpclient.Short.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	matches := ipipRegex.FindSubmatch(body)
	if len(matches) < 2 {
		return "", fmt.Errorf("无法解析IPIP.NET响应")
	}

	return string(matches[1]), nil
}

func fetchForeignIP(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://ipinfo.io/ip", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := httpclient.Short.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	ip := strings.TrimSpace(string(body))
	if iputil.DetectIPVersion(ip) == "invalid" {
		return "", fmt.Errorf("无效的IP响应: %s", ip)
	}

	return ip, nil
}

// analyzeProxyType compares three IP sources to determine proxy usage.
// Replicates the TypeScript analyzeProxyType function from lib/ip-detection.ts.
func analyzeProxyType(headerIP, domesticIP, foreignIP string) (proxyType string, confidence float64) {
	ips := []string{}
	if headerIP != "" {
		ips = append(ips, headerIP)
	}
	if domesticIP != "" {
		ips = append(ips, domesticIP)
	}
	if foreignIP != "" {
		ips = append(ips, foreignIP)
	}

	if len(ips) < 2 {
		return "unknown", 0.3
	}

	// All IPs identical — direct connection
	allSame := true
	for _, ip := range ips[1:] {
		if ip != ips[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return "direct", 0.9
	}

	// Three-source analysis
	if headerIP != "" && domesticIP != "" && foreignIP != "" {
		if headerIP == domesticIP && headerIP != foreignIP {
			return "foreign", 0.8
		}
		if headerIP == foreignIP && headerIP != domesticIP {
			return "domestic", 0.8
		}
		if headerIP != domesticIP && headerIP != foreignIP && domesticIP != foreignIP {
			return "mixed", 0.7
		}
	}

	return "unknown", 0.5
}
