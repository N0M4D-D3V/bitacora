# F08 — History and lessons commands

## Objective

Deliver the first user-facing history and lessons workflows on top of the validated memory store.

## Session scope

- Implement `bitacora history append --from-current`.
- Implement `bitacora history show`.
- Implement `bitacora lessons add`, `lessons update`, and `lessons list`.
- Reuse manager-only permission enforcement where required.

## Out of scope

- Search commands.
- Session lifecycle commands.
- Doctor diagnostics and adapter generation.

## Prior dependencies

- F06 — Memory storage foundation.
- F07 — Current and session flow.

## Related spec blocks

- `docs/spec.md` §6.1 history and lessons commands

## Assigned acceptance criteria

- `AC-MEM-01`
- `AC-MEM-02`
- `AC-MEM-04`

## Implementation notes / risks

- `history append --from-current` overlaps with session archival and should share logic, not fork it.
- Lessons update must preserve `id` and `date` exactly.
- JSONL rewrite behavior needs careful file replacement semantics.
