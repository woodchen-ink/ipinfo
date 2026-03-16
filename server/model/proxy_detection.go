package model

type ProxyDetectionResult struct {
	HeaderIP      *string  `json:"headerIP"`
	DomesticIP    *string  `json:"domesticIP"`
	ForeignIP     *string  `json:"foreignIP"`
	IsUsingProxy  bool     `json:"isUsingProxy"`
	ProxyType     string   `json:"proxyType"`
	Confidence    float64  `json:"confidence"`
	Errors        []string `json:"errors"`
	DetectionTime int64    `json:"detectionTime"`
}
