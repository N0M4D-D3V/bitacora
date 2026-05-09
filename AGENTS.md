# AGENTS.md - Navigation map for AI Agents

This is the entry point of every agent that works with this repository. It is not a rulebook, just a map. Read only what you need when you need it (progressive disclosure).

## 1. What to do before starting session (MANDATORY)

1. If exists, execute `./init.sh` and verify that it ends with no error. If it fails, STOP and fix environment before start your tasks.
2. Use the `bitacora` skill to understand the repository and the last session status. 

## 2. Repository map

## 3. Hard rules (MANDATORY)

- Only one feature each session. Do not mix multiple task in the same session.
- Do not declare a task as done with no green tests. Execute `./init.sh` and be sure that the test block is passing 100%.
- Write what you do using `bitacora` during the process, not at the end.
- The repository must be clean before close any session.
- If you do not know something, search at `bitacora` before invent it.

## 4. What to do before ending a session (MANDATORY)

Before ending:
1. Execute `./init.sh` -- all green.
2. If the task is ended: mark it as "done" at `bitacora`.
3. Clear the `bitacora` track history.
4. Delete all temp files/folders created during this session. Delete all unnecesary debug prints or TODOs with no context.

## 5. What to do if you get stuck

- Read again the relevant `bitacora` section/sections.
- If the tool is not doing what you spec do not invent a workaround: just document the stuck point and STOP the session.
