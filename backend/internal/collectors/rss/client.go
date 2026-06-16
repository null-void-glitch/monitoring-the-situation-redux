package rss

import (
	"context"

	"github.com/mmcdole/gofeed"
)

type Fetcher interface {
	Fetch(ctx context.Context, url string) (*gofeed.Feed, error)
}

type Client struct {
	fp *gofeed.Parser
}

func NewClient() *Client {
	return &Client{fp: gofeed.NewParser()}
}

func (c *Client) Fetch(ctx context.Context, url string) (*gofeed.Feed, error) {
	return c.fp.ParseURLWithContext(url, ctx)
}
