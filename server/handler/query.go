package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/middleware"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
	"github.com/woodchen-ink/ipinfo-server/service"
)

type QueryHandler struct {
	geoipSvc *service.GeoIPService
	ncgySvc  *service.NcgyService
}

func NewQueryHandler(geoipSvc *service.GeoIPService, ncgySvc *service.NcgyService) *QueryHandler {
	return &QueryHandler{geoipSvc: geoipSvc, ncgySvc: ncgySvc}
}

// enrichWithNcgy supplements the query result with ip.nc.gy data.
func (h *QueryHandler) enrichWithNcgy(parentCtx context.Context, result *model.IPInfo) {
	if h.ncgySvc == nil {
		return
	}
	ncgyCtx, cancel := context.WithTimeout(parentCtx, 3*time.Second)
	defer cancel()
	if ncgyResult, err := h.ncgySvc.QueryIP(ncgyCtx, result.IP); err == nil {
		result.Ncgy = ncgyResult
	}
}

type queryRequest struct {
	IP string `json:"ip"`
}

// GetClientIP handles GET /api/query — detects client IP and returns its geolocation.
func (h *QueryHandler) GetClientIP(c *gin.Context) {
	clientIP := middleware.GetClientIP(c)
	if clientIP == "" {
		Error(c, http.StatusBadRequest, "无法获取客户端IP地址")
		return
	}

	result, err := h.geoipSvc.QueryIPInfo(c.Request.Context(), clientIP)
	if err != nil {
		Error(c, http.StatusInternalServerError, "查询失败: "+err.Error())
		return
	}

	h.enrichWithNcgy(c.Request.Context(), result)
	SuccessWithCache(c, result, "public, max-age=300, s-maxage=300")
}

// QueryIP handles POST /api/query — queries a specific IP address.
func (h *QueryHandler) QueryIP(c *gin.Context) {
	var req queryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// If body is empty or invalid, fall back to client IP
		clientIP := middleware.GetClientIP(c)
		if clientIP == "" {
			Error(c, http.StatusBadRequest, "无法获取客户端IP地址")
			return
		}
		req.IP = clientIP
	}

	// If no IP provided, use client IP
	if req.IP == "" {
		clientIP := middleware.GetClientIP(c)
		if clientIP == "" {
			Error(c, http.StatusBadRequest, "无法获取客户端IP地址")
			return
		}
		req.IP = clientIP
	}

	// Validate IP
	if !iputil.IsValidIP(req.IP) {
		Error(c, http.StatusBadRequest, "无效的IP地址格式")
		return
	}

	result, err := h.geoipSvc.QueryIPInfo(c.Request.Context(), req.IP)
	if err != nil {
		Error(c, http.StatusInternalServerError, "查询失败: "+err.Error())
		return
	}

	h.enrichWithNcgy(c.Request.Context(), result)
	SuccessWithCache(c, result, "public, max-age=300, s-maxage=300")
}
