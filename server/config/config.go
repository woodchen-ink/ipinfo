package config

import (
	"context"
	"fmt"
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
	return &cfg, nil
}
