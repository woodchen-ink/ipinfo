package router

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/handler"
	"github.com/woodchen-ink/ipinfo-server/middleware"
	"go.uber.org/zap"
)

func SetupRouter(
	queryHandler *handler.QueryHandler,
	bgpHandler *handler.BGPHandler,
	proxyHandler *handler.ProxyDetectionHandler,
	meituanHandler *handler.MeituanHandler,
	initHandler *handler.InitHandler,
	healthHandler *handler.HealthHandler,
	rateLimiter *cache.RateLimiter,
	logger *zap.Logger,
	webDir string,
) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORS())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.IPDetect())
	r.Use(middleware.RateLimiter(rateLimiter))

	// API routes
	api := r.Group("/api")
	{
		// IP Query
		api.GET("/query", queryHandler.GetClientIP)
		api.POST("/query", queryHandler.QueryIP)

		// BGP
		api.GET("/bgp/:asn", bgpHandler.GetPeers)

		// Proxy Detection
		api.GET("/proxy-detection", proxyHandler.DetectProxy)
		api.POST("/proxy-detection", proxyHandler.DetectProxyPost)

		// Meituan
		api.POST("/meituan", meituanHandler.QueryIP)

		// Database Init
		api.GET("/init", initHandler.GetStatus)
		api.POST("/init", initHandler.Initialize)
	}

	// Health check
	r.GET("/health", healthHandler.Health)

	// SPA static file serving
	if webDir != "" {
		setupSPA(r, webDir)
	}

	return r
}

// setupSPA serves frontend static files with SPA fallback.
// Requests for existing files (JS, CSS, images) are served directly.
// All other requests fall back to index.html for client-side routing.
func setupSPA(r *gin.Engine, webDir string) {
	fs := http.Dir(webDir)

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Try to serve the static file directly
		fullPath := filepath.Join(webDir, filepath.Clean(path))
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			http.FileServer(fs).ServeHTTP(c.Writer, c.Request)
			return
		}

		// Check if there's an .html file (for /docs -> /docs.html)
		htmlPath := fullPath + ".html"
		if info, err := os.Stat(htmlPath); err == nil && !info.IsDir() {
			http.ServeFile(c.Writer, c.Request, htmlPath)
			return
		}

		// Check for directory with index.html (for /docs/ -> /docs/index.html)
		indexPath := filepath.Join(fullPath, "index.html")
		if info, err := os.Stat(indexPath); err == nil && !info.IsDir() {
			http.ServeFile(c.Writer, c.Request, indexPath)
			return
		}

		// SPA fallback: serve root index.html
		indexFile := filepath.Join(webDir, "index.html")
		if _, err := os.Stat(indexFile); err == nil {
			http.ServeFile(c.Writer, c.Request, indexFile)
			return
		}

		// No frontend files found
		c.String(http.StatusNotFound, "404 page not found")
	})
}
