package model

// BGPPeer represents a single BGP peer.
type BGPPeer struct {
	ASN    int    `json:"asn"`
	Type   string `json:"type"`   // "left" (upstream), "right" (downstream), "uncertain"
	Power  int    `json:"power"`  // Number of observed paths
	V4Peer int    `json:"v4Peer"` // Number of IPv4 RIS peers observing this
	V6Peer int    `json:"v6Peer"` // Number of IPv6 RIS peers observing this
}

// ProcessedBGPData is the response for BGP peer queries.
type ProcessedBGPData struct {
	CenterASN  int       `json:"centerAsn"`
	CenterName string    `json:"centerName"`
	Upstreams  []BGPPeer `json:"upstreams"`
	Downstreams []BGPPeer `json:"downstreams"`
	Uncertain  []BGPPeer `json:"uncertain"`
	AllPeers   []BGPPeer `json:"allPeers"`
}

// RIPEstat asn-neighbours response types
type RIPEStatResponse struct {
	Status     string              `json:"status"`
	StatusCode int                 `json:"status_code"`
	Data       RIPEStatNeighbours  `json:"data"`
}

type RIPEStatNeighbours struct {
	Resource        string                `json:"resource"`
	NeighbourCounts RIPEStatNeighbourCount `json:"neighbour_counts"`
	Neighbours      []RIPEStatNeighbour   `json:"neighbours"`
}

type RIPEStatNeighbourCount struct {
	Left      int `json:"left"`
	Right     int `json:"right"`
	Unique    int `json:"unique"`
	Uncertain int `json:"uncertain"`
}

type RIPEStatNeighbour struct {
	ASN     int    `json:"asn"`
	Type    string `json:"type"`
	Power   int    `json:"power"`
	V4Peers int    `json:"v4_peers"`
	V6Peers int    `json:"v6_peers"`
}

// RIPEstat as-overview response types
type RIPEStatOverviewResponse struct {
	Status     string               `json:"status"`
	StatusCode int                  `json:"status_code"`
	Data       RIPEStatOverviewData `json:"data"`
}

type RIPEStatOverviewData struct {
	Resource string `json:"resource"`
	Holder   string `json:"holder"`
}
