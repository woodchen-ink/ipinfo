package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/woodchen-ink/ipinfo-server/model"
)

const ipCachePrefix = "ipinfo:query:"

type IPCache struct {
	rdb        *redis.Client
	defaultTTL time.Duration
}

func NewIPCache(rdb *redis.Client, defaultTTL time.Duration) *IPCache {
	return &IPCache{rdb: rdb, defaultTTL: defaultTTL}
}

func (c *IPCache) Get(ctx context.Context, ip string) (*model.IPInfo, error) {
	data, err := c.rdb.Get(ctx, ipCachePrefix+ip).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var info model.IPInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *IPCache) Set(ctx context.Context, ip string, info *model.IPInfo) error {
	data, err := json.Marshal(info)
	if err != nil {
		return err
	}

	ttl := CalculateSmartTTL(info, c.defaultTTL)
	return c.rdb.Set(ctx, ipCachePrefix+ip, data, ttl).Err()
}

func (c *IPCache) Delete(ctx context.Context, ip string) error {
	return c.rdb.Del(ctx, ipCachePrefix+ip).Err()
}

// CalculateSmartTTL computes a dynamic TTL based on accuracy, source, region, and IP version.
// This replicates the TypeScript calculateTTL logic from lib/geoip/cache.ts.
func CalculateSmartTTL(data *model.IPInfo, baseTTL time.Duration) time.Duration {
	ttl := float64(baseTTL)

	// Accuracy multiplier
	switch data.Accuracy {
	case "high":
		ttl *= 2.0
	case "medium":
		ttl *= 1.5
	case "low":
		ttl *= 0.5
	}

	// Source multiplier
	if data.Source == "GeoCN" {
		ttl *= 1.5
	}

	// Region multiplier
	if data.CountryCode == "CN" {
		ttl *= 1.2
	}

	// IP version multiplier
	if data.IPVersion == "IPv6" {
		ttl *= 0.8
	}

	result := time.Duration(ttl)

	// Minimum 5 minutes
	minTTL := 5 * time.Minute
	if result < minTTL {
		result = minTTL
	}

	return result
}

func (c *IPCache) GetStats(ctx context.Context) (map[string]interface{}, error) {
	var cursor uint64
	var count int64
	for {
		keys, nextCursor, err := c.rdb.Scan(ctx, cursor, ipCachePrefix+"*", 100).Result()
		if err != nil {
			return nil, err
		}
		count += int64(len(keys))
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return map[string]interface{}{
		"size":    count,
		"maxSize": math.MaxInt64,
	}, nil
}

// GenericCache provides simple Redis caching for any JSON-serializable type.
type GenericCache struct {
	rdb    *redis.Client
	prefix string
	ttl    time.Duration
}

func NewGenericCache(rdb *redis.Client, prefix string, ttl time.Duration) *GenericCache {
	return &GenericCache{rdb: rdb, prefix: prefix, ttl: ttl}
}

func (c *GenericCache) Get(ctx context.Context, key string) ([]byte, error) {
	data, err := c.rdb.Get(ctx, c.prefix+key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

func (c *GenericCache) Set(ctx context.Context, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, c.prefix+key, data, c.ttl).Err()
}

func (c *GenericCache) SetWithTTL(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, c.prefix+key, data, ttl).Err()
}

func (c *GenericCache) Delete(ctx context.Context, key string) error {
	return c.rdb.Del(ctx, c.prefix+key).Err()
}

// Convenience constructors for specific cache types.
func NewBGPCache(rdb *redis.Client, ttl time.Duration) *GenericCache {
	return NewGenericCache(rdb, "ipinfo:bgp:", ttl)
}

func NewMeituanCache(rdb *redis.Client, ttl time.Duration) *GenericCache {
	return NewGenericCache(rdb, "ipinfo:meituan:", ttl)
}

func NewProxyCache(rdb *redis.Client, ttl time.Duration) *GenericCache {
	return NewGenericCache(rdb, "ipinfo:proxy:", ttl)
}

func NewGeocodeCache(rdb *redis.Client, ttl time.Duration) *GenericCache {
	return NewGenericCache(rdb, "ipinfo:geocode:", ttl)
}

// RateLimiter provides Redis-backed per-IP rate limiting.
type RateLimiter struct {
	rdb *redis.Client
}

func NewRateLimiter(rdb *redis.Client) *RateLimiter {
	return &RateLimiter{rdb: rdb}
}

type RateLimitResult struct {
	Allowed   bool
	Remaining int64
	Total     int64
	ResetAt   time.Time
}

func (rl *RateLimiter) Check(ctx context.Context, ip, endpoint string, maxRequests int64, window time.Duration) (*RateLimitResult, error) {
	key := fmt.Sprintf("ipinfo:rate:%s:%s", ip, endpoint)

	count, err := rl.rdb.Incr(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	// Set expiry on first request in the window
	if count == 1 {
		rl.rdb.Expire(ctx, key, window)
	}

	ttl, _ := rl.rdb.TTL(ctx, key).Result()
	resetAt := time.Now().Add(ttl)

	remaining := maxRequests - count
	if remaining < 0 {
		remaining = 0
	}

	return &RateLimitResult{
		Allowed:   count <= maxRequests,
		Remaining: remaining,
		Total:     maxRequests,
		ResetAt:   resetAt,
	}, nil
}
