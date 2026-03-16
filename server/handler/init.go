package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/service"
)

type InitHandler struct {
	downloader *service.DatabaseDownloader
	apiKey     string
}

func NewInitHandler(downloader *service.DatabaseDownloader, apiKey string) *InitHandler {
	return &InitHandler{downloader: downloader, apiKey: apiKey}
}

// GetStatus handles GET /api/init — returns database status.
func (h *InitHandler) GetStatus(c *gin.Context) {
	statuses := h.downloader.CheckDatabases()
	isReady := true
	for _, s := range statuses {
		if !s.Exists || !s.IsValid {
			isReady = false
			break
		}
	}

	Success(c, model.InitStatusResponse{
		IsReady:       isReady,
		IsChecking:    false,
		IsDownloading: h.downloader.IsDownloading(),
		Databases:     statuses,
	})
}

// Initialize handles POST /api/init — triggers database download.
func (h *InitHandler) Initialize(c *gin.Context) {
	// Authenticate
	if h.apiKey == "" {
		Error(c, http.StatusInternalServerError, "INIT_API_KEY未配置")
		return
	}

	token := ""
	auth := c.GetHeader("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		token = strings.TrimPrefix(auth, "Bearer ")
	}
	if token == "" {
		token = c.GetHeader("X-Api-Key")
	}

	if token != h.apiKey {
		Error(c, http.StatusUnauthorized, "认证失败")
		return
	}

	// Start download
	go func() {
		h.downloader.EnsureDatabasesAvailable()
	}()

	statuses := h.downloader.CheckDatabases()
	isReady := true
	for _, s := range statuses {
		if !s.Exists || !s.IsValid {
			isReady = false
			break
		}
	}

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Msg:  "数据库初始化已开始",
		Data: model.InitStatusResponse{
			IsReady:       isReady,
			IsChecking:    false,
			IsDownloading: true,
			Databases:     statuses,
		},
	})
}
