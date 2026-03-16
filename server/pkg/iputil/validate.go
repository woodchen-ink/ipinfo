package iputil

import "net"

// IsValidIP checks if the given string is a valid IPv4 or IPv6 address.
func IsValidIP(ip string) bool {
	return net.ParseIP(ip) != nil
}

// DetectIPVersion returns "IPv4", "IPv6", or "invalid".
func DetectIPVersion(ip string) string {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return "invalid"
	}
	if parsed.To4() != nil {
		return "IPv4"
	}
	return "IPv6"
}
