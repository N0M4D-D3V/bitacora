# Workflow

## Development Method
- Mandatory TDD: RED -> GREEN -> REFACTOR.
- Prefer small vertical slices with deterministic verification.

## Implementation Rules
- Start from domain/core behavior before adapters when feasible.
- Keep side effects isolated behind explicit interfaces.
- Keep tests focused, deterministic, and close to behavior.

## Non-negotiable Session Rules
- Always read `bitacora/index.md` at the beginning of every session.
- Always update `bitacora/tracks/tracks.md` after meaningful implementation changes.
- Always write handoff updates before ending a session.

## Handoff Checklist
- What changed
- Tests run (exact commands + result)
- Current TDD phase
- Blockers or assumptions
- Single best next action
