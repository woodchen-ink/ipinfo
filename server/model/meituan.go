package model

// MeituanData holds enriched Chinese location data from Meituan APIs.
type MeituanData struct {
	AreaName     string `json:"areaName,omitempty"`
	Detail       string `json:"detail,omitempty"`
	CityPinyin   string `json:"cityPinyin,omitempty"`
	OpenCityName string `json:"openCityName,omitempty"`
	IsForeign    bool   `json:"isForeign,omitempty"`
	DpCityId     int    `json:"dpCityId,omitempty"`
	Area         int    `json:"area,omitempty"`
	ParentArea   int    `json:"parentArea,omitempty"`
	Fromwhere    string `json:"fromwhere,omitempty"`
	Adcode       string `json:"adcode,omitempty"`
}

// MeituanIPResponse is the raw response from Meituan IP location API.
type MeituanIPResponse struct {
	Data struct {
		Lng       float64 `json:"lng"`
		Fromwhere string  `json:"fromwhere"`
		IP        string  `json:"ip"`
		Rgeo      struct {
			Country  string `json:"country"`
			Province string `json:"province"`
			Adcode   string `json:"adcode"`
			City     string `json:"city"`
			District string `json:"district"`
		} `json:"rgeo"`
		Lat float64 `json:"lat"`
	} `json:"data"`
}

// MeituanLocationResponse is the raw response from Meituan location detail API.
type MeituanLocationResponse struct {
	Data struct {
		Area         int     `json:"area"`
		Country      string  `json:"country"`
		Lng          float64 `json:"lng"`
		CityPinyin   string  `json:"cityPinyin"`
		City         string  `json:"city"`
		IsForeign    bool    `json:"isForeign"`
		OriginCityID int     `json:"originCityID"`
		DpCityId     int     `json:"dpCityId"`
		OpenCityName string  `json:"openCityName"`
		IsOpen       bool    `json:"isOpen"`
		Province     string  `json:"province"`
		AreaName     string  `json:"areaName"`
		ParentArea   int     `json:"parentArea"`
		District     string  `json:"district"`
		ID           int     `json:"id"`
		Detail       string  `json:"detail"`
		Lat          float64 `json:"lat"`
	} `json:"data"`
}
