// ©AngelaMos | 2026
// client.go

package ipapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/time/rate"

	"github.com/carterperez-dev/monitor-the-situation/backend/internal/httpx"
)

const (
	defaultIPAPIBaseURL    = "http://ip-api.com"
	defaultIPAPIRate       = 1500 * time.Millisecond // ~40 requests per minute
	defaultIPAPIBudget     = 3
	defaultIPAPIBreakerWin = 1 * time.Minute
	defaultIPAPIRequestTO  = 5 * time.Second
)

var ErrUnknownIP = errors.New("ipapi: unknown ip")

type ClientConfig struct {
	BaseURL string
}

type Client struct {
	hx *httpx.Client
}

func NewClient(cfg ClientConfig) *Client {
	if cfg.BaseURL == "" {
		cfg.BaseURL = defaultIPAPIBaseURL
	}
	return &Client{
		hx: httpx.New(httpx.Config{
			Name:                     "ipapi",
			BaseURL:                  cfg.BaseURL,
			Rate:                     rate.Every(defaultIPAPIRate),
			Burst:                    1,
			ConsecutiveFailureBudget: defaultIPAPIBudget,
			BreakerTimeout:           defaultIPAPIBreakerWin,
			RequestTimeout:           defaultIPAPIRequestTO,
		}),
	}
}

type Verdict struct {
	Status      string  `json:"status"`
	Message     string  `json:"message"`
	CountryCode string  `json:"countryCode"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

func (c *Client) Lookup(ctx context.Context, ip string) (Verdict, error) {
	resp, err := c.hx.Get(ctx, "/json/"+url.PathEscape(ip), nil)
	if err != nil {
		var se *httpx.StatusError
		if errors.As(err, &se) && se.Code == http.StatusNotFound {
			return Verdict{}, ErrUnknownIP
		}
		return Verdict{}, fmt.Errorf("ipapi lookup %s: %w", ip, err)
	}
	defer resp.Body.Close()

	var v Verdict
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		return Verdict{}, fmt.Errorf("ipapi decode: %w", err)
	}
	if v.Status == "fail" {
		return Verdict{}, fmt.Errorf("ipapi failed: %s", v.Message)
	}
	return v, nil
}
