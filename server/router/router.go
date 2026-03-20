package router

import (
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
) (*gin.Engine, error) {
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
	api.Use(middleware.DefaultCacheControl(cacheControlAPI))
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
		if err := setupStaticSite(r, webDir); err != nil {
			return nil, err
		}
	}

	return r, nil
}
