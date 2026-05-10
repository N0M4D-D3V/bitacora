# Architecture — What “Good Work” Means

> This document defines the quality standard.
> Reviewer agents evaluate code against this file.
> If it is not written here, it is not a requirement.

## Purpose

This file documents the intended architecture of the project.

Keep it updated when the structure changes. Do not let the codebase drift away
from this document, because then reviewers will have to infer intent, and that
is how repos become haunted.

## Principles

1. **Clear boundaries.** Each module must have one explicit responsibility.

2. **No accidental layers.** Do not introduce services, repositories, managers,
   adapters, registries, factories, or other architectural furniture unless
   there is a concrete reason documented in `feature_list.json`.

3. **Explicit errors.** Functions that can fail must use explicit error handling.
   Do not hide domain failures behind `null`, `undefined`, or silent fallbacks.

4. **Type safety first.** Public APIs must expose precise TypeScript types.
   Avoid `any`. Unknown data must be validated before use.

5. **IO isolation.** Filesystem, process, environment, and CLI interactions must
   stay at the edges of the system. Core logic should be easy to test without
   invoking external side effects.

6. **Deterministic behavior.** Given the same inputs, core logic should produce
   the same outputs.

## Current Module Map

| Module / Path | Responsibility | Notes |
|---------------|----------------|-------|
| `src/index.ts` | _Entry point / public API_ | _Define exported surface here._ |
| `src/...` | _TBD_ | _Add modules as the project evolves._ |

## Data Flow

```txt
user / caller
  └─→ entrypoint
        ├─→ validation
        ├─→ domain logic
        └─→ side effects at the boundary
```

Replace this section with the real flow once the project has stable modules.

## Public API Rules
- Export only what consumers need.
- Prefer named exports.
- Keep public types stable unless a feature explicitly changes them.
- Validate unknown input with zod or equivalent project-approved validation.
- Do not leak internal implementation details through exported types.

## Error Handling
- Domain errors should be named classes extending a shared base error.
- CLI-facing errors must be converted into readable messages.
- Library-facing APIs should throw typed/domain errors, not raw strings.
- Do not swallow errors silently.
- Do not use process.exit() outside CLI entrypoints.

## What NOT to Do
- Do not add dependencies casually. Every dependency must justify its existence.
- Do not mix CLI parsing, filesystem IO, and domain logic in the same module.
- Do not use console.log() for debug leftovers.
- Do not add global mutable state unless explicitly documented.
- Do not introduce configuration systems before the project actually needs one.
- Do not make tests depend on execution order.
