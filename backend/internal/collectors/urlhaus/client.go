// ©AngelaMos | 2026
// client.go

package urlhaus

import (
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	http *http.Client
	url  string
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{Timeout: 30 * time.Second},
		url:  "https://urlhaus.abuse.ch/downloads/csv_recent/",
	}
}

func (c *Client) Fetch(ctx context.Context) ([]URLhausEntry, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.url, nil)
	if err != nil {
		return nil, fmt.Errorf("urlhaus req: %w", err)
	}
	req.Header.Add("User-Agent", "monitor-the-situation/1.0")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("urlhaus do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("urlhaus status: %d", resp.StatusCode)
	}

	reader := csv.NewReader(resp.Body)
	reader.Comment = '#'
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("urlhaus csv: %w", err)
	}

	var results []URLhausEntry
	for _, rec := range records {
		if len(rec) < 9 {
			continue
		}
		// id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter
		tags := strings.Split(rec[6], ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
		results = append(results, URLhausEntry{
			ID:        rec[0],
			URLID:     rec[0],
			DateAdded: rec[1],
			URL:       rec[2],
			Status:    rec[3],
			Threat:    rec[5],
			Tags:      tags,
			Reporter:  rec[8],
		})
	}

	return results, nil
}
