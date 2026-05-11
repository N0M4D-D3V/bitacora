# F07 — Current and session flow

## Objective

Implement the active-session command set and role-aware current-state mutations on top of the shared memory layer.

## Session scope

- Implement `bitacora session start` and `bitacora session end`.
- Implement `bitacora current log`, `current status`, `current set`, and `current show`.
- Enforce manager-only mutations using `--agent` or `BITACORA_AGENT`.
- Archive interrupted sessions according to the state-machine rules.

## Out of scope

- Lessons CRUD and history inspection commands beyond archival from current state.
- Search behavior.
- Doctor diagnostics.

## Prior dependencies

- F06 — Memory storage foundation.

## Related spec blocks

- `docs/spec.md` §5.2 Permission matrix
- `docs/spec.md` §5.3 Session state machine
- `docs/spec.md` §6.1 session and current commands

## Assigned acceptance criteria

- `AC-MEM-03`
- `AC-MEM-04`
- `AC-SESS-01`
- `AC-SESS-02`
- `AC-SESS-03`

## Implementation notes / risks

- Rejections must preserve byte-identical target files.
- Session recovery on `start` is a key behavioral seam and needs explicit tests.
- Avoid coupling command parsing to the storage layer.
