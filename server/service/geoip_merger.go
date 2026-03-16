package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/oschwald/geoip2-golang"
	"github.com/woodchen-ink/ipinfo-server/model"
	"github.com/woodchen-ink/ipinfo-server/pkg/iputil"
)

// DataMerger merges results from multiple data sources into a single IPInfo.
type DataMerger struct {
	geocodeSvc *GeocodeService
}

func NewDataMerger(geocodeSvc *GeocodeService) *DataMerger {
	return &DataMerger{geocodeSvc: geocodeSvc}
}

// Merge combines MaxMind and GeoCN data into a single IPInfo.
func (m *DataMerger) Merge(ctx context.Context, ip string, results []RawQueryResult) (*model.IPInfo, error) {
	if len(results) == 0 {
		return nil, fmt.Errorf("没有可用的查询结果进行合并")
	}

	// Find MaxMind result
	var maxmindResult *RawQueryResult
	var geocnResult *RawQueryResult

	for i := range results {
		switch results[i].Source {
		case "maxmind":
			maxmindResult = &results[i]
		case "geocn":
			geocnResult = &results[i]
		}
	}

	if maxmindResult == nil {
		return nil, fmt.Errorf("缺少MaxMind数据源")
	}

	// Build base IPInfo from MaxMind
	info := m.getMaxMindInfo(ip, maxmindResult)

	// Supplement with GeoCN for Chinese IPs
	if info.CountryCode == "CN" &&
		(info.RegisteredCountry == nil || info.RegisteredCountry.Code == "CN") &&
		geocnResult != nil && geocnResult.GeoCNData != nil {
		m.supplementWithGeoCN(ctx, info, geocnResult.GeoCNData)
	}

	return info, nil
}

func (m *DataMerger) getMaxMindInfo(ip string, result *RawQueryResult) *model.IPInfo {
	city := result.CityData
	asn := result.ASNData
	ipVersion := iputil.DetectIPVersion(ip)

	info := &model.IPInfo{
		IP:        ip,
		Country:   "",
		CountryCode: "",
		Location: model.Location{
			Latitude:  0,
			Longitude: 0,
		},
		Accuracy:  "low",
		Source:    "MaxMind",
		IPVersion: ipVersion,
	}

	// ASN info
	if asn != nil {
		asNumber := int(asn.AutonomousSystemNumber)
		asName := asn.AutonomousSystemOrganization

		info.AS = &model.ASInfo{
			Number: asNumber,
			Name:   asName,
		}

		// Chinese ISP mapping
		if ispName, ok := ChineseISPASNMap[asNumber]; ok {
			info.AS.Info = ispName
		}
	}

	// Location
	if city != nil && (city.Location.Latitude != 0 || city.Location.Longitude != 0) {
		info.Location = model.Location{
			Latitude:       city.Location.Latitude,
			Longitude:      city.Location.Longitude,
			AccuracyRadius: int(city.Location.AccuracyRadius),
		}
	}

	// Country
	if city != nil {
		countryName := getLocalizedName(city.Country.Names)
		countryCode := city.Country.IsoCode

		// Handle special regions (HK, MO, TW)
		if mapped, ok := SpecialRegionsMap[countryName]; ok {
			countryName = mapped
		}

		info.Country = countryName
		info.CountryCode = countryCode

		// Timezone
		info.Timezone = city.Location.TimeZone

		// Postal
		info.Postal = city.Postal.Code
	}

	// Registered country
	if city != nil && city.RegisteredCountry.IsoCode != "" {
		regName := getLocalizedName(city.RegisteredCountry.Names)
		info.RegisteredCountry = &model.RegisteredCountry{
			Code: city.RegisteredCountry.IsoCode,
			Name: regName,
		}
	}

	// Regions (subdivisions + city)
	if city != nil {
		regions := extractRegions(city)
		if len(regions) > 0 {
			info.Regions = regions
		}
	}

	// Accuracy
	if city != nil {
		info.Accuracy = calculateAccuracy(city)
	}

	return info
}

func (m *DataMerger) supplementWithGeoCN(ctx context.Context, info *model.IPInfo, geocn *GeoCNResult) {
	// Regions
	regions := deduplicateRegions([]string{geocn.Province, geocn.City, geocn.District})
	if len(regions) > 0 {
		info.Regions = regions

		// Short regions
		shortRegions := deduplicateRegions([]string{
			provinceMatch(geocn.Province),
			strings.TrimSuffix(geocn.City, "市"),
			geocn.District,
		})
		if len(shortRegions) > 0 {
			info.RegionsShort = shortRegions
		}
	}

	// Coordinates - use GeoCN if available, otherwise try geocoding
	if m.geocodeSvc != nil {
		coords := m.geocodeSvc.GetCoordinates(ctx, geocn.Lat, geocn.Lng, geocn.Province, geocn.City, geocn.District)
		if coords != nil {
			accuracyRadius := 10
			if coords.Source == "geocn" {
				accuracyRadius = 1
			}
			info.Location = model.Location{
				Latitude:       coords.Latitude,
				Longitude:      coords.Longitude,
				AccuracyRadius: accuracyRadius,
			}

			if coords.Source == "geocn" {
				info.Accuracy = "high"
			} else if coords.Source == "nominatim" && info.Accuracy == "low" {
				info.Accuracy = "medium"
			}
		}
	}

	// Province / City / District
	info.Province = geocn.Province
	info.City = geocn.City
	info.District = geocn.District

	// ISP
	if info.AS == nil {
		info.AS = &model.ASInfo{}
	}
	if geocn.ISP != "" {
		info.AS.Info = geocn.ISP
	}

	// Network type
	if geocn.Type != "" {
		info.Type = geocn.Type
	}

	// Mark source and accuracy
	info.Source = "GeoCN"
	info.Accuracy = "high"
}

// getLocalizedName returns the preferred localized name from a map.
func getLocalizedName(names map[string]string) string {
	for _, lang := range LanguagePriority {
		if name, ok := names[lang]; ok && name != "" {
			return name
		}
	}
	if name, ok := names["en"]; ok {
		return name
	}
	return ""
}

// extractRegions extracts region names from MaxMind city data.
func extractRegions(city *geoip2.City) []string {
	if city == nil {
		return nil
	}

	var regions []string

	// Subdivisions
	for _, sub := range city.Subdivisions {
		name := getLocalizedName(sub.Names)
		if name != "" {
			regions = append(regions, name)
		}
	}

	// City
	cityName := getLocalizedName(city.City.Names)
	countryName := getLocalizedName(city.Country.Names)
	if cityName != "" {
		// Only add if not already the last region and not part of country name
		addCity := true
		if len(regions) > 0 && strings.Contains(regions[len(regions)-1], cityName) {
			addCity = false
		}
		if strings.Contains(countryName, cityName) {
			addCity = false
		}
		if addCity {
			regions = append(regions, cityName)
		}
	}

	return deduplicateRegions(regions)
}

// deduplicateRegions removes empty strings and duplicates while preserving order.
func deduplicateRegions(regions []string) []string {
	var result []string
	seen := make(map[string]bool)

	for _, r := range regions {
		r = strings.TrimSpace(r)
		if r == "" {
			continue
		}
		if !seen[r] {
			seen[r] = true
			result = append(result, r)
		}
	}

	return result
}

// provinceMatch matches a province string against the standard list.
func provinceMatch(provinceName string) string {
	for _, p := range ChineseProvinces {
		if strings.Contains(provinceName, p) {
			return p
		}
	}
	return ""
}
