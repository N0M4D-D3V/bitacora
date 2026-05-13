# Checkpoints

> In multi-agent systems, the path is not evaluated, the destination is. These are the objective checkpoints a judge (human or AI) can use to determine whether the project is healthy.

## C1 — The harness is complete
- [ ] The base files exist: AGENTS.md, .bitacora/memory/current.json, .bitacora/harness/architecture.md, .bitacora/harness/conventions.md and .bitacora/harness/verification.md.

## C2 — The state is coherent
- [ ] At most one feature is marked as in_progress in feature_list.json.
- [ ] Every done feature has associated tests that pass.
- [ ] .bitacora/memory/current.json is empty or describes the active session (it does not contain leftovers from previous sessions).

## C3 — The code respects the architecture
- [ ] src/ only contains the modules defined in .bitacora/harness/architecture.md.
- [ ] There are no external dependencies
- [ ] There are no stray debug log statements or contextless TODOs.

## C4 — Verification is real
- [ ] tests/ contains at least one test per module in src/.
- [ ] Tests use tempfile.TemporaryDirectory(), not filesystem mocks.

## C5 — The session was closed properly
- [ ] There are no suspicious untracked files (*.tmp, __pycache__ outside .gitignore).
- [ ] .bitacora/memory/history.md contains an entry for the latest session.
- The last worked feature is reflected with the correct status.

How to use this file: a review agent goes through each section, marks [x] or [ ], and rejects session closure if any boxes in C1-C5 remain unchecked.
