// ©AngelaMos | 2026
// collector.go

package tor

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	Name            = "tor"
	defaultInterval = 30 * time.Minute
	RedisSetKey     = "tor_exits"
)

type CollectorConfig struct {
	Interval time.Duration
	URL      string
	Redis    *redis.Client
	Logger   *slog.Logger
}

type Collector struct {
	cfg    CollectorConfig
	logger *slog.Logger
}

func NewCollector(cfg CollectorConfig) *Collector {
	if cfg.Interval <= 0 {
		cfg.Interval = defaultInterval
	}
	if cfg.URL == "" {
		cfg.URL = "https://check.torproject.org/torbulkexitlist"
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	return &Collector{cfg: cfg, logger: cfg.Logger}
}

func (c *Collector) Name() string { return Name }

func (c *Collector) Run(ctx context.Context) error {
	ticker := time.NewTicker(c.cfg.Interval)
	defer ticker.Stop()

	c.tick(ctx)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			c.tick(ctx)
		}
	}
}

func (c *Collector) tick(ctx context.Context) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.cfg.URL, nil)
	if err != nil {
		c.logger.Warn("tor create request failed", "err", err)
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.logger.Warn("tor fetch failed", "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.logger.Warn("tor fetch non-200", "status", resp.StatusCode)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.logger.Warn("tor read body failed", "err", err)
		return
	}

	ips := strings.Split(string(body), "\n")
	var validIPs []interface{}
	for _, ip := range ips {
		ip = strings.TrimSpace(ip)
		if ip != "" && !strings.HasPrefix(ip, "#") {
			validIPs = append(validIPs, ip)
		}
	}

	if len(validIPs) == 0 {
		c.logger.Warn("tor fetch returned no IPs")
		return
	}

	// Replace the existing set using a pipeline
	pipe := c.cfg.Redis.Pipeline()
	tmpKey := RedisSetKey + "_tmp"
	pipe.Del(ctx, tmpKey)
	pipe.SAdd(ctx, tmpKey, validIPs...)
	pipe.Rename(ctx, tmpKey, RedisSetKey)
	if _, err := pipe.Exec(ctx); err != nil {
		c.logger.Warn("tor redis update failed", "err", err)
		return
	}

	c.logger.Info("tor exit list updated", "count", len(validIPs))
}
