# Bitacora Development Guide

This file contains internal/developer documentation for working on Bitacora.

## Requirements

- Node.js 20+ (recommended)
- npm 10+

## Set Up Local Environment

```bash
npm install
```

## Local Development

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

## Run CLI Locally

From TypeScript (without building):

```bash
npm run start -- --help
```

From compiled output:

```bash
node dist/src/cli.js --help
```

## Build and Use the CLI Binary Locally

The project exposes the `bitacora` command through `package.json#bin`, pointing to `dist/src/cli.js`.

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
npm install -g ./bitacora-1.0.0.tgz
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

`bitacora/index.md` and `bitacora/workflow.md` include session rules for memory usage and handoff updates.

## Pre-publish Checks

```bash
npm test
npm run typecheck
npm run build
```
