# AGENTS.md - Navigation Map for AI Agents

This is the entry point for every agent working with this repository. It is not a rulebook, just a map. Read only what you need, when you need it (progressive disclosure).

## 1. Session Start (MANDATORY)

1. Verify that all tests are passing and type checking completes successfully.
2. Read `progress/current.md` to understand the status of the last session.
3. Read `feature_list.json` and choose only one task with `pending` status. Do not work on more than one task at a time.

## 2. Hard Rules (MANDATORY)

- Work on only one feature per session. Do not mix multiple tasks in the same session.
- Document what you are doing inside `progress/current.md` while you work, not only at the end.
- Do not mark a task as done unless all tests are green. Run the tests and verify they pass 100%.
- Write updates in the `bitacora` during the process, not only at the end.
- The repository must be clean before closing any session.
- If you do not know something, check `docs/` before inventing a solution.

## 3. Session End (MANDATORY)

1. Run the full test suite. All tests must pass.
2. If the task is finished, mark it as `status: "done"` inside `feature_list.json`.
3. Move the session summary from `progress/current.md` to the end of `progress/history.md`.
4. Reset `progress/current.md` and restore the template.
5. Delete all temporary files and folders created during the session.
6. Remove unnecessary debug prints and TODOs without context.

## 4. If blocked

- Re-read the relevant documentation inside `docs/`.
- If a tool is not behaving as specified, do not invent a workaround. Document the blocking issue and STOP the session.

## 5. Repository map

| Path | Purpose | Read when |
|------|---------|-----------|
| `feature_list.json` | task list with status | Always, at start |
| `progress/current.md` | current session status | Always, at start |
| `progress/checkpoints.md` | final-state evaluation criteria | for auto-evaluation |
| `progress/history.md` | append-only session log | if historic context is needed |
| `docs/architecture.md` | project architecture expectations | Before implementing |
| `docs/conventions.md` | style and structure rules | Before coding |
| `docs/verification.md` | verification requirements | Before declaring done |
| `docs/spec.md` | development specification | if spec context required |
| `src/` | implementation code | for implementation |
| `tests/` | automated tests | for verification |
