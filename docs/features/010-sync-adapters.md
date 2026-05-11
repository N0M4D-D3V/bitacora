# F10 — Sync adapters

## Objective

Implement `bitacora sync` as the single command that regenerates every runtime adapter output from canonical Bitacora files.

## Session scope

- Run all registered adapters from the canonical source files.
- Keep generation deterministic and limited to adapter-managed outputs.
- Preserve unrelated files and user-owned data outside adapter targets.

## Out of scope

- Initial `.bitacora/` skeleton creation.
- Doctor drift reporting.
- Memory command behavior.

## Prior dependencies

- F04 — Claude adapter and permissions merge.
- F05 — OpenCode adapter.

## Related spec blocks

- `docs/spec.md` §6.1 bitacora sync
- `docs/spec.md` §7 Adapters

## Assigned acceptance criteria

- `AC-INIT-03`
- `AC-ADAPT-01`
- `AC-ADAPT-02`
- `AC-ADAPT-03`

## Implementation notes / risks

- Sync should reuse the same adapter code paths as init to avoid divergence.
- `bitacora init --force` should delegate adapter regeneration through this same pathway.
- Tests should assert unrelated files remain untouched.
- Relative symlink handling must stay consistent across adapters.
