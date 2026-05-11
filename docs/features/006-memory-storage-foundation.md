# F06 — Memory storage foundation

## Objective

Build the shared persistence layer for Bitacora memory files with schema validation, locking, and atomic write guarantees.

## Session scope

- Define schemas for `current.json`, `history.jsonl`, and `lessons.jsonl`.
- Implement parse, validate, and write helpers for each memory file.
- Add the advisory lock behavior around writes with the specified timeout.
- Ensure writes use temp-file plus rename semantics.

## Out of scope

- Implementing concrete CLI command workflows.
- Permission matrix UX and role-specific command surfaces.
- Search and diagnostic reporting.

## Prior dependencies

- F01 — CLI bootstrap and packaging foundation.

## Related spec blocks

- `docs/spec.md` §4.3 Memory files
- `docs/spec.md` §6.2 Validation & errors
- `docs/spec.md` §5.2 CLI enforcement infrastructure

## Assigned acceptance criteria

- `AC-MEM-05`
- `AC-MEM-06`
- `AC-MEM-07`

## Implementation notes / risks

- Validation failures must be non-destructive and return exit code `2`.
- Concurrency tests need real temp directories and multiple processes.
- Keep IO details at the boundary so command handlers can stay small.
