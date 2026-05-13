# Feature 012 — Package and publish readiness

## Goal

Prepare the CLI for the two supported installation modes without changing the
user-facing command name:

- local development install through `pnpm link`
- public npm install through the `bitacora-cli` package name

## Scope

- restore the real-CLI verification baseline before packaging changes ship
- rename the npm package to `bitacora-cli`
- keep the installed executable name as `bitacora`
- harden package metadata, exports, and shipped runtime files
- verify `pnpm pack --dry-run` output and built CLI smoke behavior
- document local linking and a manual release workflow

## Acceptance Direction

- `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and `pnpm build` pass
- the built CLI still runs as `node dist/index.js`
- `package.json` advertises `bitacora-cli` while `bin.bitacora` stays unchanged
- publish-facing docs match the final package and binary names
