# Tracks

> Canonical handoff + requirements registry for this repository.
>
> Last updated: 2026-03-20 (manual sync after example compaction)
>
> Rule: update this file after any meaningful implementation change.

## Snapshot

- Project: `grower`
- Scope: MVP single-symbol real-time paper trading + historical persistence (`candles/trades/equity`) + strategy-switch-safe restore
- Architecture: Ports/Adapters + event-driven orchestration
- Runtime: Node.js `>=22` + TypeScript (ESM)
- Package manager: `npm`
- Current status: `TRACK-001..TRACK-003` implemented (`done`, `verification`)

Latest update (2026-03-20):

- Example trimmed to first 3 tracks to keep repository size small.
- Canonical status and references updated to match existing files only.
- No active tracks remain in this reduced example snapshot.

## Environment / Verification Baseline

1. `npm install`
2. `npm test -- --run`
3. `npm run build`
4. Optional runtime: `node dist/main.js --config config/example.paper.yaml`

## Fixed Decisions (Do Not Re-Decide Unless Scope Changes)

- MVP remains single-symbol.
- TDD required: `RED -> GREEN -> REFACTOR`.
- Core boundaries are strict:
  - `src/core/*` cannot import DB/infra specifics.
  - runtime account state persistence stays behind `PersistencePort`.
  - historical persistence stays behind `HistoryPort`.
- Persistence is file-based JSON with atomic writes (`tmp + rename`) for MVP.

## Implemented Capabilities (Condensed)

- `TRACK-001`: portfolio/risk domain services and unit coverage.
- `TRACK-002`: paper broker + fill model with contract tests.
- `TRACK-003`: file JSON account persistence + resume flow.

## Known Gaps / Manual Checks

- Broker-side risk wiring in orchestrator is pending.
- Live WS smoke test in network-enabled environment is pending.
- Manual end-to-end CLI run in network-enabled environment is pending.

## Track Registry

| ID | Title | Status | Phase | Last Update | Notes |
| --- | --- | --- | --- | --- | --- |
| TRACK-001 | Domain models + Portfolio/Risk services | done | verification | 2026-02-27 | Core accounting + risk limits |
| TRACK-002 | PaperBroker + fill model + broker contracts | done | verification | 2026-02-27 | `fill-model` + broker contract suite |
| TRACK-003 | File JSON persistence + resume state | done | verification | 2026-02-27 | Serializer v2 + atomic file writes |

## Active / Candidate Tracks

Active now:

- None in this reduced example snapshot.

Candidate backlog:

- Broker-side risk enforcement in orchestration path.
- Runtime config schema validation.
- Optional SQLite `HistoryPort` adapter (without touching `core`) to unify legacy history + telemetry paths.

## Source of Truth by Area

- Product scope: `product.md`
- Runtime/dependency/technical conventions: `tech-stack.md`
- Process and quality gates: `workflow.md`
- Per-track compact docs + metadata: `tracks/TRACK-*/`

## Session Handoff (Required)

After each substantial change, update:

1. This file (`tracks/tracks.md`): what changed, current status, gaps.
2. Affected `tracks/TRACK-*/metadata.json`: status/phase/date.
3. Relevant `TRACK-*/spec.md` or `plan.md` if requirements changed.

Minimum handoff payload:

- Track(s) touched
- Tests run (exact command + result)
- Current TDD phase
- Blockers/assumptions
- Next recommended action
