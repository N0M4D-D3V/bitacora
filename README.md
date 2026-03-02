<div style="text-align:center;">
  <img src="images/bitacora.png" width=250 height=250/>
</div>

Bitacora is a deterministic project memory CLI for agent-driven workflows. It stores project context in files, validates structure, and keeps state rebuildable.

## Install

```bash
npm i -g bitacora
```

## Usage

Show help:

```bash
bitacora --help
```

Typical flow:

```bash
# init bitacora files structure and add SKILL
bitacora init

# ask your agent to complete bitacora
# whith your project info. You can
# complete bitacora by yourself if you wish.
codex "$bitacora read and fill bitacora template with this project info"

# plan some tasks
codex (planner )"$bitacora plan the unit test for this repo and add separated tasks to bitacora"

# use another agent
codex "$bitacora implement the 003 track"
```

Use `--root <path>` on any command to target a different project directory.

## What Each Bitacora File Stores

- `bitacora/index.md`: memory map and session read order.
- `bitacora/product.md`: project goals, scope, constraints, and non-goals.
- `bitacora/tech-stack.md`: runtime/tooling/dependencies and technical rules.
- `bitacora/workflow.md`: development method, quality gates, and handoff checklist.
- `bitacora/ux-style-guide.md`: visual tokens and UX interaction rules.
- `bitacora/tracks/tracks.md`: canonical track registry, current snapshot, and handoff summary.
- `bitacora/tracks/TRACK-*/track.md`: per-track plan, tasks, decisions, and timestamped log.
- `.agents/skills/bitacora/SKILL.md`: instructions agents follow to keep the memory system updated.

## How Agents Read and Update Bitacora

Recommended memory read order for agents:

1. `bitacora/index.md`
2. `bitacora/product.md`
3. `bitacora/tech-stack.md`
4. `bitacora/workflow.md`
5. `bitacora/ux-style-guide.md`
6. `bitacora/tracks/tracks.md`
7. Active files in `bitacora/tracks/TRACK-*/track.md`

Typical agent write operations:

- `bitacora new-track`: create a new work unit.
- `bitacora log --track-id ... --message ...`: append progress updates.
- direct updates to `bitacora/tracks/TRACK-*/track.md`: tasks, decisions, execution details.
- direct updates to `bitacora/tracks/tracks.md`: canonical project status and next action.
- `bitacora validate` and `bitacora rebuild-state`: ensure memory remains valid and deterministic.

## Agent Skill Integration

When you run `bitacora init`, Bitacora also creates an agent skill at:

```text
.agents/skills/bitacora/SKILL.md
```

This skill guides agents to keep memory updated during implementation:

- Read project memory before coding.
- Create and update tracks as work progresses.
- Log decisions and progress.
- Keep a consistent handoff summary in `bitacora/tracks/tracks.md`.

## Commands

### `bitacora init [--force] [--root <path>]`

Creates the `bitacora/` memory structure in the project root.

- `--force`: recreates memory files if they already exist.
- `--root <path>`: sets the project root (default: current directory).

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
