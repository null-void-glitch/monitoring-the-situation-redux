// ©AngelaMos | 2026
// handler.go

package snapshot

import (
	"encoding/json"
	"net/http"

	"github.com/carterperez-dev/monitor-the-situation/backend/internal/collectors/ransomware"
	"github.com/carterperez-dev/monitor-the-situation/backend/internal/core"
)

type Handler struct {
	store *Store
}

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	all, err := h.store.GetAll(r.Context())
	if err != nil {
		core.InternalServerError(w, err)
		return
	}

	if rwPayload, ok := all["ransomware_victim"]; ok && len(rwPayload) > 0 {
		var payload map[string]any
		if err := json.Unmarshal(rwPayload, &payload); err == nil {
			if groupName, ok := payload["group_name"].(string); ok {
				if techs, ok := ransomware.GetTactics(groupName); ok {
					payload["techniques"] = techs
					if enriched, err := json.Marshal(payload); err == nil {
						all["ransomware_victim"] = enriched
					}
				}
			}
		}
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	core.OK(w, all)
}
