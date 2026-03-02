# Tracks

> Canonical handoff + requirements registry for this repository.
>
> Last updated: 2026-02-27 (manual sync by Codex)
>
> Rule: update this file after any meaningful implementation change.

## Snapshot

- Project: `grower`
- Scope: MVP single-symbol real-time paper trading + historical persistence (`candles/trades/equity`) + strategy-switch-safe restore
- Architecture: Ports/Adapters + event-driven orchestration
- Runtime: Node.js `>=22` + TypeScript (ESM)
- Package manager: `npm`
- Current status: TRACK-001..TRACK-009 implemented (`done`, `verification`) + TRACK-010 planned (`red`)

Latest update (2026-02-27):
- Added optional execution throttle `execution.maxTradesPerCandle` (per symbol, per 1m candle bucket) in engine/config path.
- Added integration coverage for per-candle trade limit and config validation tests.
- Visualization markers now render only `buy/sell/close`; non-executable decisions remain in telemetry and side summary.
- Planned TRACK-010 for restart with open positions + downtime gap semantics (PnL/equity/history clarity).
- Marker labels now suppress `x1` clutter (single-event candles render symbol-only) and show `BUY/SELL/CLOSE` on hover.
- TDD phase: `GREEN` (new tests added and passing).
- Verification:
  - `npm test -- --run tests/integration/engine.concurrent-ticks.test.ts tests/unit/load-config.test.ts` -> pass (`13` tests)
  - `npm test -- --run tests/unit/decision-summary-marker.test.ts` -> pass (`10` tests)
  - `npm run build` -> success
  - `npm test -- --run` -> partial pass in this environment (`69` passed, `3` suites fail due to missing built-in `node:sqlite`)

## Environment / Verification Baseline

1. `npm install`
2. `npm test -- --run`
3. `npm run build`
4. Optional runtime: `node dist/main.js --config config/example.paper.yaml`

Last local verification (2026-02-27):
- `npm test -- --run`: `24` files, `72` tests, all passing
- `npm run build`: success

## Fixed Decisions (Do Not Re-Decide Unless Scope Changes)

- MVP remains single-symbol.
- TDD required: `RED -> GREEN -> REFACTOR`.
- Core boundaries are strict:
  - `src/core/*` cannot import DB/infra specifics.
  - runtime account state persistence stays behind `PersistencePort`.
  - historical persistence stays behind `HistoryPort`.
- Persistence is file-based JSON with atomic writes (`tmp + rename`) for MVP.
- Historical capture is event-driven via `candleClosed`, `tradeExecuted`, `equityUpdated`.
- Only closed candles are persisted.
- Account continuity is shared by `stateFile`.
- Strategy compatibility key is `strategy.name + paramsFingerprint`; incompatibility resets only `strategyState`.
- `schemaVersion: 1` account-state files are rejected by design.

## Implemented Capabilities (Condensed)

- Portfolio/risk domain services and unit coverage.
- Paper broker + fill model with contract tests.
- File JSON account persistence + resume flow.
- MA crossover strategy + deterministic fake feed.
- Trading engine orchestration + structured `traceId` logs.
- Coinbase WS market adapter (`globalThis.WebSocket` or `ws` fallback).
- Coinbase WS resilience hardening: auto-reconnect with exponential backoff+jitter, automatic re-subscribe, and socket recycle on exchange `type: "error"` messages.
- Config loader (`YAML`/`JSON`) + CLI wiring + `LiveBroker` stub.
- Market-data configurability extended: `marketData.coinbase.{url,productId,reconnect(enabled/base/max/jitter/strategy/growthFactor)}` wired end-to-end to runtime adapter.
- Execution guardrail added: optional `execution.maxTradesPerCandle` enforces a per-symbol 1m candle cap on placed orders (extra `buy/sell` decisions are emitted as `skip`).
- Historical persistence pipeline (`HistoryPort`, recorder, aggregator, replay filter, event decorators).
- Strategy-switch compatible restore and strategy-tagged historical records.
- Concurrent tick handling integration coverage (`engine.concurrent-ticks`).
- Telemetry persistence/query subsystem on SQLite (`candles/decisions/trades/equity/runs`).
- Visualization server with historical REST endpoints + live SSE stream + replay buffer.
- Web UI for charting (live/historical) with decision markers and status/PnL panels.
- UX hotfix: lightweight-charts CDN import switched to standalone `.mjs` bundle to avoid browser-side 404/module-resolution failures.
- UX tuning: decision markers are aggregated per candle (one summary marker per vela with per-type totals) to prevent visual clutter.
- UX tuning: per-candle markers are stacked only for executable outcomes (`BUY` green + `arrowUp`, `SELL` red + `arrowDown`, `CLOSE` orange + `circle`); `HOLD/SKIP/CANCEL/OTHER` stay off-chart.
- UX tuning: marker text for single events is symbol-only (`^/v/o`), while hover tooltip reveals the semantic action (`BUY/SELL/CLOSE`).

