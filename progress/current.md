# Current Session

> This file is cleared at the end of every session and its contents
> are moved to `history.md`.
> While working, **keep it updated in real time**, not only at the end.

- **Current feature:** canonical agent template frontmatter regression fix
- **Started at:** 2026-05-14
- **Agent:** developer

## Plan

- Confirm current canonical frontmatter contract and failing coverage.
- Add a regression test that parses the bundled canonical agent templates.
- Restore the edited templates to the supported portable frontmatter shape only.
- Run focused and full validation to confirm the regression is fixed.

## Logbook

- Confirmed current failures stem from unsupported template YAML lines like `"*": ask` in bundled agent templates.
- Inspecting canonical parser/tests before restoring the three templates.
- Added a regression test that parses the bundled canonical agent templates through the existing portable parser contract.
- Restored the agent template frontmatter to supported portable fields only (`id`, `description`, `tools`, `model`, `permissions.edit`).
- Restored the coder canonical body to the existing role contract expected by init/adapter tests.
- Validation green: `pnpm test:run` passed and `pnpm typecheck` passed.

## Next Step

- Add/adjust regression coverage, then restore the canonical templates and rerun validation.

## Review

- Verdict: changes requested.
- Validation: `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` all passed during review.
- In-scope fix is partially validated: `src/platform-template-renderer.test.ts` adds a regression that parses the bundled agent templates, and the current `templates/agents/{coder,manager,reviewer}.md` frontmatter parses under the portable canonical contract.
- Scope violation: `feature_list.json` adds backlog entries 14-19 and `docs/features/014-opencode-json-runtime-config.md` is a new feature spec unrelated to this regression fix. The requested review explicitly excludes implementing feature 014, so these adjacent changes must be removed from the session before approval.
