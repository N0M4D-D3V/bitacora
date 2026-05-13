# Historical Logbook (append-only)

Every time a session is closed, its summary must be appended here.
Do not edit previous entries. Only append new entries at the end.

---

## 2026-05-12 - History and lessons commands

- **Agent:** `developer`
- **Feature:** `F08 history_lessons_commands`
- **Plan:** Review existing memory and CLI patterns, add failing acceptance-focused tests first for history/lessons flows, then implement the minimum command orchestration and validate the repository before closure.
- **Changes:**
  - Added acceptance-oriented test coverage for `history show`, `history append --from-current`, `lessons add`, `lessons update`, and `lessons list` before implementation.
  - Implemented `src/history-lessons-command.ts`, wired the CLI handlers, and kept all history/lessons mutations behind the validated memory storage boundary.
  - Updated `docs/architecture.md` to document the new command module and completed closure bookkeeping by promoting F08 to `done` and archiving this session.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (`12` files, `38` tests).
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer approved F08 before closure; no leftover temporary artifacts remained to remove.
- **Outcome:** Feature `history_lessons_commands` is reviewer-approved, revalidated during closure, and marked `done`.

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

## 2026-05-12 - Memory storage foundation

- **Agent:** `implementation developer`
- **Feature:** `F06 memory_storage_foundation`
- **Plan:** Close the reviewer-approved memory storage session by re-validating the repository, recording the final session summary, and marking the feature complete.
- **Changes:**
  - Confirmed the approved F06 implementation remains the current repository state, including the exact-path `.bitacora/.lock` storage semantics and the corresponding regression coverage.
  - Updated `feature_list.json` so F06 now reflects its final `done` status.
  - Moved the approved session summary out of `progress/current.md` into the append-only history log and reset `progress/current.md` for the next feature.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (10 files, 25 tests).
  - `pnpm lint` passed.
  - `pnpm test:coverage` passed.
  - `pnpm build` passed.
- **Outcome:** Feature `memory_storage_foundation` is reviewer-approved, revalidated during closure, and marked `done`.

---

## 2026-05-12 - Current and session flow

- **Agent:** `developer (gpt-5.4)`
- **Feature:** `F07 current_and_session_flow`
- **Plan:** Review F07 requirements, nearby CLI/storage code, and permission/session specs; add failing tests first for current/session flows and role-aware permission checks; implement the minimum command orchestration needed to pass F07 validation.
- **Changes:**
  - Added F07 acceptance-oriented tests for current/session workflows before implementation.
  - Implemented `current` and `session` command handlers plus CLI wiring and updated the architecture map for the new module.
  - Added the AC-MEM-04 blocker follow-up for `history append --from-current`, including manager-only enforcement, archival tests, and the storage-backed archival/reset flow.
- **Verification:**
  - `pnpm test:run` passed (`11` files, `33` tests).
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer approved `F07 current_and_session_flow`, including the AC-MEM-04 blocker follow-up.
- **Outcome:** Feature `current_and_session_flow` is reviewer-approved, revalidated during closure, and marked `done`.

---

## 2026-05-12 - Lexical search commands

- **Agent:** `developer`
- **Feature:** `F09 lexical_search_commands`
- **Plan:** Add acceptance-first lexical search coverage for history and lessons, fix deterministic normalization so search stays locale-independent, then revalidate the repository before closure.
- **Changes:**
  - Added failing acceptance-oriented lexical search coverage, including explicit `--semantic` rejection and a regression proving normalization does not depend on `String.prototype.toLocaleLowerCase()`.
  - Implemented the minimum history/lessons lexical search command flow in the existing command module and kept normalization locale-independent with shared lowercase matching.
  - Revalidated the approved feature during closure, promoted F09 to `done`, and archived the session summary for the next feature handoff.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (`12` files, `43` tests).
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer approved F09 before closure; no leftover temporary artifacts remained to remove.
- **Outcome:** Feature `lexical_search_commands` is reviewer-approved, revalidated during closure, and marked `done`.

---

## 2026-05-12 - Sync adapters

- **Agent:** `developer (gpt-5.4)`
- **Feature:** `F10 sync_adapters`
- **Plan:** Review the F10 sync blocker scope and existing CLI integration test pattern, make the `bitacora sync` CLI integration test self-contained so it no longer races on shared `dist/index.js`, then rerun the required validation suite before closure.
- **Changes:**
  - Investigated the approved F10 sync blocker against the existing CLI integration pattern and confirmed the shared built entrypoint was the flaky dependency during `vitest run`.
  - Updated `src/cli.test.ts` to build a per-test CLI bundle under a temporary repo-local directory, copy templates beside it, and execute that isolated entrypoint for `init` and `sync` flows.
  - Corrected the Biome formatting follow-up, revalidated the repository during closure, marked F10 as `done`, archived the session summary, and reset `progress/current.md` for the next feature.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (`12` files, `44` tests).
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer approval for F10 was already in place before closure; no leftover temporary artifacts remained to remove.
- **Outcome:** Feature `sync_adapters` is reviewer-approved, revalidated during closure, and marked `done`.

---

## 2026-05-12 - Doctor checks

- **Agent:** `developer (gpt-5.4)`
- **Feature:** `F11 doctor_checks`
- **Plan:** Define the expected `bitacora doctor` diagnostics and edge cases, add failing tests first, implement the minimum read-only doctor flow, then revalidate and close the approved session cleanly.
- **Changes:**
  - Added acceptance-oriented doctor coverage first, including the missing generated-artifact regression through the real CLI.
  - Implemented `src/doctor-command.ts`, wired the CLI command, and kept diagnostics read-only while reporting structure, schema, orphan-session, symlink, adapter-drift, deny-rule, and size failures explicitly.
  - Revalidated the approved feature during closure, marked F11 as `done`, and removed leftover local/generated artifacts before archiving this session.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm test:run` passed (`13` files, `52` tests).
  - `pnpm lint` passed.
  - `pnpm build` passed.
  - Reviewer approval for F11 was already in place before closure; no leftover temporary artifacts remained to remove.
- **Outcome:** Feature `doctor_checks` is reviewer-approved, revalidated during closure, and marked `done`.

---

## 2026-05-13 - Package and publish readiness

- **Agent:** `Codex`
- **Feature:** `F12 package_publish_readiness`
- **Plan:** Restore the built-CLI baseline, rename and harden the npm package as `bitacora-cli`, add publish-readiness coverage, and document install/link/release workflows.
- **Changes:**
  - Fixed the built entrypoint guard so `node dist/index.js` runs the CLI when invoked through relative paths.
  - Renamed the package to `bitacora-cli` while preserving the `bitacora` binary, added npm metadata, exports, Node engine metadata, and minimal publish files.
  - Aligned the pnpm workspace override with `bitacora-cli`, added isolated tarball/package metadata tests, and created `README.md` plus `README_dev.md`.
  - Verified the actual pnpm 11 local-link flow as `CI=true pnpm link --global .`; the older `pnpm link --global bitacora-cli` consumer form failed in this setup and was not documented as supported.
- **Verification:**
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm test:run` passed (`13` files, `54` tests).
  - `pnpm build` passed.
  - `pnpm pack --dry-run` included only package runtime/docs payload: `dist`, `package.json`, `README.md`, and `README_dev.md`.
  - `node dist/index.js --help` passed.
  - Global link smoke passed: `bitacora --help` and `bitacora init` ran from a temporary directory and resolved bundled templates from `dist/templates`.
- **Outcome:** Feature `package_publish_readiness` completed, verified, and marked `done`.

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
