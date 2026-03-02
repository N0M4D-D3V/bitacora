# Bitacora Index

Quick map of where to find each kind of project memory.

## Read Order (Session Start)

1. `product.md` (product goals, constraints, and scope)
2. `tech-stack.md` (runtime, dependencies, and technical rules)
3. `workflow.md` (execution process and mandatory handoff rules)
4. `ux-style-guide.md` (visual style tokens and UX constraints)
5. `tracks/tracks.md` (canonical project status and next actions)
6. `tracks/TRACK-*/track.md` (details for active or relevant tracks)

## File Index

### Root Docs
- `product.md`: what the project is, why it exists, and what is in scope.
- `tech-stack.md`: runtime, dependencies, architecture constraints, and technical rules.
- `workflow.md`: TDD process, quality gates, and mandatory handoff rules.
- `ux-style-guide.md`: colors, typography, spacing, and interaction style rules.

### `tracks/`
- `tracks/tracks.md`: canonical project status, registry, and handoff summary.
- `tracks/tracks-template.md`: template used when creating new tracks.
- `tracks/TRACK-001/track.md`: first active track created by `bitacora init`.
- `tracks/TRACK-*/track.md`: per-track execution details (overview, tasks, decisions, log).

Mandatory behavior:

- Always read this index at session start.
- Always update memory before session end.
- Always keep `tracks/tracks.md` aligned with track-level changes.
