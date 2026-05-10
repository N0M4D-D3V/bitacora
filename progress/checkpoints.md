# CHECKPOINTS — Final State Evaluation

> In multi-agent systems, the path is not evaluated. The destination is.
> These are objective checkpoints that a judge (human or AI) can use
> to determine whether the project is healthy.

## C1 — The Harness Is Complete

- [ ] The base files exist: `AGENTS.md`, `feature_list.json`, `progress/current.md`.
- [ ] The 3 documentation files exist: `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.

## C2 — The State Is Consistent

- [ ] There is at most one feature with `in_progress` status in `feature_list.json`.
- [ ] Every feature marked as `done` has associated tests that pass.
- [ ] `progress/current.md` is either empty or describes the active session (it does not contain leftover content from previous sessions).

## C3 — The Code Respects the Architecture

- [ ] `src/` contains only the modules defined in `docs/architecture.md`.
- [ ] There are no unnecessary external dependencies in `package.json`.
- [ ] There are no stray `console.log()` debug statements or TODOs without context.

## C4 — Verification Is Real

- [ ] `tests/` contains at least one test for every module in `src/`.
- [ ] Tests use real temporary directories (`fs.mkdtemp`, `os.tmpdir`) instead of filesystem mocks.
- [ ] `npm test` runs more than 0 tests and all of them pass.

## C5 — The Session Was Closed Correctly

- [ ] There are no suspicious untracked files (`*.tmp`, `dist/`, `.tsbuildinfo`, etc.) outside `.gitignore`.
- [ ] `progress/history.md` contains an entry for the latest session.
- [ ] The last worked feature is reflected with the correct status.

---

## How to Use This File

A reviewer agent goes through each checkbox, marks `[x]` or `[ ]`, and rejects the session closure if any checkbox
in C1-C5 remains unchecked.
