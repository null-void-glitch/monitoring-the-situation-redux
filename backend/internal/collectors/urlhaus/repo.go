// ©AngelaMos | 2026
// repo.go

package urlhaus

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type Repo struct {
	db *sqlx.DB
}

func NewRepo(db *sqlx.DB) *Repo {
	return &Repo{db: db}
}

func (r *Repo) Insert(ctx context.Context, entry URLhausEntry) error {
	// Parse date "2023-10-27 12:34:56" assuming UTC
	dateAdded, err := time.Parse("2006-01-02 15:04:05", entry.DateAdded)
	if err != nil {
		// fallback to now if parsing fails
		dateAdded = time.Now().UTC()
	}

	payload, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("urlhaus marshal: %w", err)
	}

	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO urlhaus_urls (id, url, status, threat, tags, reporter, date_added, payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO NOTHING
	`, entry.ID, entry.URL, entry.Status, entry.Threat, pq.Array(entry.Tags), entry.Reporter, dateAdded, payload)

	if err != nil {
		return fmt.Errorf("urlhaus insert %s: %w", entry.ID, err)
	}
	return nil
}

func (r *Repo) KnownIDs(ctx context.Context, ids []string) (map[string]bool, error) {
	if len(ids) == 0 {
		return map[string]bool{}, nil
	}
	var found []string
	if err := r.db.SelectContext(ctx, &found, `SELECT id FROM urlhaus_urls WHERE id = ANY($1::text[])`, pq.Array(ids)); err != nil {
		return nil, fmt.Errorf("urlhaus known ids: %w", err)
	}
	out := make(map[string]bool, len(found))
	for _, id := range found {
		out[id] = true
	}
	return out, nil
}

func (r *Repo) Recent(ctx context.Context, limit int) ([]URLhausEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	var payloads [][]byte
	err := r.db.SelectContext(ctx, &payloads, `SELECT payload FROM urlhaus_urls ORDER BY date_added DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("urlhaus recent: %w", err)
	}

	var out []URLhausEntry
	for _, p := range payloads {
		var e URLhausEntry
		if err := json.Unmarshal(p, &e); err == nil {
			out = append(out, e)
		}
	}
	return out, nil
}

