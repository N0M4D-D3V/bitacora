# F04 — Claude adapter and permissions merge

## Objective

Generate the Claude-specific adapter output from canonical sources and enforce the runtime-level deny rules required to protect harness and memory files.

## Session scope

- Generate `.claude/agents/*.md` from canonical role files.
- Create the Claude skill symlink to the canonical Bitacora skill.
- Deep-merge `.claude/settings.json` without deleting user keys.
- Deduplicate deny rules by `(tool, pattern)`.

## Out of scope

- OpenCode adapter generation.
- Cross-adapter orchestration beyond Claude-specific generation.
- Doctor reporting and init skeleton creation.

## Prior dependencies

- F03 — Canonical agents and Codex skill seeds.

## Related spec blocks

- `docs/spec.md` §7.1 Claude Code
- `docs/spec.md` §5.2 runtime enforcement layer

## Assigned acceptance criteria

- `AC-PERM-01`
- `AC-PERM-02`
- `AC-PERM-03`
- `AC-ADAPT-01`
- `AC-ADAPT-02`
- `AC-ADAPT-03`

## Implementation notes / risks

- Merge behavior must preserve unrelated user configuration exactly.
- Frontmatter translation should stay minimal and traceable back to canonical content.
- Adapter outputs must be deterministic so sync and doctor can reason about drift.
