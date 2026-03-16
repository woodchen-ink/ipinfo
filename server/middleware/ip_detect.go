package middleware

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
)

// clientIPHeaders is the CDN header priority list, matching the TypeScript implementation.
var clientIPHeaders = []string{
	"Cf-Connecting-Ip",        // Cloudflare
	"Eo-Connecting-Ip",        // Tencent EdgeOne
	"X-Real-Ip",               // Nginx
	"True-Client-Ip",          // Akamai / Cloudflare Enterprise
	"X-Client-Ip",             // Apache
	"X-Vercel-Forwarded-For",  // Vercel
	"X-Forwarded-For",         // Standard (may contain multiple IPs)
	"X-Forwarded",
	"Forwarded-For",
	"Forwarded",
	"X-Cluster-Client-Ip",     // Cluster
	"X-Original-Forwarded-For",
}

// IPDetect extracts the client's real IP from CDN/proxy headers and stores it in the context.
func IPDetect() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := detectClientIP(c)
		if clientIP != "" {
			c.Set("clientIP", clientIP)
		}
		c.Next()
	}
}

// GetClientIP retrieves the detected client IP from the gin context.
func GetClientIP(c *gin.Context) string {
	if ip, exists := c.Get("clientIP"); exists {
		return ip.(string)
	}
	return ""
}

func detectClientIP(c *gin.Context) string {
	for _, header := range clientIPHeaders {
		value := c.GetHeader(header)
		if value == "" {
			continue
		}

		// For headers that may contain multiple IPs, extract the first public IP.
		extracted := extractPublicIPFromForwarded(value)
		if extracted != "" && iputil.IsValidIP(extracted) {
			return extracted
		}
	}

	// Fallback to Gin's ClientIP (uses RemoteAddr)
	ip := c.ClientIP()
	if ip != "" && iputil.IsValidIP(ip) {
		return ip
	}

	return ""
}

// extractPublicIPFromForwarded parses a comma-separated header value and returns
// the first valid public IP. If none found, returns the first valid IP.
func extractPublicIPFromForwarded(headerValue string) string {
	parts := strings.Split(headerValue, ",")

	// First pass: find the first valid public IP
	for _, part := range parts {
		ip := strings.TrimSpace(part)
		// Remove port if present (e.g., "1.2.3.4:8080")
		if host, _, err := net.SplitHostPort(ip); err == nil {
			ip = host
		}
		if iputil.IsValidIP(ip) && !iputil.IsPrivateIP(ip) {
			return ip
		}
	}

	// Second pass: return the first valid IP (even if private)
	for _, part := range parts {
		ip := strings.TrimSpace(part)
		if host, _, err := net.SplitHostPort(ip); err == nil {
			ip = host
		}
		if iputil.IsValidIP(ip) {
			return ip
		}
	}

	return ""
}
