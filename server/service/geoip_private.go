package service

import (
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
)

// CreatePrivateIPInfo returns a predefined IPInfo for private/reserved IPs.
func CreatePrivateIPInfo(ip string) *model.IPInfo {
	ipVersion := iputil.DetectIPVersion(ip)

	return &model.IPInfo{
		IP:          ip,
		Country:     "私有网络",
		CountryCode: "PRIVATE",
		City:        "本地网络",
		Location: model.Location{
			Latitude:       0,
			Longitude:      0,
			AccuracyRadius: 0,
		},
		Accuracy:  "high",
		Source:    "MaxMind",
		IPVersion: ipVersion,
		ISP:       "私有网络",
		Timezone:  "UTC",
	}
}
