# F05 — OpenCode adapter

## Objective

Add the OpenCode adapter so canonical role definitions can be consumed by a second runtime without changing the canonical source files.

## Session scope

- Confirm the output path and frontmatter shape required by OpenCode v1.
- Generate `.opencode/agent/*.md` from the canonical role files.
- Register the adapter in the shared adapter registry used by init and sync.

## Out of scope

- Claude permission merges.
- Codex-specific skill handling beyond existing canonical sources.
- Search, memory, and doctor features.

## Prior dependencies

- F03 — Canonical agents and Codex skill seeds.
- F04 — Claude adapter and permissions merge.

## Related spec blocks

- `docs/spec.md` §7.2 OpenCode
- `docs/spec.md` §7.4 Adding a new adapter

## Assigned acceptance criteria

- `AC-ADAPT-01`
- `AC-ADAPT-02`
- `AC-ADAPT-03`

## Implementation notes / risks

- The spec explicitly asks to verify OpenCode output details at implementation time.
- Keep adapter registration simple; avoid building a plugin system for v1.
- Generation should remain deterministic and based only on canonical files.
