# Spec

## Title
Historical persistence (candles/trades/equity) with restart-safe resume

## Status
`done` (`verification`)

## Goal
Persist historical data in a queryable, modular way without coupling `core` to storage details.

## Implemented Outcomes
- `HistoryPort` added with save/query APIs.
- File-based adapter implemented: `src/adapters/history/fileJson/FileJsonHistoryAdapter.ts`.
- Event-driven ingestion implemented via `TradingEventBus`, `HistoryRecorder`, and decorators.
- `CandleAggregator` persists only closed candles.
- Replay filtering prevents duplicates on restart overlap.
- Config-driven enablement supported (`history` section in runtime config).

## Non-Negotiable Boundaries
- `src/core/*` does not import DB/storage libraries.
- `PersistencePort` (account state) and `HistoryPort` (historical data) stay separate.
- Historical persistence remains optional and swappable (future SQLite adapter).

## Data / Dedupe Rules (Current)
- Candles dedupe key: `(symbol, timeframe, close_time)`.
- Trades dedupe key: `trade_id`.
- Equity dedupe key: `(symbol, bucket_start, strategyParamsFingerprint)`.
- Range queries use `from` inclusive / `to` exclusive (UTC ISO timestamps).

## Acceptance Snapshot
- Query-by-range works for candles/trades/equity.
- Restart + overlapping ticks does not duplicate history or corrupt state.
- Coverage includes unit + integration restart/resume flow.

## Notes for Future Extensions
- SQLite adapter is deferred; preserve `HistoryPort` contract and existing tests as compatibility suite.
