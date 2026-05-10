# Code Conventions

> Extreme consistency. AI systems predict better when the repository
> looks like itself everywhere.

## TypeScript Style

- **Runtime:** Node.js 22+
- **Language:** TypeScript with `strict` mode enabled.
- **Module system:** Native ESM (`"type": "module"`).
- **Formatting:** Managed by Biome.
- **Indentation:** 2 spaces.
- **Maximum line width:** 100 characters.
- **Quotes:** Single quotes `'...'`.
- **Semicolons:** Always required.
- **Trailing commas:** ES5 style.
- **Imports:** Node built-ins first, external dependencies second,
  local modules last.
- **Path style:** Prefer relative imports inside `src/`.
- **Type safety:** No `any` unless explicitly justified.
- **Type assertions:** Avoid `as` unless there is no safer alternative.

## Tooling

### Formatting and linting

```bash
pnpm lint
pnpm format
```

Rules are enforced through biome.json.

### Type checking

```bash
pnpm typecheck
```

The project must pass TypeScript strict mode with zero errors.

### Build

```bash
pnpm Build
```

Bundling is handled by tsup.

### Tests

```bash
pnpm test
pnpm test:run
pnpm test:coverage
```

Testing is handled by Vitest using the Node environment.

## Naming Conventions

| Type                | Convention    | Example              |
| ------------------- | ------------- | -------------------- |
| Files/modules       | `kebab-case`  | `note-storage.ts`    |
| Classes             | `PascalCase`  | `NoteStorage`        |
| Functions/variables | `camelCase`   | `loadNotes`          |
| Constants           | `UPPER_SNAKE` | `DEFAULT_NOTES_PATH` |
| Types/interfaces    | `PascalCase`  | `NotePayload`        |
| Private/internal    | prefix `_`    | `_atomicWrite`       |


## File Structure

Every file in src/ should follow this structure:

```TypeScript
/**
 * One-line description of the module purpose.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { Note } from './note.js';
```

Rules:
- Imports must be grouped:
  1. Node built-ins
  2. External dependencies
  3. Local imports
- Use .js extensions in local imports for NodeNext compatibility.
- Prefer named exports over default exports.
- One primary responsibility per file.

## Tests

- Test files live next to the implementation:
  - src/foo.ts
  - tests/foo.test.ts
- One logical unit per test suite.
- Test names must describe observable behavior:
  - returnsEmptyArrayWhenFileDoesNotExist
- Tests must use real temporary directories/files:
  - fs.mkdtemp
  - os.tmpdir
- Filesystem mocking is discouraged unless strictly necessary.
- Coverage must validate behavior, not implementation details.

## Error Handling

Domain errors should extend a shared base error:

```TypeScript
export class NoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoteError';
  }
}

export class NoteNotFoundError extends NoteError {
  constructor(noteId: string) {
    super(`Note not found: ${noteId}`);
    this.name = 'NoteNotFoundError';
  }
}
```

CLI entrypoints must:

- Catch domain errors.
- Print readable messages to stderr.
- Exit with status code 1.
- Never expose raw stack traces to end users.

Unexpected runtime errors may print stack traces during development, but production-facing CLI flows must remain clean and deterministic. Because users somehow interpret stack traces as “the computer screaming”.

## Comments

Comments are discouraged by default.

They are only allowed when explaining:
- Non-obvious reasoning
- Workarounds
- Invariants
- Platform quirks
- Performance tradeoffs

Names and structure should explain everything else.

Bad:

```TypeScript
// increment i
i++;
```

Good:

```TypeScript
// Node.js keeps file handles open briefly on Windows.
// Retry avoids transient EBUSY failures during cleanup.
```

## Repository Hygiene

Before closing a session:

- pnpm typecheck passes.
- pnpm test:run passes.
- pnpm lint passes.
- pnpm build passes.
- No stray console.log.
- No unexplained TODOs.
- No temporary files committed.
- dist/ and coverage/ remain ignored.

A clean repository is part of the feature definition, not an optional bonus. A shocking concept in the JavaScript ecosystem, where half the internet ships with 19 broken postinstall scripts and a spiritually damaged node_modules.
