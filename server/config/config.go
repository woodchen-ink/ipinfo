package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/sethvargo/go-envconfig"
)

type Config struct {
	// Server
	Port    int    `env:"PORT,default=8080"`
	GinMode string `env:"GIN_MODE,default=release"`

	// Redis
	RedisAddr     string `env:"REDIS_ADDR,default=localhost:6379"`
	RedisPassword string `env:"REDIS_PASSWORD,default="`
	RedisDB       int    `env:"REDIS_DB,default=0"`

	// MMDB database paths
	DataDir string `env:"DATA_DIR,default=./data"`

	// Fallback API credentials
	MaxMindAccountID  string `env:"MAXMIND_ACCOUNT_ID,default="`
	MaxMindLicenseKey string `env:"MAXMIND_LICENSE_KEY,default="`
	IPInfoToken       string `env:"IPINFO_TOKEN,default="`

	// Init API key
	InitAPIKey string `env:"INIT_API_KEY,default="`

	// Frontend static files directory (SPA mode)
	WebDir string `env:"WEB_DIR,default="`

	// Geocode
	NominatimBaseURL string `env:"NOMINATIM_BASE_URL,default=https://map.447654.xyz/search"`

	// Cache TTL defaults
	DefaultCacheTTL time.Duration `env:"DEFAULT_CACHE_TTL,default=1h"`
	BGPCacheTTL     time.Duration `env:"BGP_CACHE_TTL,default=30m"`
	MeituanCacheTTL time.Duration `env:"MEITUAN_CACHE_TTL,default=10m"`
	ProxyCacheTTL   time.Duration `env:"PROXY_CACHE_TTL,default=1m"`
	GeocodeCacheTTL time.Duration `env:"GEOCODE_CACHE_TTL,default=168h"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process(context.Background(), &cfg); err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}
	cfg.WebDir = resolveWebDir(cfg.WebDir)
	return &cfg, nil
}

func resolveWebDir(configured string) string {
	candidates := make([]string, 0, 16)
	if configured != "" {
		candidates = append(candidates, configured)
	}

	for _, base := range upwardSearchBases(4) {
		candidates = append(candidates,
			filepath.Join(base, "web"),
			filepath.Join(base, "web", "out"),
		)
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		for _, base := range upwardSearchBasesFromDir(exeDir, 3) {
			candidates = append(candidates,
				filepath.Join(base, "web"),
				filepath.Join(base, "web", "out"),
			)
		}
	}

	for _, candidate := range candidates {
		if resolved, ok := frontendDirIfValid(candidate); ok {
			return resolved
		}
	}

	return configured
}

func upwardSearchBases(levels int) []string {
	wd, err := os.Getwd()
	if err != nil {
		return nil
	}
	return upwardSearchBasesFromDir(wd, levels)
}

func upwardSearchBasesFromDir(start string, levels int) []string {
	bases := make([]string, 0, levels+1)
	current := start
	for range levels + 1 {
		bases = append(bases, current)
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return bases
}

func frontendDirIfValid(dir string) (string, bool) {
	if dir == "" {
		return "", false
	}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		return "", false
	}

	info, err := os.Stat(absDir)
	if err != nil || !info.IsDir() {
		return "", false
	}

	indexPath := filepath.Join(absDir, "index.html")
	if info, err = os.Stat(indexPath); err != nil || info.IsDir() {
		return "", false
	}

	return absDir, true
}
