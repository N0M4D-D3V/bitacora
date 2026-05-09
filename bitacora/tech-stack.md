# Tech Stack

## Runtime
- Node.js `>=18` at runtime (`package.json#engines`), with Node.js 20+ recommended for development.
- TypeScript `5.8.x` compiled to CommonJS output in `dist/`.

## Tooling
- Vitest for CLI, command, parser, validator, state-builder, and skill tests.
- TypeScript compiler (`tsc -p tsconfig.build.json` and `tsc -p tsconfig.json --noEmit`) for build and typecheck.
- `tsx` for local execution of `src/cli.ts` without a build step.
- npm scripts: `build`, `typecheck`, `test`, `test:watch`, `test:unit`, and `start`.

## Runtime Dependencies
- `commander`: CLI command registration, option parsing, and help output.

## Core Technical Rules
- Keep filesystem-backed memory deterministic: structure lives under `bitacora/`, track state is derived from Markdown, and command behavior should be rebuildable from files alone.
- Keep command wiring thin in `src/commands/` and place reusable parsing, validation, compaction, and state logic in `src/core/`.
- Keep user-visible timestamps in ISO 8601 format and normalize line endings when parsing Markdown.
- Keep validation and tests deterministic by using temporary directories and injected clock/output callbacks instead of hidden global state where practical.
