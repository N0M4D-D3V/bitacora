# AGENTS.md - Navigation Map for AI Agents

This is the entry point for every agent working with this repository. It is not a rulebook, just a map. Read only what you need, when you need it (progressive disclosure).

## 1. What to Do Before Starting a Session (MANDATORY)

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

## 3. How to Choose a Task

1. Open `feature_list.json`.
2. Filter tasks where `status == "pending"`.
3. Choose the task with the smallest ID.
4. Change the selected task status to `"in_progress"` and save the file.
5. Add an entry to `progress/current.md` including:
   - feature name
   - start date
   - short implementation plan

## 4. What to Do Before Ending a Session (MANDATORY)

1. Run the full test suite. All tests must pass.
2. If the task is finished, mark it as `status: "done"` inside `feature_list.json`.
3. Move the session summary from `progress/current.md` to the end of `progress/history.md`.
4. Reset `progress/current.md` and restore the template.
5. Delete all temporary files and folders created during the session.
6. Remove unnecessary debug prints and TODOs without context.

## 5. What to Do If You Get Stuck

- Re-read the relevant documentation inside `docs/`.
- If a tool is not behaving as specified, do not invent a workaround. Document the blocking issue and STOP the session.

## 6. Repository Map
| Path                    | Contents                                         | Read when                      |
|-------------------------|--------------------------------------------------|--------------------------------|
| feature_list.json       | task list with status (pending/in_progres/done)  | Always, at start               |
| progress/current.md     | current session status                           | Always, at start               |
| progress/checkpoints.md | "successfull final status" criteria              | for auto-evaluation            |
| progress/history.md     | append-only file with previous sessions          | if historic context is needed  |
| docs/architecture.md    | what means "to do a good job" in this repository | Before implementing            |
| docs/conventions.md     | style rules, naming, structure                   | Before coding                  |
| docs/verification.md    | how to verify that your job works                | Before declare a task as 'done'|
| docs/spec.md            | specification of this development                | if spec context required       |
| src/                    | app code                                         | for implementing               |
| tests/                  | automated testsuit                               | for verify                     |

