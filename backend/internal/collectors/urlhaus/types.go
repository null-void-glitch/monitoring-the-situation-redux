// ©AngelaMos | 2026
// types.go

package urlhaus

type URLhausEntry struct {
	ID        string   `json:"id"`
	URLID     string   `json:"urlid"`
	URL       string   `json:"url"`
	Status    string   `json:"url_status"`
	Host      string   `json:"host"`
	DateAdded string   `json:"date_added"`
	Threat    string   `json:"threat"`
	Reporter  string   `json:"reporter"`
	Larted    string   `json:"larted"`
	Tags      []string `json:"tags"`
}

type APIResponse struct {
	QueryStatus string         `json:"query_status"`
	URLs        []URLhausEntry `json:"urls"`
}
