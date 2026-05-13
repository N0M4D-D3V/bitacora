# Verification — How to Prove the Work Works

> Golden rule: **the agent does not say "it works", it proves it**.
> Every feature must end with executable evidence, not claims.

## Verification Levels

### Level 1 — Unit Tests (mandatory)

Every public function in `src/` must have at least one test in `tests/` that:

1. Covers the happy path.
2. Covers at least one error path if the function can fail.

Command:

```bash
npm test
```


Recommended direct Vitest command:

```bash
npx vitest run
```
```
```

### Level 2 — CLI Integration Test (mandatory for UI features)

Features that add CLI commands must be verified by running the real CLI
against a temporary file or temporary directory.

Example using Vitest, Node.js and TypeScript:
```TypeScript
import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("CLI add command", () => {
  it("adds a note using a temporary NOTES_FILE", async () => {
    const dir = await mkdtemp(join(tmpdir(), "notes-test-"));

    try {
      const env = {
        ...process.env,
        NOTES_FILE: join(dir, "notes.json"),
      };

      const { stdout } = await execFileAsync(
        "npm",
        ["run", "cli", "--", "add", "hello", "--body", "world"],
        { env },
      );

      expect(stdout).toContain("id=");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

If the project exposes the CLI differently, adapt the command but keep the rule:
run the real CLI, not an internal function pretending to be the CLI. Humanity
has suffered enough from fake integration tests.

### Level 3 — Manual Smoke Test (optional but recommended)

Before closing the session, run an end-to-end flow using a temporary file in
/tmp:

```bash

NOTES_FILE=/tmp/notes_demo.json npm run cli -- add "test" --body "x"
NOTES_FILE=/tmp/notes_demo.json npm run cli -- list
rm /tmp/notes_demo.json
```

### Anti-patterns
- ❌ "I added the command, it should work." → missing executable test.
- ❌ A test that only checks that the function does not throw. → it must check the concrete result.
- ❌ Filesystem mocks. → use real temporary directories with fs.mkdtemp and os.tmpdir.
- ❌ Marking the feature as done without passing tests 

### Final Verification Before Closing
If tests is red, do not mark anything as done. Document the blocker in progress/current.md and set the feature status to blocked in feature_list.json.
