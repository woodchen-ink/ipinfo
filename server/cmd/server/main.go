package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/config"
	"github.com/woodchen-ink/ipinfo-server/initapp"
	"go.uber.org/zap"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "配置加载失败: %v\n", err)
		os.Exit(1)
	}

	// Setup logger
	var logger *zap.Logger
	if cfg.GinMode == "release" {
		logger, _ = zap.NewProduction()
	} else {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize application
	app, err := initapp.Initialize(cfg, logger)
	if err != nil {
		logger.Fatal("应用初始化失败", zap.Error(err))
	}

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: app.Engine,
	}

	// Graceful shutdown
	go func() {
		logger.Info("服务启动", zap.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("服务启动失败", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("收到关闭信号，正在优雅关闭...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Close GeoIP reader
	if app.Reader != nil {
		app.Reader.Close()
		logger.Info("GeoIP数据库已关闭")
	}

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("服务关闭失败", zap.Error(err))
	}

	logger.Info("服务已关闭")
}
