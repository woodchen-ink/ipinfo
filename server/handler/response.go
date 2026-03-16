package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response is the unified API response structure.
type Response struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
	Msg  string      `json:"msg"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{Code: 200, Data: data, Msg: "success"})
}

func SuccessWithCache(c *gin.Context, data interface{}, cacheControl string) {
	c.Header("Cache-Control", cacheControl)
	Success(c, data)
}

func Error(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, Response{Code: httpCode, Data: nil, Msg: msg})
}