## Known Gaps / Manual Checks

- Broker-side risk wiring in orchestrator is still pending.
- Live WS smoke test against public feed is pending in network-enabled environment.
- Manual end-to-end CLI run in network-enabled environment is pending.
- UI depends on CDN imports for chart library in current MVP.

## Track Registry

| ID | Title | Status | Phase | Last Update | Notes |
| --- | --- | --- | --- | --- | --- |
| TRACK-001 | Domain models + Portfolio/Risk services | done | verification | 2026-02-25 | Core accounting + risk limits |
| TRACK-002 | PaperBroker + fill model + broker contracts | done | verification | 2026-02-25 | `fill-model` + broker contract suite |
| TRACK-003 | File JSON persistence + resume state | done | verification | 2026-02-25 | Serializer v2 + atomic file writes |
| TRACK-004 | MA strategy + deterministic fake market feed | done | verification | 2026-02-25 | Deterministic strategy/feed tests |
| TRACK-005 | Orchestrator + WS market adapter + trace logs | done | verification | 2026-02-27 | End-to-end flow + trace correlation + WS reconnect/backoff hardening + optional per-candle trade cap |
| TRACK-006 | Config loader + CLI + LiveBroker stub | done | verification | 2026-02-27 | Runtime composition by config + fully configurable Coinbase reconnect policy/backoff algorithm + `execution.maxTradesPerCandle` validation/wiring |
| TRACK-007 | Historical persistence + restart-safe resume | done | verification | 2026-02-26 | File history adapter + dedupe/replay safety |
| TRACK-008 | Strategy-switch compatible restore | done | verification | 2026-02-26 | Shared account continuity + strategy tagging |
| TRACK-009 | Visualization subsystem + telemetry storage | done | verification | 2026-02-27 | SQLite telemetry + SSE server + Pixel UI + CDN hotfix + marker filtering (`buy/sell/close`) + symbol-only single markers with hover action label |
| TRACK-010 | Resume-aware PnL/equity across downtime gaps | planned | red | 2026-02-27 | Define/cover restart gap semantics, emit resume metadata, reflect gap in API/SSE/UI without backfill |

## Active / Candidate Tracks

Active now:
- `TRACK-010` - Resume-aware PnL/equity handling across downtime gaps (`planned`, `red`).

Candidate backlog:
- Broker-side risk enforcement in orchestration path.
- Runtime config schema validation.
- Optional SQLite `HistoryPort` adapter (without touching `core`) to unify legacy history + telemetry paths.
- Optional decimal precision hardening if tests show drift.

## Source of Truth by Area

- Product scope: `conductor/product.md`
- Runtime/dependency/technical conventions: `conductor/tech-stack.md`
- Process and quality gates: `conductor/workflow.md`
- Per-track compact docs + metadata: `conductor/tracks/TRACK-*/`

## Session Handoff (Required)

After each substantial change, update:

1. This file (`conductor/tracks.md`): what changed, current status, gaps.
2. Affected `conductor/tracks/TRACK-*/metadata.json`: status/phase/date.
3. Relevant `TRACK-*/spec.md` or `plan.md` if requirements changed.

Minimum handoff payload:
- Track(s) touched
- Tests run (exact command + result)
- Current TDD phase
- Blockers/assumptions
- Next recommended action
