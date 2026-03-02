# Plan

## Execution Status
Plan executed and track closed.

## TDD Summary (Executed)
- RED: failing tests for history save/query, dedupe, replay filtering, restart/resume.
- GREEN: minimal implementation of `HistoryPort` adapter + event pipeline + replay filter.
- REFACTOR: helper extraction and wiring cleanup while preserving boundaries.

## Verification Commands Used
- `npm test -- tests/unit/file-json-history-adapter.test.ts tests/unit/history-components.test.ts tests/integration/history.restart-resume.test.ts tests/unit/load-config.test.ts`
- `npm test -- tests/unit/main-wiring.test.ts`
- `npm test -- --run`
- `npm run build`

## Handoff
- Keep `TradingEngine` mostly composition-driven; avoid DB logic in `core`.
- If adding SQLite, do not break existing `HistoryPort` tests.
