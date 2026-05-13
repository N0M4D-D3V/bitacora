# bitacora-cli development

## Local setup

```bash
pnpm install
```

## Common commands

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

## Local CLI linking

Build the package before linking so the global command resolves `dist/index.js`
and bundled templates from `dist/templates`.

```bash
pnpm build
CI=true pnpm link --global .
```

From any separate test project or temporary directory:

```bash
bitacora --help
bitacora init
```

## Pre-publish checklist

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run`
- `pnpm build`
- `pnpm pack --dry-run`
- verify `node dist/index.js --help`
- verify a linked install still runs `bitacora init` in a temporary directory

## Manual release workflow

1. Update the version in `package.json`.
2. Run the full pre-publish checklist.
3. Inspect the dry-run tarball contents:

```bash
pnpm pack --dry-run
```

4. Publish to npm:

```bash
npm publish
```

## Post-publish verification

- `npm i -g bitacora-cli`
- `bitacora --help`
- `mkdir /tmp/bitacora-smoke && cd /tmp/bitacora-smoke`
- `bitacora init`

## Rollback notes

- Unpublish is time-limited on npm and can break downstream consumers.
- Prefer publishing a follow-up patch version unless the package was published
  very recently and no consumers rely on it yet.
