# Workflow

## Development Method
- Mandatory TDD: `RED -> GREEN -> REFACTOR`.
- Prefer vertical slices (failing test -> minimal implementation -> cleanup).

## Implementation Rules
- Start in domain/services before adapters where feasible.
- No logic in adapters without explicit port/contract.
- Keep `src/core/*` free of DB/storage imports.
- Propagate `traceId` through relevant runtime flow.
- Integration tests should use deterministic components when possible.

## Quality Gates
- Unit + integration tests green.
- Build green.
- Account persistence includes portfolio/open orders/PnL/strategy state/last tick.
- Broker selection remains config-driven (no orchestrator branching by concrete adapter).
- Historical pipeline guarantees range queries + dedupe on restart overlap.
- Telemetry pipeline guarantees persisted decisions + run/session metadata.
- Visualization API contracts (`history` endpoints + live stream) remain deterministic under tests.

## Handoff Rules
- Update `tracks/tracks.md` after meaningful changes.
- Update affected `TRACK-*/metadata.json`.
- Record tests run and current TDD phase.
- Record blockers/assumptions and the single best next step.
