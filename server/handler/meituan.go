package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
	"github.com/woodchen-ink/ipinfo-server/service"
)

type MeituanHandler struct {
	meituanSvc *service.MeituanService
}

func NewMeituanHandler(meituanSvc *service.MeituanService) *MeituanHandler {
	return &MeituanHandler{meituanSvc: meituanSvc}
}

type meituanRequest struct {
	IP string `json:"ip" binding:"required"`
}

// QueryIP handles POST /api/meituan
func (h *MeituanHandler) QueryIP(c *gin.Context) {
	var req meituanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "请提供有效的IP地址")
		return
	}

	if !iputil.IsValidIP(req.IP) {
		Error(c, http.StatusBadRequest, "无效的IP地址格式")
		return
	}

	if !h.meituanSvc.IsSuitableForMeituan(req.IP) {
		Error(c, http.StatusBadRequest, "该IP不适合使用美团API查询")
		return
	}

	result, err := h.meituanSvc.EnhancedIPQuery(c.Request.Context(), req.IP)
	if err != nil {
		Error(c, http.StatusServiceUnavailable, "美团查询失败: "+err.Error())
		return
	}

	SuccessWithCache(c, result, "public, max-age=600, s-maxage=600")
}
