package service

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/woodchen-ink/ipinfo-server/model"
	"go.uber.org/zap"
)

type dbConfig struct {
	URL          string
	ExpectedSize int64
}

var databaseConfigs = map[string]dbConfig{
	"GeoLite2-City.mmdb": {
		URL:          "https://git.io/GeoLite2-City.mmdb",
		ExpectedSize: 58 * 1024 * 1024,
	},
	"GeoLite2-ASN.mmdb": {
		URL:          "https://git.io/GeoLite2-ASN.mmdb",
		ExpectedSize: 10 * 1024 * 1024,
	},
	"GeoCN.mmdb": {
		URL:          "https://github.com/ljxi/GeoCN/releases/download/Latest/GeoCN.mmdb",
		ExpectedSize: int64(7.5 * 1024 * 1024),
	},
}

// DatabaseDownloader manages MMDB database file downloads.
type DatabaseDownloader struct {
	dataDir       string
	isDownloading bool
	mu            sync.Mutex
	logger        *zap.Logger
}

func NewDatabaseDownloader(dataDir string, logger *zap.Logger) *DatabaseDownloader {
	// Ensure data directory exists
	os.MkdirAll(dataDir, 0755)
	return &DatabaseDownloader{dataDir: dataDir, logger: logger}
}

// CheckDatabases returns the status of all database files.
func (d *DatabaseDownloader) CheckDatabases() []model.DatabaseStatus {
	var statuses []model.DatabaseStatus

	for filename, cfg := range databaseConfigs {
		fp := filepath.Join(d.dataDir, filename)
		stat, err := os.Stat(fp)

		status := model.DatabaseStatus{
			Name:         filename,
			ExpectedSize: cfg.ExpectedSize,
		}

		if err == nil {
			status.Exists = true
			status.Size = stat.Size()
			modTime := stat.ModTime()
			status.LastModified = &modTime
			status.IsValid = d.validateFile(fp, cfg.ExpectedSize)
		}

		statuses = append(statuses, status)
	}

	return statuses
}

// EnsureDatabasesAvailable downloads any missing or invalid database files.
func (d *DatabaseDownloader) EnsureDatabasesAvailable() error {
	statuses := d.CheckDatabases()
	var missing []string
	for _, s := range statuses {
		if !s.Exists || !s.IsValid {
			missing = append(missing, s.Name)
		}
	}

	if len(missing) == 0 {
		d.logger.Info("所有数据库文件都已存在且有效")
		return nil
	}

	d.logger.Info("需要下载数据库文件", zap.Strings("missing", missing))

	var wg sync.WaitGroup
	errCh := make(chan error, len(missing))

	for _, name := range missing {
		wg.Add(1)
		go func(filename string) {
			defer wg.Done()
			if err := d.downloadDatabase(filename); err != nil {
				errCh <- fmt.Errorf("下载 %s 失败: %w", filename, err)
			}
		}(name)
	}

	wg.Wait()
	close(errCh)

	var errs []error
	for err := range errCh {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		return fmt.Errorf("部分数据库下载失败: %v", errs)
	}

	return nil
}

func (d *DatabaseDownloader) downloadDatabase(filename string) error {
	cfg, ok := databaseConfigs[filename]
	if !ok {
		return fmt.Errorf("未知的数据库文件: %s", filename)
	}

	d.mu.Lock()
	d.isDownloading = true
	d.mu.Unlock()
	defer func() {
		d.mu.Lock()
		d.isDownloading = false
		d.mu.Unlock()
	}()

	fp := filepath.Join(d.dataDir, filename)
	d.logger.Info("开始下载数据库", zap.String("filename", filename), zap.String("url", cfg.URL))

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Get(cfg.URL)
	if err != nil {
		return fmt.Errorf("HTTP请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Write to temp file first
	tmpPath := fp + ".tmp"
	f, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("创建文件失败: %w", err)
	}

	written, err := io.Copy(f, resp.Body)
	f.Close()

	if err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("写入失败: %w", err)
	}

	// Validate size
	if cfg.ExpectedSize > 0 && written < int64(float64(cfg.ExpectedSize)*0.9) {
		os.Remove(tmpPath)
		return fmt.Errorf("文件大小异常: %d < %d", written, int64(float64(cfg.ExpectedSize)*0.9))
	}

	// Rename to final path
	if err := os.Rename(tmpPath, fp); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("重命名失败: %w", err)
	}

	d.logger.Info("数据库下载完成", zap.String("filename", filename), zap.Int64("size", written))
	return nil
}

func (d *DatabaseDownloader) validateFile(fp string, expectedSize int64) bool {
	stat, err := os.Stat(fp)
	if err != nil {
		return false
	}
	if expectedSize > 0 && stat.Size() < int64(float64(expectedSize)*0.9) {
		return false
	}
	return true
}

// IsDownloading returns whether a download is in progress.
func (d *DatabaseDownloader) IsDownloading() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.isDownloading
}
