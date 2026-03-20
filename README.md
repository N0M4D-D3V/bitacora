Bitacora is a deterministic project memory CLI for agent-driven workflows. It stores project context in files, validates structure, and keeps state rebuildable.

## Install

```bash
npm i -g bitacora-cli
```

## Usage

Show help:

```bash
bitacora --help
```

Use `--root <path>` on any command to target a different project directory.
Command examples are available in `examples/cli-workflows.md`.

## What Each Bitacora File Stores

- `bitacora/index.md`: memory map and session read order.
- `bitacora/product.md`: project goals, scope, constraints, and non-goals.
- `bitacora/tech-stack.md`: runtime/tooling/dependencies and technical rules.
- `bitacora/workflow.md`: development method, quality gates, and handoff checklist.
- `bitacora/ux-style-guide.md`: visual tokens and UX interaction rules.
- `bitacora/tracks/tracks.md`: canonical track registry, current snapshot, and handoff summary.
- `bitacora/tracks/TRACK-*/track.md`: per-track plan, tasks, decisions, and timestamped log.
- `bitacora/history/TRACK-*.md`: archived full track detail after compaction (read on demand).
- `bitacora/history/tracks-*.md`: archived snapshots of `tracks/tracks.md`.
- `.agents/skills/bitacora/SKILL.md`: instructions agents follow to keep the memory system updated.

## Compaction Model (v1.1.0)

Bitacora now supports compacting finished tracks to reduce active context size and token usage.

### How it works

1. Keep full details while implementing.
2. When a track is fully done, compact it.
3. Bitacora writes a short version in `tracks/TRACK-xxx/track.md`.
4. Full detail is archived in `bitacora/history/TRACK-xxx.md`.
5. `bitacora/tracks/tracks.md` is regenerated in compact form.

### Completion gates for `--complete`

`bitacora compact --complete` only succeeds when:

- `# Tasks` has no unchecked checklist item (`- [ ]`).
- `# Log` contains at least one verification line with `TEST:`.

If gates fail, command exits with code `1` and no compaction is applied.

## New in v1.1.1: Skill-only update

Use `bitacora skill` to install/update only `.agents/skills/bitacora/SKILL.md` and `skills-lock.json` without recreating `bitacora/` context files.

## Typical flow

```bash
# 1) bootstrap
bitacora init

# 2) update skill only (after CLI upgrades)
bitacora skill

# 3) create work
bitacora new-track

# 4) append progress
bitacora log --track-id TRACK-001 --message "implemented parser"
bitacora log --track-id TRACK-001 --message "TEST: npm test -- --run tests/core/parser.test.ts -> pass"

# 5) compact when fully completed
bitacora compact --track-id TRACK-001 --complete

# 6) inspect archive only when needed
bitacora history --track-id TRACK-001
bitacora history --track-id TRACK-001 --show
```

## Commands

### `bitacora init [--force] [--root <path>]`

Creates the `bitacora/` memory structure in the project root.

- `--force`: recreates memory files if they already exist.
- `--root <path>`: sets the project root (default: current directory).

### `bitacora skill [--root <path>]`

Installs or updates only the Bitacora local agent skill and its lock entry.

- Updates `.agents/skills/bitacora/SKILL.md`.
- Updates `skills-lock.json` entry for `bitacora` while preserving other skills.
- Does not recreate or modify `bitacora/` project memory files.

### `bitacora new-track [trackId] [--status <status>] [--priority <priority>] [--root <path>]`

Creates a new track file. If `trackId` is omitted, Bitacora picks the next sequential ID.

- `trackId`: optional explicit track ID (example: `TRACK-010`).
- `--status <status>`: sets the initial track status.
- `--priority <priority>`: sets the initial track priority.
- `--root <path>`: sets the project root.

### `bitacora log --track-id <trackId> --message <text> [--root <path>]`

Appends a timestamped log entry to an existing track.

- `--track-id <trackId>`: required track identifier.
- `--message <text>`: required log message.
- `--root <path>`: sets the project root.

### `bitacora compact [--track-id <trackId> | --all] [--complete] [--dry-run] [--root <path>]`

Compacts tracks by summarizing content and archiving full detail.

- `--track-id <trackId>`: compact a specific track.
- `--all`: compact all eligible tracks.
- `--complete`: mark target tracks as completed (requires completion gates).
- `--dry-run`: report estimated byte/token savings without writing files.
- `--root <path>`: sets the project root.
- `--complete` gates:
  - `# Tasks` must not contain unchecked items (`- [ ]`).
  - `# Log` must include at least one `TEST:` line.
- rewrite/archive model:
  - full source track is archived under `bitacora/history/TRACK-###.md`.
  - active `tracks/TRACK-###/track.md` is rewritten into compact summary form.
  - `tracks/tracks.md` is regenerated and the previous snapshot is archived in `bitacora/history/tracks-*.md`.

Examples:

```bash
# Compact one already-completed track
bitacora compact --track-id TRACK-004

# Complete + compact in one step
bitacora compact --track-id TRACK-004 --complete

# Preview savings for all tracks
bitacora compact --all --dry-run

# Compact all completed tracks
bitacora compact --all
```

### `bitacora history --track-id <trackId> [--show] [--root <path>]`

Reads archived track history.

- `--track-id <trackId>`: required track identifier.
- `--show`: print full archived content (default prints only metadata/path).
- `--root <path>`: sets the project root.

### `bitacora --help`

`bitacora --help` includes full command details for:
- `init`, `skill`, `new-track`, `validate`, `rebuild-state`, `log`
- `compact` (flags, completion gates, output/archive model)
- `history` (metadata mode vs `--show`)

For a maintained example output, see `examples/help-output.txt`.

### `bitacora validate [--json] [--root <path>]`

Validates the Bitacora file/folder structure and reports errors.

- `--json`: prints validation output as JSON.
- `--root <path>`: sets the project root.

### `bitacora rebuild-state [--root <path>]`

Revalidates memory and confirms deterministic state can be rebuilt from tracks.

- `--root <path>`: sets the project root.

## Exit Codes

- `0`: success
- `1`: validation or input error
- `2`: unexpected runtime error

## Development

Internal development documentation is in `README-DEV.md`.
