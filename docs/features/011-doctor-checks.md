# F11 — Doctor checks

## Objective

Add `bitacora doctor` to inspect structural integrity, schema validity, adapter state, and stale-session conditions without mutating project data.

## Session scope

- Check required file presence.
- Validate memory file schemas.
- Detect orphan current sessions older than 24 hours.
- Verify top-level symlinks and Claude deny rules.
- Report byte sizes for history and lessons files.
- Return exit `0` only when all checks pass.

## Out of scope

- Repair or auto-fix workflows.
- New write paths or adapter generation logic.
- Search and session management behavior.

## Prior dependencies

- F06 — Memory storage foundation.
- F10 — Sync adapters.

## Related spec blocks

- `docs/spec.md` §6.4 bitacora doctor

## Assigned acceptance criteria

- `AC-DOCT-01`
- `AC-DOCT-02`
- `AC-DOCT-03`
- `AC-DOCT-04`
- `AC-DOCT-05`
- `AC-DOCT-06`

## Implementation notes / risks

- Doctor must remain read-only even when reporting severe issues.
- Drift checks should explain whether the user should run `bitacora sync`.
- Output should stay human-readable without becoming ambiguous for tests.
