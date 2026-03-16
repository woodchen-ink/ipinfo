package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates a new Redis client and verifies the connection.
func NewRedisClient(addr, password string, db int) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	return rdb, nil
}
