package service

import "github.com/oschwald/geoip2-golang"

// evaluateMaxMindAccuracy computes a 0-1 accuracy score for MaxMind data.
func evaluateMaxMindAccuracy(data *geoip2.City) float64 {
	score := 0.5

	if data.Location.Latitude != 0 && data.Location.Longitude != 0 {
		score += 0.3
		if data.Location.AccuracyRadius > 0 {
			if data.Location.AccuracyRadius <= 10 {
				score += 0.2
			} else if data.Location.AccuracyRadius <= 50 {
				score += 0.1
			}
		}
	}

	if len(data.City.Names) > 0 {
		score += 0.1
	}

	if score > 1.0 {
		score = 1.0
	}
	return score
}

// evaluateMaxMindCompleteness computes a 0-1 completeness score.
func evaluateMaxMindCompleteness(city *geoip2.City, asn *geoip2.ASN) float64 {
	score := 0
	maxScore := 6

	if len(city.Country.Names) > 0 {
		score++
	}
	if len(city.Subdivisions) > 0 && len(city.Subdivisions[0].Names) > 0 {
		score++
	}
	if len(city.City.Names) > 0 {
		score++
	}
	if city.Location.Latitude != 0 && city.Location.Longitude != 0 {
		score++
	}
	if city.Postal.Code != "" {
		score++
	}
	if asn != nil && asn.AutonomousSystemOrganization != "" {
		score++
	}

	return float64(score) / float64(maxScore)
}

// evaluateGeoCNAccuracy computes a 0-1 accuracy score for GeoCN data.
func evaluateGeoCNAccuracy(data *GeoCNResult) float64 {
	score := 0.7
	if data.Lat != 0 && data.Lng != 0 {
		score += 0.2
	}
	if data.District != "" {
		score += 0.1
	}
	if score > 1.0 {
		score = 1.0
	}
	return score
}

// evaluateGeoCNCompleteness computes a 0-1 completeness score.
func evaluateGeoCNCompleteness(data *GeoCNResult) float64 {
	score := 0
	maxScore := 6

	if data.Country != "" {
		score++
	}
	if data.Province != "" {
		score++
	}
	if data.City != "" {
		score++
	}
	if data.District != "" {
		score++
	}
	if data.ISP != "" {
		score++
	}
	if data.Lat != 0 && data.Lng != 0 {
		score++
	}

	return float64(score) / float64(maxScore)
}

// calculateAccuracy computes the final accuracy label from MaxMind city data.
func calculateAccuracy(city *geoip2.City) string {
	if city == nil {
		return "low"
	}

	score := 0

	if city.Location.Latitude != 0 && city.Location.Longitude != 0 {
		score += 2
		if city.Location.AccuracyRadius > 0 {
			if city.Location.AccuracyRadius <= 10 {
				score += 2
			} else if city.Location.AccuracyRadius <= 50 {
				score += 1
			}
		}
	}

	if len(city.City.Names) > 0 {
		score++
	}
	if len(city.Subdivisions) > 0 && len(city.Subdivisions[0].Names) > 0 {
		score++
	}

	if score >= 6 {
		return "high"
	}
	if score >= 3 {
		return "medium"
	}
	return "low"
}
