// ©AngelaMos | 2026
// envelope.go

package ws

import (
	"bytes"
	"encoding/json"
	"time"
)

func EncodeEnvelope(channel string, payload []byte, traceparent string) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteString(`{"ch":`)
	chRaw, err := json.Marshal(channel)
	if err != nil {
		return nil, err
	}
	buf.Write(chRaw)
	buf.WriteString(`,"data":`)
	if len(payload) == 0 {
		buf.WriteString("null")
	} else {
		buf.Write(payload)
	}
	if traceparent != "" {
		buf.WriteString(`,"traceparent":`)
		tpRaw, _ := json.Marshal(traceparent)
		buf.Write(tpRaw)
	}
	buf.WriteString(`,"ts":`)
	tsRaw, err := json.Marshal(time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return nil, err
	}
	buf.Write(tsRaw)
	buf.WriteByte('}')
	return buf.Bytes(), nil
}
