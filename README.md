<div style="text-align:center;">
  <img src="images/bitacora.png" width=250 height=250/>
</div>

Deterministic project memory system for agents.

Bitacora keeps project state in files (`bitacora/`), validates structure strictly, and rebuilds state reproducibly.

## Requirements

- Node.js 20+ (recommended)
- npm 10+

## Set up local environment

```bash
npm install
```

## Local development

Run the test suite:

```bash
npm test
```

Watch mode for tests:

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

## Run CLI

From TypeScript (without building):

```bash
npm run start -- --help
```

From compiled output:

```bash
node dist/src/cli.js --help
```

## Build and use the CLI binary

This project exposes the `bitacora` command through `package.json#bin`, pointing to `dist/src/cli.js`.

### Option 1: global development binary (`npm link`)

```bash
npm run build
npm link
bitacora --help
```

To remove the global link:

```bash
npm unlink -g bitacora
```

### Option 2: installable package (`npm pack`)

```bash
npm run build
npm pack
```

Then install the generated `.tgz`:

```bash
npm install -g ./bitacora-1.0.0.tgz
bitacora --help
```

## CLI commands

```bash
bitacora init [--force] [--root <path>]
bitacora new-track [trackId] [--status <status>] [--priority <priority>] [--root <path>]
bitacora validate [--json] [--root <path>]
bitacora rebuild-state [--root <path>]
bitacora log --track-id <TRACK-###> --message <text> [--root <path>]
```

## Quick flow

Initialize memory:

```bash
bitacora init --root .
```

Create a sequential track:

```bash
bitacora new-track --root .
```

Validate structure:

```bash
bitacora validate --root .
```

Add a log entry to a track:

```bash
bitacora log --track-id TRACK-001 --message "implementation completed" --root .
```

Revalidate memory and deterministic state:

```bash
bitacora rebuild-state --root .
```

## Exit codes

- `0`: successful execution
- `1`: validation error (structure or invalid input)
- `2`: unexpected runtime error

## Main generated structure

```text
bitacora/
  index.md
  product.md
  tech-stack.md
  workflow.md
  ux-style-guide.md
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

`bitacora/index.md` and `bitacora/workflow.md` include mandatory session rules (read memory at the beginning and write handoff updates at the end).

## Run everything before publishing changes

```bash
npm test
npm run typecheck
npm run build
```
