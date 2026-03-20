package initapp

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/cache"
	"github.com/woodchen-ink/ipinfo-server/config"
	"github.com/woodchen-ink/ipinfo-server/handler"
	"github.com/woodchen-ink/ipinfo-server/router"
	"github.com/woodchen-ink/ipinfo-server/service"
	"go.uber.org/zap"
)

// AppContext holds all initialized components.
type AppContext struct {
	Engine *gin.Engine
	Logger *zap.Logger
	Reader *service.GeoIPReader
}

// Initialize wires all components together and returns the Gin engine.
func Initialize(cfg *config.Config, logger *zap.Logger) (*AppContext, error) {
	// 1. Redis
	rdb, err := cache.NewRedisClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		return nil, fmt.Errorf("Redis初始化失败: %w", err)
	}
	logger.Info("Redis连接成功", zap.String("addr", cfg.RedisAddr))

	// 2. Database downloader
	downloader := service.NewDatabaseDownloader(cfg.DataDir, logger)

	// 3. Ensure MMDB databases available
	if err := downloader.EnsureDatabasesAvailable(); err != nil {
		logger.Warn("部分数据库缺失，将使用可用数据库继续运行", zap.Error(err))
	}

	// 4. GeoIP Reader
	geoipReader, err := service.NewGeoIPReader(cfg.DataDir, logger)
	if err != nil {
		return nil, fmt.Errorf("GeoIP Reader初始化失败: %w", err)
	}

	// 5. Caches
	ipCache := cache.NewIPCache(rdb, cfg.DefaultCacheTTL)
	bgpCache := cache.NewBGPCache(rdb, cfg.BGPCacheTTL)
	meituanCache := cache.NewMeituanCache(rdb, cfg.MeituanCacheTTL)
	proxyCache := cache.NewProxyCache(rdb, cfg.ProxyCacheTTL)
	ncgyCache := cache.NewGenericCache(rdb, "ipinfo:ncgy:", cfg.DefaultCacheTTL)
	geocodeCache := cache.NewGeocodeCache(rdb, cfg.GeocodeCacheTTL)
	rateLimiter := cache.NewRateLimiter(rdb)

	// 6. Services
	geocodeSvc := service.NewGeocodeService(cfg.NominatimBaseURL, geocodeCache, logger)
	maxmindFallback := service.NewMaxMindFallbackService(cfg.MaxMindAccountID, cfg.MaxMindLicenseKey)
	ipinfoFallback := service.NewIPInfoFallbackService(cfg.IPInfoToken)

	geoipSvc := service.NewGeoIPService(geoipReader, ipCache, geocodeSvc, maxmindFallback, ipinfoFallback, logger)
	bgpSvc := service.NewBGPService(bgpCache, logger)
	proxySvc := service.NewProxyDetectionService(proxyCache, logger)
	ncgySvc := service.NewNcgyService(ncgyCache, logger)
	meituanSvc := service.NewMeituanService(meituanCache, logger)

	// 7. Handlers
	queryHandler := handler.NewQueryHandler(geoipSvc, ncgySvc)
	bgpHandler := handler.NewBGPHandler(bgpSvc)
	proxyHandler := handler.NewProxyDetectionHandler(proxySvc)
	meituanHandler := handler.NewMeituanHandler(meituanSvc)
	initHandler := handler.NewInitHandler(downloader, cfg.InitAPIKey)
	healthHandler := handler.NewHealthHandler()

	// 8. Router
	engine, err := router.SetupRouter(
		queryHandler,
		bgpHandler,
		proxyHandler,
		meituanHandler,
		initHandler,
		healthHandler,
		rateLimiter,
		logger,
		cfg.WebDir,
	)
	if err != nil {
		return nil, fmt.Errorf("Router初始化失败: %w", err)
	}

	if cfg.WebDir == "" {
		logger.Warn("前端静态目录未配置，当前只提供 API 路由")
	} else {
		logger.Info("前端静态目录已加载", zap.String("web_dir", cfg.WebDir))
	}

	logger.Info("应用初始化完成")

	return &AppContext{
		Engine: engine,
		Logger: logger,
		Reader: geoipReader,
	}, nil
}
