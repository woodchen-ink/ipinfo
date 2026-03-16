package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/service"
)

type BGPHandler struct {
	bgpSvc *service.BGPService
}

func NewBGPHandler(bgpSvc *service.BGPService) *BGPHandler {
	return &BGPHandler{bgpSvc: bgpSvc}
}

// GetPeers handles GET /api/bgp/:asn
func (h *BGPHandler) GetPeers(c *gin.Context) {
	asnStr := c.Param("asn")
	asn, err := strconv.Atoi(asnStr)
	if err != nil || asn < 1 || asn > 4294967295 {
		Error(c, http.StatusBadRequest, "无效的ASN格式，ASN应为1到4294967295之间的整数")
		return
	}

	result, err := h.bgpSvc.QueryPeers(c.Request.Context(), asn)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "未找到"):
			Error(c, http.StatusNotFound, errMsg)
		case strings.Contains(errMsg, "频繁"):
			Error(c, http.StatusTooManyRequests, errMsg)
		case strings.Contains(errMsg, "不可用"):
			Error(c, http.StatusServiceUnavailable, errMsg)
		case strings.Contains(errMsg, "超时"):
			Error(c, http.StatusRequestTimeout, errMsg)
		default:
			Error(c, http.StatusInternalServerError, "BGP查询失败: "+errMsg)
		}
		return
	}

	SuccessWithCache(c, result, "public, max-age=1800, s-maxage=1800")
}
