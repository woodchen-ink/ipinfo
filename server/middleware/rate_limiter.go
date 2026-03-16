package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/cache"
)

type RateLimitConfig struct {
	MaxRequests int64
	Window      time.Duration
}

var endpointLimits = map[string]RateLimitConfig{
	"/api/query":           {MaxRequests: 60, Window: time.Minute},
	"/api/bgp":             {MaxRequests: 20, Window: time.Minute},
	"/api/proxy-detection": {MaxRequests: 10, Window: time.Minute},
}

var defaultLimit = RateLimitConfig{MaxRequests: 100, Window: time.Minute}

// RateLimiter returns a middleware that enforces per-IP rate limits using Redis.
func RateLimiter(limiter *cache.RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := GetClientIP(c)
		if clientIP == "" {
			clientIP = c.ClientIP()
		}

		// Find the matching rate limit config
		cfg := defaultLimit
		path := c.Request.URL.Path
		for prefix, limit := range endpointLimits {
			if strings.HasPrefix(path, prefix) {
				cfg = limit
				break
			}
		}

		result, err := limiter.Check(c.Request.Context(), clientIP, path, cfg.MaxRequests, cfg.Window)
		if err != nil {
			// If Redis is down, allow the request through
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", result.Total))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", result.Remaining))
		c.Header("X-RateLimit-Reset", result.ResetAt.Format(time.RFC3339))

		if !result.Allowed {
			retryAfter := int(time.Until(result.ResetAt).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":       429,
				"msg":        "请求过于频繁，请稍后重试",
				"data":       nil,
				"retryAfter": retryAfter,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
