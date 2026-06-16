// ©AngelaMos | 2026
// readloop.go

package coinbase

import (
	"context"
	"errors"
	"log/slog"
	"time"
)

var ErrSequenceGap = errors.New("coinbase: sequence gap detected")

type FrameHandler func(ctx context.Context, f Frame) error

func ReadLoop(
	ctx context.Context,
	conn *Conn,
	seq *Sequencer,
	handler FrameHandler,
) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		
		readCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		frame, err := conn.ReadFrame(readCtx)
		cancel()
		
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return err
		}

		switch frame.Kind {
		case FrameTypeUnknown, FrameTypeSubscriptions:
		case FrameTypeSnapshot:
			seq.Reset()
			_ = seq.Observe(frame.SequenceNum)
		case FrameTypeTicker, FrameTypeHeartbeats:
			if seq.Observe(frame.SequenceNum) {
				slog.Default().Warn("coinbase seq gap (non-fatal)",
					"channel_kind", frame.Kind,
					"seq", frame.SequenceNum,
				)
			}
		}

		if err := handler(ctx, frame); err != nil {
			return err
		}
	}
}
