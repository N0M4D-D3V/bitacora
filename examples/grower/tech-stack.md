# Tech Stack

## Runtime
- Node.js `>=22` (ESM)
- TypeScript

## Tooling
- `vitest` + `@vitest/coverage-v8`
- `tsx` (dev)
- `tsup` (build)

## Runtime Dependencies
- `confbox` (YAML/JSON config parsing)
- `node:sqlite` (built-in, experimental in Node 22, default telemetry storage backend)
- `ws` (optional fallback for Coinbase adapter when `globalThis.WebSocket` is unavailable)

## Core Technical Rules
- Architecture: Ports/Adapters + event-driven composition.
- State persistence: file JSON with atomic write (`tmp + rename`).
- History persistence: separate `HistoryPort` (MVP adapter is file JSON).
- Telemetry persistence/query: separate `TelemetryStorePort` (MVP adapter is SQLite).
- Logging: structured JSON with `traceId`.
- Market data provider: Coinbase public websocket.
- Broker adapters: `PaperBroker` implemented, `LiveBroker` stub.
- Visualization transport: SSE stream + REST query API (no UI dependency in `core`).

## Persistence Conventions
- Account state schema: `schemaVersion: 2` with `strategyContext`.
- Strategy compatibility key: `strategy.name + paramsFingerprint`.
- Legacy `schemaVersion: 1` state files are rejected.
- History dedupe keys:
  - candle: `(symbol, timeframe, close_time)`
  - trade: `trade_id`
  - equity: `(symbol, bucket_start, strategyParamsFingerprint)`

## Deferred / Candidate Dependencies
- Runtime config schema validator
- SQLite driver for alternative `HistoryPort` adapter
- Local vendoring/build of chart library (current UI uses CDN import for lightweight charting)
