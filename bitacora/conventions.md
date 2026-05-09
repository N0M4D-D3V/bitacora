# Conventions

## Purpose
- Capture durable implementation conventions used across this repository.
- Keep command behavior, generated Markdown, and tests aligned with the deterministic memory contract.

## Code Conventions
- Use TypeScript source under `src/` and keep the published output in `dist/src/` as a build artifact.
- Keep command modules narrow: parse command options, call core logic, and report exit codes/output without embedding heavy business rules.
- Keep reusable file, parser, validation, state, and compaction behavior in `src/core/`.
- Prefer explicit helper functions and straightforward control flow over framework-heavy abstractions.
- Use repository-relative paths such as `bitacora/...` in generated content and normalized forward slashes for stored paths.

## Change Conventions
- When the Bitacora memory contract changes, update the templates, README guidance, CLI help text, and validating tests together.
- Keep required track sections exactly named `Overview`, `Tasks`, `Decisions`, and `Log` so the parser and validator continue to work.
- Record durable repository rules in root Bitacora docs; record work-specific decisions and validation in track files.
- Do not mix skill-only updates with memory bootstrap behavior; that separation is part of the product contract.

## Maintenance Rule
- Validate memory-oriented changes with repository commands such as `npm run start -- validate --root <repo>` and `npm run start -- rebuild-state --root <repo>`.
- Use Vitest for regression coverage when changing source behavior, especially command help text, parser expectations, validator rules, or compaction semantics.
- Update this file only for repository-wide conventions, not one-off implementation notes.
