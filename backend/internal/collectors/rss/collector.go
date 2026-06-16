package rss

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/carterperez-dev/monitor-the-situation/backend/internal/config"
	"github.com/carterperez-dev/monitor-the-situation/backend/internal/events"
)

const Name = "rss"

type Emitter interface {
	Emit(ctx context.Context, ev events.Event)
}

type StateRecorder interface {
	RecordSuccess(ctx context.Context, name string, eventCount int64)
	RecordError(ctx context.Context, name, errMsg string)
}

type CollectorConfig struct {
	Interval time.Duration
	Feeds    []config.RSSFeedConfig
	Fetcher  Fetcher
	Emitter  Emitter
	State    StateRecorder
	Logger   *slog.Logger
	Trigger  <-chan struct{}
}

type Collector struct {
	cfg    CollectorConfig
	logger *slog.Logger
	seen   map[string]bool
}

func NewCollector(cfg CollectorConfig) *Collector {
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	return &Collector{
		cfg:    cfg,
		logger: cfg.Logger,
	}
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
		case <-c.cfg.Trigger:
			c.tick(ctx)
		}
	}
}

func (c *Collector) tick(ctx context.Context) {
	now := time.Now().UTC()
	var batch []map[string]any

	for _, feedConfig := range c.cfg.Feeds {
		feed, err := c.cfg.Fetcher.Fetch(ctx, feedConfig.URL)
		if err != nil {
			c.logger.Warn("rss fetch error", "feed", feedConfig.Name, "err", err)
			c.cfg.State.RecordError(ctx, Name, err.Error())
			continue
		}

		count := 0
		for _, item := range feed.Items {
			if count >= 10 {
				break
			}
			var pubTime time.Time
			if item.PublishedParsed != nil {
				pubTime = *item.PublishedParsed
			} else {
				pubTime = now
			}

			batch = append(batch, map[string]any{
				"source":    feedConfig.Name,
				"title":     item.Title,
				"link":      item.Link,
				"published": pubTime,
			})
			count++
		}
	}

	if len(batch) > 0 {
		body, _ := json.Marshal(batch)
		c.cfg.Emitter.Emit(ctx, events.Event{
			Topic:     events.TopicRSSFeed,
			Timestamp: now,
			Source:    Name,
			Payload:   json.RawMessage(body),
		})
		c.cfg.State.RecordSuccess(ctx, Name, int64(len(batch)))
	} else {
		c.cfg.State.RecordSuccess(ctx, Name, 0)
	}
}
