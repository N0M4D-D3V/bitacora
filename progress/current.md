# Current Session

> This file is cleared at the end of every session and its contents
> are moved to `history.md`.
> While working, **keep it updated in real time**, not only at the end.

- **Current feature:** opencode_json_contract
- **Started at:** 2026-05-14
- **Agent:** developer

## Plan

- Inspect the current OpenCode adapter and nearby merge patterns.
- Add focused tests first for strict JSON parse/create and Bitacora-owned deep-merge semantics.
- Implement the minimal `opencode.json` contract helpers adjacent to `src/opencode-adapter.ts`.
- Run required validation and record the results for review.

## Logbook

- Confirmed scope with manager clarification: feature 14 covers owned-key parse/create/merge semantics only; conflict handling remains deferred to feature 19.
- Read `AGENTS.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`, and the F14 spec.
- Baseline validation before changes is green: `pnpm test:run` passed and `pnpm typecheck` passed.
- Added failing tests for strict JSON create/parse behavior and Bitacora-owned deep-merge boundaries in `src/opencode-adapter.test.ts`.
- Implemented minimal `opencode.json` contract helpers in `src/opencode-adapter.ts` for strict JSON parsing, owned-agent filtering, and deterministic deep merges.
- Focused OpenCode adapter tests are green after the helper implementation.
- Additional validation found one Biome import-order violation in `src/opencode-adapter.test.ts`; fixing it before the final validation pass.
- Review follow-up: fixing the remaining feature 14 contract gap so non-object existing `opencode.json.agent` values are rejected instead of silently replaced.
- Added a focused failing test proving `renderOpenCodeConfig` must reject a present-but-non-object `agent` value.
- Tightened `mergeBitacoraOpenCodeAgents` to throw `OpenCodeConfigError` when existing `opencode.json.agent` is not a JSON object.

## Next Step

- Rerun focused and required project validation after the contract fix.

## Review

- Verdict: changes requested.
- Validation: reviewer ran `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`; all passed.
- Scope/architecture: implementation stays within feature 14 contract work and keeps the new JSON merge logic isolated inside `src/opencode-adapter.ts` without expanding generation, doctor, or canonical-template scope.
- Blocker: `src/opencode-adapter.ts` silently coerces a non-object existing `agent` value to `{}` via `readJsonObject(existingConfig.agent)` and then writes managed entries into that replacement object. That rewrites user-owned `opencode.json.agent` data instead of failing explicitly, which violates the ownership/preservation contract for existing user configuration and leaves strict JSON shape handling incomplete.
- Actionable correction: reject invalid non-object `agent` values with `OpenCodeConfigError` (or another explicit domain error) and add a test that proves `renderOpenCodeConfig` does not clobber `opencode.json` when `agent` is present but not a JSON object.
