# F02 — Init core and .bitacora layout

## Objective

Implement the core `bitacora init` flow that creates the project skeleton, memory files, harness files, root agent entrypoint behavior, and top-level symlinks.

## Session scope

- Refuse re-initialization unless `--force` is provided.
- Support `--force` by regenerating `.bitacora/` and reusing adapter regeneration without deleting user-owned top-level runtime folders blindly.
- Materialize the `.bitacora/` directory layout, harness files, and empty memory files.
- Write `AGENTS.md` when missing and preserve it when already present.
- Create `CLAUDE.md` and `GEMINI.md` symlinks to `AGENTS.md`.
- Print the created or modified path summary.

## Out of scope

- Seeding canonical role files and the canonical skill.
- Adapter-specific generation and permission merges.
- Session, history, lessons, search, and doctor command logic.

## Prior dependencies

- F01 — CLI bootstrap and packaging foundation.

## Related spec blocks

- `docs/spec.md` §3 Filesystem Layout
- `docs/spec.md` §4.1 AGENTS.md
- `docs/spec.md` §4.2 Harness files
- `docs/spec.md` §8 steps 1, 2, 3, 4, 5, 8, 9, 11

## Assigned acceptance criteria

- `AC-INIT-01`
- `AC-INIT-02`
- `AC-INIT-03`
- `AC-INIT-04`
- `AC-INIT-05`

## Implementation notes / risks

- `--force` should call the same regeneration primitives used by adapter sync to avoid divergent behavior.
- Preserve user-authored `AGENTS.md` content exactly and surface a clear warning.
- Symlink creation must use relative targets to stay portable.
