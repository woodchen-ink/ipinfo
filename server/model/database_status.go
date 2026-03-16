package model

import "time"

type DatabaseStatus struct {
	Name         string     `json:"name"`
	Exists       bool       `json:"exists"`
	Size         int64      `json:"size"`
	LastModified *time.Time `json:"lastModified"`
	IsValid      bool       `json:"isValid"`
	ExpectedSize int64      `json:"expectedSize,omitempty"`
}

type InitStatusResponse struct {
	IsReady       bool             `json:"isReady"`
	IsChecking    bool             `json:"isChecking"`
	IsDownloading bool             `json:"isDownloading"`
	Databases     []DatabaseStatus `json:"databases"`
	Error         *string          `json:"error"`
}
