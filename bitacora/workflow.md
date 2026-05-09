# Workflow

## Development Method
- Mandatory TDD: RED -> GREEN -> REFACTOR.
- Prefer small vertical slices with deterministic verification and temp-directory based tests.

## Implementation Rules
- Start from core behavior before CLI wiring when feasible, because most repository logic lives in parser, validator, state, compaction, and template code.
- Keep side effects isolated behind explicit interfaces such as injected clock/output callbacks and explicit root directory arguments.
- Keep tests focused, deterministic, and close to behavior, mirroring the production layout under `tests/`.
- Keep README, help text, templates, and validation behavior synchronized when command contracts change.

## Non-negotiable Session Rules
- Always read `bitacora/index.md` at the beginning of every session.
- Always update `bitacora/tracks/tracks.md` after meaningful implementation changes.
- Always update the relevant `tracks/TRACK-*/track.md` file before ending a session.
- Always write handoff updates before ending a session.

## Handoff Checklist
- What changed
- Tests run (exact commands + result)
- Current TDD phase
- Blockers or assumptions
- Single best next action
