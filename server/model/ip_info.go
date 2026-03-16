package model

// IPInfo is the core response structure for IP geolocation queries.
// JSON field names MUST match the frontend's IPInfo interface exactly.
type IPInfo struct {
	IP                string              `json:"ip"`
	Country           string              `json:"country"`
	CountryCode       string              `json:"countryCode"`
	Province          string              `json:"province,omitempty"`
	ProvinceCode      string              `json:"provinceCode,omitempty"`
	City              string              `json:"city,omitempty"`
	CityCode          string              `json:"cityCode,omitempty"`
	District          string              `json:"district,omitempty"`
	DistrictCode      string              `json:"districtCode,omitempty"`
	ISP               string              `json:"isp,omitempty"`
	Net               string              `json:"net,omitempty"`
	Regions           []string            `json:"regions,omitempty"`
	RegionsShort      []string            `json:"regions_short,omitempty"`
	Type              string              `json:"type,omitempty"`
	AS                *ASInfo             `json:"as,omitempty"`
	Addr              string              `json:"addr,omitempty"`
	RegisteredCountry *RegisteredCountry  `json:"registered_country,omitempty"`
	Location          Location            `json:"location"`
	Timezone          string              `json:"timezone,omitempty"`
	Postal            string              `json:"postal,omitempty"`
	Accuracy          string              `json:"accuracy"`
	Source            string              `json:"source"`
	IPVersion         string              `json:"ipVersion"`
	ProxyDetection    *ProxyDetectionResult `json:"proxyDetection,omitempty"`
	Meituan           *MeituanData        `json:"meituan,omitempty"`
	Ncgy              *NcgyInfo           `json:"ncgy,omitempty"`
}

type ASInfo struct {
	Number int    `json:"number,omitempty"`
	Name   string `json:"name,omitempty"`
	Info   string `json:"info,omitempty"`
}

type RegisteredCountry struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type Location struct {
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
	AccuracyRadius int     `json:"accuracy_radius,omitempty"`
}
