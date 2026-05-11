# Historical Logbook (append-only)

Every time a session is closed, its summary must be appended here.
Do not edit previous entries. Only append new entries at the end.

---

## 2026-05-11 - Backlog rebuild from spec

- **Agent:** `Codex`
- **Feature:** `backlog_rebuild_from_spec`
- **Plan:** Rebuild the project backlog from `docs/spec.md`, replace the mock feature index, and map acceptance criteria to vertical features.
- **Changes:**
  - Replaced the example `feature_list.json` with a real backlog of 11 vertical features.
  - Added the referenced feature specs under `docs/features/`.
  - Preserved pre-existing edits in `docs/spec.md` and used that file as the source of truth.
- **Verification:**
  - `./node_modules/.bin/vitest run` failed because no test suites existed yet.
  - `./node_modules/.bin/tsc --noEmit` passed.
  - Verified all `docs/spec.md` acceptance criteria were assigned and every `spec_file` path existed.
- **Outcome:** Session completed and backlog artifacts were reconciled, but repository test coverage was still not established.

---

## 2026-05-11 - CLI bootstrap and packaging foundation

- **Agent:** `OpenCode`
- **Feature:** `cli_bootstrap`
- **Plan:** Bootstrap the executable CLI surface, package the binary entrypoint, and make template assets resolvable from both source and built output.
- **Changes:**
  - Added `src/cli.ts`, `src/index.ts`, and `src/template-resolver.ts` to define the minimal command tree, public entrypoint, and template lookup logic.
  - Added `templates/bootstrap.txt`, packaged the `bitacora` binary in `package.json`, and copied template assets into `dist/templates` during build.
  - Added CLI, template, package, and built-entrypoint tests; updated `docs/architecture.md` to reflect the new module map.
  - Repaired dependency state with `CI=true pnpm install` and fixed validation blockers in `biome.json` and `tsconfig.json` so lint and DTS build could pass.
- **Verification:**
  - `npm run test:run` passed with 4 tests.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run build` passed.
  - Built CLI help verified through `src/index.test.ts` by executing `node dist/index.js --help`.
- **Outcome:** Feature `cli_bootstrap` completed and marked `done`.

---

## 2026-05-11 - Init core and .bitacora layout

- **Agent:** `OpenCode`
- **Feature:** `init_core_layout`
- **Plan:** Implement the `bitacora init` core filesystem flow, covering first-time initialization, refusal without `--force`, regeneration with `--force`, AGENTS preservation, and root symlink creation.
- **Changes:**
  - Added `src/init-command.ts` and `src/bitacora-error.ts`, then wired the `init` CLI action through the existing command tree.
  - Added bundled template assets for `AGENTS.md`, harness files, placeholder canonical agent files, and the placeholder Bitacora skill.
  - Added CLI integration coverage in `src/init-command.test.ts` for empty-dir init, re-init refusal, AGENTS preservation, force regeneration, and relative symlink targets.
  - Updated `docs/architecture.md` with the new init and error modules and adjusted the build copy step for repeated test-triggered builds.
- **Verification:**
  - `npm run test:run` passed with 8 tests.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run build` passed.
- **Outcome:** Feature `init_core_layout` completed and marked `done`.

---

## 2026-05-11 - Canonical agents and Codex skill seeds

- **Agent:** `OpenCode / gpt-5.4`
- **Feature:** `canonical_agents_and_codex_skill`
- **Plan:** Replace the placeholder canonical role and skill seeds, then extend `bitacora init` so Codex receives the canonical skill through a portable relative symlink.
- **Changes:**
  - Replaced the placeholder bundled templates for `manager`, `coder`, and `reviewer` with canonical role markdown aligned to the spec's responsibilities and permission boundaries.
  - Replaced the placeholder `templates/skills/bitacora-cli/SKILL.md` with a canonical Bitacora CLI skill that instructs runtimes to use the CLI for memory writes.
  - Extended `src/init-command.ts` to create `.agents/skills/bitacora-cli/`, create the Codex relative symlink on init, recreate that generated symlink on `init --force`, and only warn on allowed `EEXIST` preserve cases for root aliases.
  - Extended `src/init-command.test.ts` to verify canonical seed content, the Codex relative symlink target, and the `init --force` regeneration path through the built CLI.
- **Verification:**
  - `pnpm vitest run src/init-command.test.ts` passed.
  - `pnpm test:run` passed.
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm build` passed.
- **Outcome:** Feature `canonical_agents_and_codex_skill` completed and marked `done`.

---

## 2026-05-11 - Claude adapter and permissions merge

- **Agent:** `implementation developer`
- **Feature:** `4 claude_adapter_permissions`
- **Plan:** Review Claude adapter spec and init flow, add failing tests for Claude generation and permissions merge, then implement the minimal adapter path and validate fully.
- **Changes:**
  - Added a dedicated Claude adapter module and wired `bitacora init` to regenerate Claude outputs from canonical files.
  - Implemented canonical frontmatter translation for Claude agent files, including `allowed-tools`, while preserving canonical body content.
  - Added and updated test coverage for Claude agent generation, skill symlink creation, and settings merge semantics; updated the architecture module map.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed.
  - `pnpm lint` passed.
  - `pnpm build` passed.
- **Outcome:** Feature `claude_adapter_permissions` was reviewer-approved, validated again during closure, and marked `done`.

---

## 2026-05-11 - OpenCode adapter

- **Agent:** `implementation developer`
- **Feature:** `5 opencode_adapter`
- **Plan:** Confirm the OpenCode adapter contract and output path, add failing adapter tests first, implement the minimum shared adapter orchestration needed by init, and validate the repository before review.
- **Changes:**
  - Added OpenCode adapter generation under `.opencode/agents/` and registered it through the shared adapter set used by init.
  - Extracted shared canonical agent markdown parsing so Claude and OpenCode adapters translate from the same deterministic source.
  - Added the spec-shaped `src/adapters/opencode.ts` surface with `{ name, generate, clean }`, updated adapter and init tests, and brought `docs/architecture.md` back in sync.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (9 files, 17 tests).
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer final re-review approved feature 5 after the adapter-contract fix.
- **Outcome:** Feature `opencode_adapter` completed, revalidated during closure, and marked `done`.

---

## YYYY-MM-DD — Session Title

- **Agent:** _agent name or identifier_
- **Feature:** _feature name or ID_
- **Plan:** _short summary of the intended work_
- **Changes:**
  - _created/modified files_
  - _important implementation details_
  - _architectural or technical decisions_
- **Verification:**
  - _tests executed_
  - _typecheck/build status_
  - _verification results_
- **Outcome:** _final session state and feature status_

---
