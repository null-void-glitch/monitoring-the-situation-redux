// ©AngelaMos | 2026
// bitcoin.go

package ransomware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/redis/go-redis/v9"
)

var btcRegex = regexp.MustCompile(`\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b`)

type BitcoinTracker struct {
	redis *redis.Client
}

func NewBitcoinTracker(r *redis.Client) *BitcoinTracker {
	return &BitcoinTracker{redis: r}
}

type mempoolTx struct {
	Vout []struct {
		ScriptpubkeyAddress string `json:"scriptpubkey_address"`
		Value               int64  `json:"value"`
	} `json:"vout"`
	Vin []struct {
		Prevout struct {
			ScriptpubkeyAddress string `json:"scriptpubkey_address"`
			Value               int64  `json:"value"`
		} `json:"prevout"`
	} `json:"vin"`
}

func (t *BitcoinTracker) FindAndTrack(ctx context.Context, text string) (string, []int64) {
	match := btcRegex.FindString(text)
	if match == "" {
		return "", nil
	}

	cacheKey := "btc_txs_" + match
	val, err := t.redis.Get(ctx, cacheKey).Result()
	if err == nil && val != "" {
		var txs []int64
		if json.Unmarshal([]byte(val), &txs) == nil {
			return match, txs
		}
	}

	url := fmt.Sprintf("https://mempool.space/api/address/%s/txs", match)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return match, nil
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return match, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return match, nil
	}

	var mtxs []mempoolTx
	if err := json.NewDecoder(resp.Body).Decode(&mtxs); err != nil {
		return match, nil
	}

	var inbound []int64
	// Mempool returns newest first. Iterate in reverse to get chronological order for sparkline.
	for i := len(mtxs) - 1; i >= 0; i-- {
		tx := mtxs[i]
		var in int64
		for _, v := range tx.Vout {
			if v.ScriptpubkeyAddress == match {
				in += v.Value
			}
		}
		var out int64
		for _, v := range tx.Vin {
			if v.Prevout.ScriptpubkeyAddress == match {
				out += v.Prevout.Value
			}
		}

		if in > out {
			inbound = append(inbound, in-out)
		} else if in > 0 && out == 0 {
			inbound = append(inbound, in)
		}
	}

	if len(inbound) > 0 {
		b, _ := json.Marshal(inbound)
		t.redis.Set(ctx, cacheKey, string(b), 24*time.Hour)
	}

	return match, inbound
}
