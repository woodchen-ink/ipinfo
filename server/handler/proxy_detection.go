package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/middleware"
	"github.com/woodchen-ink/ipinfo-server/service"
)

type ProxyDetectionHandler struct {
	proxySvc *service.ProxyDetectionService
}

func NewProxyDetectionHandler(proxySvc *service.ProxyDetectionService) *ProxyDetectionHandler {
	return &ProxyDetectionHandler{proxySvc: proxySvc}
}

// DetectProxy handles GET /api/proxy-detection
func (h *ProxyDetectionHandler) DetectProxy(c *gin.Context) {
	headerIP := middleware.GetClientIP(c)

	result, err := h.proxySvc.Detect(c.Request.Context(), headerIP)
	if err != nil {
		Error(c, http.StatusInternalServerError, "代理检测失败: "+err.Error())
		return
	}

	SuccessWithCache(c, result, "public, max-age=60, s-maxage=60")
}

type proxyDetectionRequest struct {
	EnableProxyDetection bool `json:"enableProxyDetection"`
}

// DetectProxyPost handles POST /api/proxy-detection
func (h *ProxyDetectionHandler) DetectProxyPost(c *gin.Context) {
	var req proxyDetectionRequest
	if err := c.ShouldBindJSON(&req); err != nil || !req.EnableProxyDetection {
		Error(c, http.StatusBadRequest, "请设置 enableProxyDetection 为 true")
		return
	}

	headerIP := middleware.GetClientIP(c)

	result, err := h.proxySvc.Detect(c.Request.Context(), headerIP)
	if err != nil {
		Error(c, http.StatusInternalServerError, "代理检测失败: "+err.Error())
		return
	}

	SuccessWithCache(c, result, "public, max-age=60, s-maxage=60")
}
