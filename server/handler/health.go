package handler

import (
	"github.com/gin-gonic/gin"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Health(c *gin.Context) {
	Success(c, gin.H{"status": "ok"})
}
