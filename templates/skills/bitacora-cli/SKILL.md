# Bitacora CLI

Use the `bitacora` CLI for all writes to `.bitacora/memory/`.

## Purpose

Bitacora keeps project state, session history, and lessons in schema-validated files.
Agents may read those files when the runtime allows it, but every mutation must go through the CLI.

## Core Commands

- `bitacora session start`
- `bitacora session end [--close done|abandoned|blocked]`
- `bitacora current log <msg> [--agent <role>]`
- `bitacora current status <in_progress|in_review|done>`
- `bitacora current set <key=value>...`
- `bitacora current show`
- `bitacora history append --from-current`
- `bitacora history show [--last <n>] [--feature <name>]`
- `bitacora lessons add <knowledge> [--feature <name>] [--agent <role>]`
- `bitacora lessons update <id> <knowledge>`
- `bitacora lessons list [--feature <name>]`

## Agent Expectations

- Pass `--agent <role>` on commands that record agent activity when the runtime does not provide identity automatically.
- Manager-only commands reject non-manager agents with exit code `3`.
- Schema validation failures exit with code `2` and must leave files unchanged.
- Do not edit `.bitacora/harness/*` or `.bitacora/memory/*` directly.

## Workflow Guidance

- Start a session before active work when the repository flow requires it.
- Use `bitacora current log` to record meaningful progress instead of ad-hoc file edits.
- Archive the finished session through `bitacora session end` so history remains consistent.
