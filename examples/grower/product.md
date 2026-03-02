# Product

## Name
Grower

## One-liner
Modular algo-trading MVP for single-symbol real-time paper trading with restart-safe account persistence and decoupled historical persistence.

## Problem
Need a minimal but robust trading runtime to validate strategies with traceability and continuity across executions, without coupling early to a live broker.

## MVP Goals
- Run one strategy on one symbol with real-time public market data.
- Simulate paper broker execution (fees/slippage, simple fills).
- Persist/restore account and strategy state via file JSON.
- Keep broker swappable by config (`PaperBroker` now, `LiveBroker` stub).
- Preserve `traceId` correlation across the full flow.

## Extended Capabilities (Implemented)
- Forward-only historical persistence for closed candles, trades, and equity snapshots.
- Range queries for historical data (analytics-ready, UI-decoupled).
- Restart overlap safety (no duplicate history on resume).
- Strategy-switch compatibility:
  - shared account continuity by `stateFile`
  - reset only incompatible `strategyState`
  - strategy fingerprint tagging in history
- Visualization subsystem:
  - real-time chart mode (live stream during bot execution)
  - historical chart mode (deterministic range queries from persisted telemetry)
  - persisted bot decisions (`buy/sell/close/skip`) with strategy/session metadata

## Non-goals (Current MVP)
- Multi-symbol trading
- Historical backfill/replay after downtime
- Real live trading execution
- Advanced order types beyond simple market/limit
- Visualization logic inside core/orchestrator

## Success Criteria
- Deterministic tests cover end-to-end flow.
- Restart/restore works without state corruption.
- Broker swap via config requires no orchestrator changes.
- Historical persistence/query works without violating clean boundaries.
