# Bitacora Index

Quick map of where to find each kind of project memory.

## Read Order (Session Start)

1. `product.md` (product goals, constraints, and scope)
2. `tech-stack.md` (runtime, dependencies, and technical rules)
3. `architecture.md` (module boundaries, system seams, and filesystem integration points)
4. `conventions.md` (repository-wide implementation and validation rules)
5. `workflow.md` (execution process and mandatory handoff rules)
6. `ux-style-guide.md` (CLI/documentation presentation constraints)
7. `tracks/tracks.md` (canonical project status and next actions)
8. `tracks/TRACK-*/track.md` (details for active or relevant tracks)
9. `history/` (archived detail, read only when needed)

## File Index

### Root Docs
- `product.md`: product purpose, scope, constraints, and success criteria for the Bitacora CLI.
- `tech-stack.md`: Node.js/TypeScript runtime, tooling, dependencies, and technical rules.
- `architecture.md`: CLI-to-command-to-core module shape, deterministic seams, and data flow.
- `conventions.md`: durable repository coding, testing, and documentation conventions.
- `workflow.md`: development method, validation gates, and session handoff rules.
- `ux-style-guide.md`: terminal-first output and documentation presentation guidance.

### `tracks/`
- `tracks/tracks.md`: canonical project status, registry, and handoff summary.
- `tracks/tracks-template.md`: template used when creating new tracks.
- `tracks/TRACK-001/track.md`: repository memory population track for this workspace.
- `tracks/TRACK-*/track.md`: per-track execution details (overview, tasks, decisions, log).

### `history/`
- `history/TRACK-*.md`: archived full detail after compaction.
- `history/tracks-*.md`: archived snapshots of `tracks/tracks.md`.

Mandatory behavior:

- Always read this index at session start.
- Always update memory before session end.
- Always keep `tracks/tracks.md` aligned with track-level changes.
- Read `history/` only when active context is insufficient.
