# Bitacora Development Guide

Internal/developer documentation for working on Bitacora CLI.

## Requirements

- Node.js 20+ (recommended)
- npm 10+

## Set Up Local Environment

```bash
npm install
```

## Local Development

Run all tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Strict type checking:

```bash
npm run typecheck
```

## Build

Compile TypeScript to `dist/`:

```bash
npm run build
```

Main output:

- `dist/src/cli.js` (CLI)
- `dist/src/index.js` (API)

## Run CLI Locally

From TypeScript (without building):

```bash
npm run start -- --help
```

From compiled output:

```bash
node dist/src/cli.js --help
```

Maintained CLI usage examples:
- `examples/cli-workflows.md`
- `examples/help-output.txt`

## Build and Use the CLI Binary Locally

The project exposes `bitacora` through `package.json#bin`, pointing to `dist/src/cli.js`.

### Option 1: Global development binary (`npm link`)

```bash
npm run build
npm link
bitacora --help
```

To remove the global link:

```bash
npm unlink -g bitacora
```

### Option 2: Installable package (`npm pack`)

```bash
npm run build
npm pack
```

Then install the generated `.tgz`:

```bash
npm install -g ./bitacora-1.1.1.tgz
bitacora --help
```

## Main Generated Structure

```text
bitacora/
  index.md
  product.md
  tech-stack.md
  workflow.md
  ux-style-guide.md
  history/
    TRACK-*.md
    tracks-*.md
  tracks/
    tracks.md
    tracks-template.md
    TRACK-001/
      track.md
.agents/
  skills/
    bitacora/
      SKILL.md
```

## New in 1.1.0: Track Compaction

### Commands

- `bitacora compact --track-id <TRACK-###> [--complete] [--dry-run]`
- `bitacora compact --all [--complete] [--dry-run]`
- `bitacora history --track-id <TRACK-###> [--show]`

### Compaction behavior

- Full source track is archived to `bitacora/history/TRACK-###.md`.
- Active `track.md` is rewritten with compact summary + metadata:
  - `completion`
  - `compacted_at`
  - `history_path`
- `bitacora/tracks/tracks.md` is regenerated in compact format.
- Previous `tracks.md` is archived as `bitacora/history/tracks-<timestamp>.md`.

### Completion gates (`--complete`)

Compaction with completion enabled requires:

- No pending checklist items in `# Tasks` (`- [ ]`).
- At least one log line containing `TEST:` in `# Log`.

If gate checks fail, command exits with code `1` and does not mutate files.

### History access model

- `history/` is not part of the default read path.
- Consumers should read archived history only when active compact context is insufficient.
- `bitacora history` without `--show` returns path metadata only.

## Internal Notes (Implementation)

- Core compaction logic: `src/core/compaction.ts`.
- CLI entrypoints: `src/commands/compact.ts` and `src/commands/history.ts`.
- Parser/validator support optional compaction frontmatter fields.
- `init` now creates `bitacora/history` and skill template includes compaction protocol.

## New in 1.1.1: Skill-only command

- New command: `bitacora skill [--root <path>]`.
- Writes/updates only:
  - `.agents/skills/bitacora/SKILL.md`
  - `skills-lock.json` entry for `bitacora`
- Preserves existing `bitacora/` memory context and other skills in the lock file.

## `bitacora --help` Contract

`src/cli.ts` must keep help text aligned with README docs, including:
- `skill` command behavior (skill-only update).
- full compaction semantics:
  - `--complete` gates (`# Tasks` done + `TEST:` in `# Log`).
  - archive/rewrite behavior (`track.md`, `history/`, `tracks.md` snapshot).
- `history` metadata mode vs `--show` full content mode.

## Pre-publish Checks

```bash
npm test
npm run typecheck
npm run build
```
