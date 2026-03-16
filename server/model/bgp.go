package model

// BGPPeer represents a single BGP peer.
type BGPPeer struct {
	ASN         int    `json:"asn"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CountryCode string `json:"country_code"`
}

// ProcessedBGPData is the response for BGP peer queries.
type ProcessedBGPData struct {
	CenterASN  int       `json:"centerAsn"`
	CenterName string    `json:"centerName"`
	IPv4Peers  []BGPPeer `json:"ipv4Peers"`
	IPv6Peers  []BGPPeer `json:"ipv6Peers"`
	AllPeers   []BGPPeer `json:"allPeers"`
}

// bgpview.io raw response types
type BGPViewResponse struct {
	Status        string         `json:"status"`
	StatusMessage string         `json:"status_message"`
	Data          BGPViewPeers   `json:"data"`
}

type BGPViewPeers struct {
	IPv4Peers []BGPViewPeer `json:"ipv4_peers"`
	IPv6Peers []BGPViewPeer `json:"ipv6_peers"`
}

type BGPViewPeer struct {
	ASN         int    `json:"asn"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CountryCode string `json:"country_code"`
}
