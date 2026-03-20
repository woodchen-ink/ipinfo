package middleware

import "github.com/gin-gonic/gin"

// DefaultCacheControl applies a fallback Cache-Control header when handlers do not set one.
func DefaultCacheControl(value string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Writer.Header().Get("Cache-Control") == "" {
			c.Header("Cache-Control", value)
		}
		c.Next()
	}
}
