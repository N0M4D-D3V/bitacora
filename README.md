# bitacora-cli

`bitacora-cli` installs the `bitacora` command, which scaffolds and maintains
the Bitacora agent harness and memory layer for a project.

## Requirements

- Node.js 22 or newer
- `pnpm` recommended for local development

## Install

```bash
npm i -g bitacora-cli
```

```bash
pnpm add -g bitacora-cli
```

```bash
npx bitacora-cli init
```

The package name is `bitacora-cli`, but the installed command is always
`bitacora`.

## First Run

Initialize Bitacora in the current project:

```bash
bitacora init
```

Check the top-level help:

```bash
bitacora --help
```

## Command Groups

- `bitacora init`: scaffold the harness, memory files, and runtime adapters
- `bitacora session *`: start and end tracked work sessions
- `bitacora current *`: inspect and update the active session state
- `bitacora history *`: inspect and search archived sessions
- `bitacora lessons *`: add, update, list, and search reusable lessons
- `bitacora sync`: regenerate runtime adapter outputs from canonical files
- `bitacora doctor`: validate the Bitacora layout and generated artifacts

## Troubleshooting

- If `bitacora` is not found after a global install, ensure your global npm or
  pnpm bin directory is on `PATH`.
- If you use `pnpm`, `pnpm bin -g` shows the directory that must be on `PATH`.
- If you want a one-off invocation without a global install, use
  `npx bitacora-cli --help`.
