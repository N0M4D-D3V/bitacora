# F03 — Canonical agents and Codex skill seeds

## Objective

Ship the canonical role definitions and the canonical Bitacora skill that all adapters and Codex consume as source of truth.

## Session scope

- Add bundled canonical markdown for `manager`, `coder`, and `reviewer`.
- Add the canonical `bitacora-cli` skill content under `.bitacora/skills/`.
- Ensure init copies these seeds into the canonical layout.
- Create the Codex-facing symlink target structure required by the spec.

## Out of scope

- Claude deny-rule merging and adapter-specific file generation details.
- OpenCode frontmatter translation.
- Global `sync` orchestration and runtime permission enforcement.

## Prior dependencies

- F01 — CLI bootstrap and packaging foundation.
- F02 — Init core and .bitacora layout.

## Related spec blocks

- `docs/spec.md` §5.1 Canonical roles
- `docs/spec.md` §7.3 Codex
- `docs/spec.md` Appendix A
- `docs/spec.md` §8 steps 6 and 7

## Assigned acceptance criteria

- `AC-INIT-01`
- `AC-ADAPT-03`

## Implementation notes / risks

- Canonical markdown should stay generic and runtime-agnostic.
- The Codex integration is skill-only in v1; do not invent custom agent files.
- Relative symlinks matter because cloned repo paths are not stable.
