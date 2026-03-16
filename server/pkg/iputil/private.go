package iputil

import (
	"net"
	"strings"
)

// PrivateIPCheckResult holds the detailed result of a private IP check.
type PrivateIPCheckResult struct {
	IsPrivate   bool   `json:"isPrivate"`
	Type        string `json:"type"`
	Message     string `json:"message"`
	Description string `json:"description"`
}

// CheckPrivateIP checks whether an IP is private/reserved and returns details.
func CheckPrivateIP(ip string) PrivateIPCheckResult {
	version := DetectIPVersion(ip)
	if version == "invalid" {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "invalid",
			Message:     "IP地址格式无效",
			Description: "请输入有效的IPv4或IPv6地址格式。",
		}
	}
	if version == "IPv4" {
		return checkPrivateIPv4(ip)
	}
	return checkPrivateIPv6(ip)
}

// IsPrivateIP returns true if the IP is a private/internal address.
func IsPrivateIP(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}

	// Check using Go's standard library private ranges
	if parsed.IsLoopback() || parsed.IsLinkLocalUnicast() || parsed.IsLinkLocalMulticast() || parsed.IsMulticast() || parsed.IsUnspecified() {
		return true
	}

	// RFC1918
	privateRanges := []struct {
		network string
	}{
		{"10.0.0.0/8"},
		{"172.16.0.0/12"},
		{"192.168.0.0/16"},
		{"100.64.0.0/10"}, // CGNAT
		{"fc00::/7"},      // IPv6 ULA
	}

	for _, r := range privateRanges {
		_, cidr, err := net.ParseCIDR(r.network)
		if err != nil {
			continue
		}
		if cidr.Contains(parsed) {
			return true
		}
	}

	return false
}

func checkPrivateIPv4(ip string) PrivateIPCheckResult {
	parsed := net.ParseIP(ip).To4()
	if parsed == nil {
		return PrivateIPCheckResult{IsPrivate: false, Type: "public"}
	}

	a, b, c, d := parsed[0], parsed[1], parsed[2], parsed[3]

	// RFC1918 private
	if a == 10 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "private_rfc1918",
			Message:     "这是一个私有IP地址（RFC1918）",
			Description: "10.0.0.0/8 网段是为私有网络保留的地址，无法查询其公网地理位置信息。这类地址通常用于企业内网、家庭网络等私有环境。",
		}
	}
	if a == 172 && b >= 16 && b <= 31 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "private_rfc1918",
			Message:     "这是一个私有IP地址（RFC1918）",
			Description: "172.16.0.0/12 网段是为私有网络保留的地址，无法查询其公网地理位置信息。这类地址通常用于企业内网等私有环境。",
		}
	}
	if a == 192 && b == 168 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "private_rfc1918",
			Message:     "这是一个私有IP地址（RFC1918）",
			Description: "192.168.0.0/16 网段是为私有网络保留的地址，无法查询其公网地理位置信息。这类地址最常用于家庭路由器和小型办公网络。",
		}
	}

	// Loopback
	if a == 127 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "loopback",
			Message:     "这是一个回环地址",
			Description: "127.0.0.0/8 网段是回环地址，指向本机自身，无法查询地理位置信息。最常见的是 127.0.0.1（localhost）。",
		}
	}

	// Link-local (APIPA)
	if a == 169 && b == 254 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "link_local",
			Message:     "这是一个链路本地地址（APIPA）",
			Description: "169.254.0.0/16 网段是自动私有IP地址（APIPA），当设备无法获取DHCP地址时自动分配，无法查询地理位置信息。",
		}
	}

	// CGNAT (RFC6598)
	if a == 100 && b >= 64 && b <= 127 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "shared_cgnat",
			Message:     "这是一个共享地址空间（CGNAT）",
			Description: "100.64.0.0/10 网段是运营商级NAT（CGNAT）使用的共享地址空间，无法查询准确的地理位置信息。",
		}
	}

	// Multicast
	if a >= 224 && a <= 239 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "multicast",
			Message:     "这是一个多播地址",
			Description: "224.0.0.0/4 网段是多播地址，用于一对多的网络通信，无法查询地理位置信息。",
		}
	}

	// Reserved (except broadcast)
	if a >= 240 && !(a == 255 && b == 255 && c == 255 && d == 255) {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "reserved",
			Message:     "这是一个保留地址",
			Description: "240.0.0.0/4 网段是为未来使用保留的地址，无法查询地理位置信息。",
		}
	}

	// Broadcast
	if a == 255 && b == 255 && c == 255 && d == 255 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "broadcast",
			Message:     "这是广播地址",
			Description: "255.255.255.255 是有限广播地址，用于向本地网络中的所有设备发送数据，无法查询地理位置信息。",
		}
	}

	// 0.0.0.0
	if a == 0 && b == 0 && c == 0 && d == 0 {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "unspecified",
			Message:     "这是未指定地址",
			Description: "0.0.0.0 是未指定地址，通常表示'本机上的任意地址'，无法查询地理位置信息。",
		}
	}

	return PrivateIPCheckResult{IsPrivate: false, Type: "public"}
}

func checkPrivateIPv6(ip string) PrivateIPCheckResult {
	lower := strings.ToLower(strings.TrimSpace(ip))

	if lower == "::1" {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "loopback",
			Message:     "这是IPv6回环地址",
			Description: "::1 是IPv6的回环地址，等同于IPv4的127.0.0.1，指向本机自身，无法查询地理位置信息。",
		}
	}

	if lower == "::" || lower == "0:0:0:0:0:0:0:0" {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "unspecified",
			Message:     "这是IPv6未指定地址",
			Description: ":: 是IPv6的未指定地址，等同于IPv4的0.0.0.0，无法查询地理位置信息。",
		}
	}

	if strings.HasPrefix(lower, "fe80:") {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "link_local",
			Message:     "这是IPv6链路本地地址",
			Description: "fe80::/10 网段是IPv6链路本地地址，仅在本地网络链路内有效，无法查询地理位置信息。",
		}
	}

	if strings.HasPrefix(lower, "fc") || strings.HasPrefix(lower, "fd") {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "unique_local",
			Message:     "这是IPv6唯一本地地址（ULA）",
			Description: "fc00::/7 网段是IPv6唯一本地地址，类似于IPv4的私有地址，用于私有网络，无法查询地理位置信息。",
		}
	}

	if strings.HasPrefix(lower, "ff") {
		return PrivateIPCheckResult{
			IsPrivate:   true,
			Type:        "multicast",
			Message:     "这是IPv6多播地址",
			Description: "ff00::/8 网段是IPv6多播地址，用于一对多的网络通信，无法查询地理位置信息。",
		}
	}

	return PrivateIPCheckResult{IsPrivate: false, Type: "public"}
}
