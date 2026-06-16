// ©AngelaMos | 2026
// collector.go

package ransomware

import (
	"context"
	_ "embed"
	"encoding/json"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/carterperez-dev/monitor-the-situation/backend/internal/events"
)

//go:embed actor_tactics.yaml
var actorTacticsRaw []byte

var actorTactics map[string][]string

var unmappedActors map[string]bool
var unmappedMu sync.Mutex

func init() {
	actorTactics = make(map[string][]string)
	if err := yaml.Unmarshal(actorTacticsRaw, &actorTactics); err != nil {
		panic(err)
	}
	unmappedActors = make(map[string]bool)
}

func GetTactics(actor string) ([]string, bool) {
	techs, ok := actorTactics[strings.ToLower(actor)]
	return techs, ok
}

func logUnmappedActor(actor string, logger *slog.Logger) {
	actorLower := strings.ToLower(actor)
	unmappedMu.Lock()
	defer unmappedMu.Unlock()
	if unmappedActors[actorLower] {
		return
	}
	unmappedActors[actorLower] = true

	f, err := os.OpenFile("unmapped_actors.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer f.Close()
		f.WriteString(actor + "\n")
	} else {
		logger.Error("failed to write to unmapped_actors.txt", "err", err)
	}
}

const (
	Name                 = "ransomware"
	defaultRansomCadence = 15 * time.Minute
)

type Fetcher interface {
	FetchRecent(ctx context.Context) ([]Victim, error)
}

type Repository interface {
	Insert(ctx context.Context, row Row) error
	KnownIDs(ctx context.Context, ids []string) (map[string]bool, error)
}

type Emitter interface {
	Emit(ctx context.Context, ev events.Event)
}

type StateRecorder interface {
	RecordSuccess(ctx context.Context, name string, eventCount int64)
	RecordError(ctx context.Context, name, errMsg string)
}

type CollectorConfig struct {
	Interval time.Duration
	Fetcher  Fetcher
	Repo     Repository
	Emitter    Emitter
	State      StateRecorder
	BtcTracker *BitcoinTracker
	Logger     *slog.Logger
}

type Collector struct {
	cfg    CollectorConfig
	logger *slog.Logger
}

func NewCollector(cfg CollectorConfig) *Collector {
	if cfg.Interval <= 0 {
		cfg.Interval = defaultRansomCadence
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
	vs, err := c.cfg.Fetcher.FetchRecent(ctx)
	if err != nil {
		c.logger.Warn("ransomware fetch", "err", err)
		c.cfg.State.RecordError(ctx, Name, err.Error())
		return
	}

	ids := make([]string, 0, len(vs))
	for _, v := range vs {
		ids = append(ids, v.ID())
	}

	known, err := c.cfg.Repo.KnownIDs(ctx, ids)
	if err != nil {
		c.logger.Warn("ransomware known ids", "err", err)
		c.cfg.State.RecordError(ctx, Name, err.Error())
		return
	}

	now := time.Now().UTC()
	emitted := int64(0)
	for _, v := range vs {
		id := v.ID()
		if known[id] {
			continue
		}

		techs, ok := actorTactics[strings.ToLower(v.GroupName)]
		if ok {
			v.Techniques = techs
		} else {
			c.logger.Warn("unmapped ransomware actor", "actor", v.GroupName)
			logUnmappedActor(v.GroupName, c.logger)
		}

		var raw []byte
		if c.cfg.BtcTracker != nil {
			type EnrichedVictim struct {
				Victim
				WalletAddress string  `json:"wallet_address,omitempty"`
				WalletTxs     []int64 `json:"wallet_txs,omitempty"`
			}
			addr, txs := c.cfg.BtcTracker.FindAndTrack(ctx, v.Description)
			enriched := EnrichedVictim{
				Victim:        v,
				WalletAddress: addr,
				WalletTxs:     txs,
			}
			raw, _ = json.Marshal(enriched)
		} else {
			raw, _ = json.Marshal(v)
		}

		row := Row{
			ID:           id,
			PostTitle:    v.PostTitle,
			GroupName:    v.GroupName,
			DiscoveredAt: v.Discovered,
			Country:      v.Country,
			Sector:       v.Activity,
			Payload:      raw,
		}

		if err := c.cfg.Repo.Insert(ctx, row); err != nil {
			c.logger.Warn("ransomware insert", "id", id, "err", err)
			continue
		}

		c.cfg.Emitter.Emit(ctx, events.Event{
			Topic:     events.TopicRansomwareVictim,
			Timestamp: now,
			Source:    Name,
			Payload:   json.RawMessage(raw),
		})
		emitted++
	}
	c.cfg.State.RecordSuccess(ctx, Name, emitted)
}
