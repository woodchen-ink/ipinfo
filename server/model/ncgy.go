package model

// ncgyAPIResponse is the raw JSON structure from ip.nc.gy/json API.
type NcgyAPIResponse struct {
	IP      string          `json:"ip"`
	City    *ncgyNames      `json:"city"`
	Country *ncgyCountry    `json:"country"`
	ASN     *ncgyASN        `json:"asn"`
	Proxy   *ncgyProxyRaw   `json:"proxy"`
	Location *ncgyLocation  `json:"location"`
	Postal   *ncgyPostal    `json:"postal"`
	Subdivisions []ncgySubdivision `json:"subdivisions"`
}

type ncgyNames struct {
	Names map[string]string `json:"names"`
}

type ncgyCountry struct {
	ISOCode string            `json:"iso_code"`
	Names   map[string]string `json:"names"`
}

type ncgyASN struct {
	Number int    `json:"autonomous_system_number"`
	Org    string `json:"autonomous_system_organization"`
	Domain string `json:"as_domain"`
}

type ncgyProxyRaw struct {
	IsProxy     bool `json:"is_proxy"`
	IsVPN       bool `json:"is_vpn"`
	IsTor       bool `json:"is_tor"`
	IsHosting   bool `json:"is_hosting"`
	IsCDN       bool `json:"is_cdn"`
	IsSchool    bool `json:"is_school"`
	IsAnonymous bool `json:"is_anonymous"`
}

type ncgyLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timezone  string  `json:"time_zone"`
}

type ncgyPostal struct {
	Code string `json:"code"`
}

type ncgySubdivision struct {
	ISOCode string            `json:"iso_code"`
	Names   map[string]string `json:"names"`
}

// NcgyInfo is the simplified model stored and returned to the frontend.
type NcgyInfo struct {
	City        string     `json:"city,omitempty"`
	Country     string     `json:"country,omitempty"`
	CountryCode string     `json:"countryCode,omitempty"`
	Province    string     `json:"province,omitempty"`
	ASN         int        `json:"asn,omitempty"`
	ASOrg       string     `json:"asOrg,omitempty"`
	Proxy       *NcgyProxy `json:"proxy,omitempty"`
}

// NcgyProxy holds proxy/VPN/Tor classification from ip.nc.gy.
type NcgyProxy struct {
	IsProxy     bool `json:"isProxy"`
	IsVPN       bool `json:"isVPN"`
	IsTor       bool `json:"isTor"`
	IsHosting   bool `json:"isHosting"`
	IsCDN       bool `json:"isCDN"`
	IsSchool    bool `json:"isSchool"`
	IsAnonymous bool `json:"isAnonymous"`
}
