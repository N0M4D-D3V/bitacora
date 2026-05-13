# AGENTS.md - AI Agent Navigation Map 

Entry point for every agent working in this repository. Read only the required sections when needed.

## 1. Session Start (MANDATORY)

1. Execute tests.
2. Verify zero errors.
3. If tests fails:
   - STOP.
   - Fix the environment before modifying code.
4. Read the `bitacora` skill to learn how to interact with memory, and memory flows. 
5. Read additional repository sections only when required.

## 2. Hard Rules (MANDATORY)

- Work on one feature per session.
- Do not mix unrelated tasks.
- Do not mark tasks as done without passing tests.
- Execute tests before task completion.
- All test blocks must pass.
- Update `bitacora current` continuously during the session.
- Do not postpone documentation until the end.
- Leave the repository clean before ending the session.
- Read `bitacora <history|lessons>` before making assumptions.

## 3. Session End (MANDATORY)

1. Execute tests.
2. Verify all tests pass.
3. Mark completed tasks as `done` in `bitacora current` .
4. Run `bitacora session end <--close done|abandoned|blocked>`. 
5. Delete temporary files and folders.
6. Remove debug prints.
7. Remove TODOs without explicit context.


## 4. If blocked

1. Re-read the relevant `bitacora history|lessons` sections.
2. Do not invent undocumented behavior.
3. Do not implement speculative workarounds.
4. Document the blocking point.
5. STOP the session if solution not found.

## 5. Repository map

| Path                | Purpose                | Read when        |
|---------------------|------------------------|------------------|
| `.bitacora/memory/current.json` | current session status | Always, at start |
| `.bitacora/memory/history.jsonl` | append-only session log | if historic context is needed |
| `.bitacora/memory/lessons.jsonl` | append/modify key points about this project | before read histori context |
| `.bitacora/harness/architecture.md` | project architecture expectations | Before implementing |
| `.bitacora/harness/conventions.md` | style and structure rules | Before coding |
| `.bitacora/harness/verification.md` | verification requirements | Before declaring done |
| `.bitacora/harness/checkpoints.md` | final-state evaluation criteria | for auto-evaluation |
| `src/` | implementation code | for implementation |
| `tests/` | automated tests | for verification |
