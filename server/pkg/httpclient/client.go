package httpclient

import (
	"net/http"
	"time"
)

// Default is a shared HTTP client with sensible defaults for external API calls.
var Default = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	},
}

// Short returns an HTTP client with a shorter timeout, used for proxy detection.
var Short = &http.Client{
	Timeout: 5 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     60 * time.Second,
	},
}
