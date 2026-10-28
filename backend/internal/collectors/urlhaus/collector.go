// ©AngelaMos | 2026
// collector.go

package urlhaus

import (
	"context"
	"log/slog"
	"time"

	"github.com/carterperez-dev/monitor-the-situation/backend/internal/events"
)

const Name = "urlhaus"

type Fetcher interface {
	Fetch(ctx context.Context) ([]URLhausEntry, error)
}

type Persister interface {
	KnownIDs(ctx context.Context, ids []string) (map[string]bool, error)
	Insert(ctx context.Context, entry URLhausEntry) error
}

type Emitter interface {
	Emit(ctx context.Context, ev events.Event)
}

type Collector struct {
	fetcher   Fetcher
	persister Persister
	bus       Emitter
	logger    *slog.Logger
	interval  time.Duration
}

func NewCollector(
	fetcher Fetcher,
	persister Persister,
	bus Emitter,
	logger *slog.Logger,
	interval time.Duration,
) *Collector {
	if interval == 0 {
		interval = 15 * time.Minute
	}
	return &Collector{
		fetcher:   fetcher,
		persister: persister,
		bus:       bus,
		logger:    logger,
		interval:  interval,
	}
}

func (c *Collector) Start(ctx context.Context) {
	c.logger.Info("starting urlhaus collector", "interval", c.interval)
	ticker := time.NewTicker(c.interval)
	defer ticker.Stop()

	c.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			c.logger.Info("stopping urlhaus collector")
			return
		case <-ticker.C:
			c.tick(ctx)
		}
	}
}

func (c *Collector) tick(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	entries, err := c.fetcher.Fetch(ctx)
	if err != nil {
		c.logger.Error("urlhaus fetch failed", "err", err)
		return
	}

	var ids []string
	for _, e := range entries {
		ids = append(ids, e.ID)
	}

	known, err := c.persister.KnownIDs(ctx, ids)
	if err != nil {
		c.logger.Error("urlhaus known check failed", "err", err)
		return
	}

	newCount := 0
	for _, e := range entries {
		if known[e.ID] {
			continue
		}

		if err := c.persister.Insert(ctx, e); err != nil {
			c.logger.Error("urlhaus insert failed", "id", e.ID, "err", err)
			continue
		}

		c.bus.Emit(ctx, events.Event{
			Source:    Name,
			Topic:     "urlhaus_url",
			Timestamp: time.Now().UTC(),
			Payload:   e,
		})
		newCount++
	}

	c.logger.Info("urlhaus tick complete", "fetched", len(entries), "new", newCount)
}
