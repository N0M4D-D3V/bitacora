# Architecture

## Purpose
- Describe how the Bitacora CLI turns a repository-local Markdown memory tree into validated project state.
- Make the boundaries between CLI wiring, command handlers, core file logic, and generated templates explicit.

## System Shape
- `src/cli.ts` is the executable entrypoint. It registers commands, help text, and runtime adapters for clock, cwd, stdout, and stderr.
- `src/commands/` contains one command handler per CLI action: `init`, `skill`, `new-track`, `log`, `validate`, `rebuild-state`, `compact`, and `history`.
- `src/core/` contains shared deterministic logic for bootstrapping memory, rendering templates, parsing track files, validating structure, compacting history, installing the agent skill, and rebuilding project state.
- `src/types/` defines shared data contracts such as track frontmatter, parsed track files, validation results, and project state.
- `src/index.ts` exposes the reusable programmatic API over core functions.
- `tests/` mirrors the production layout with focused coverage for CLI behavior, commands, core logic, and skill installation.

## Data And Filesystem Model
- The canonical memory root is `bitacora/`.
- Root context files describe product, stack, architecture, conventions, workflow, and UX/documentation guidance.
- `bitacora/tracks/tracks.md` is the registry-level snapshot.
- `bitacora/tracks/TRACK-###/track.md` stores per-track frontmatter plus `Overview`, `Tasks`, `Decisions`, and `Log` sections.
- `bitacora/history/` is reserved for archived track detail and archived registry snapshots after compaction.
- Skill installation is intentionally separate from memory bootstrapping and writes only `.agents/skills/bitacora/SKILL.md` plus `skills-lock.json`.

## Deterministic Seams
- Command handlers return numeric exit codes instead of exiting the process directly.
- Time is injected through `now()` callbacks in CLI and command tests so timestamps remain predictable.
- Output is injected through callbacks in commands and CLI tests, which keeps verification string-based and deterministic.
- Parser and compaction logic normalize CRLF to LF before interpreting Markdown.
- State rebuilding comes from validated track files, not from cached process memory.

## Change Rules
- Preserve the CLI -> command -> core separation when adding behavior.
- Keep README and `bitacora --help` semantics aligned when commands or flags change.
- Update templates, parser expectations, validator rules, and tests together when the memory contract changes.
