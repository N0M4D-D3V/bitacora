# F01 — CLI bootstrap and packaging foundation

## Objective

Establish the executable TypeScript CLI foundation for Bitacora so later features can add commands without revisiting packaging, entrypoint, or template loading concerns.

## Session scope

- Create the `bitacora` binary entrypoint and command parser skeleton.
- Wire bundled template discovery so harness, agent, and skill seeds can be resolved from the distributed package.
- Define the minimal module boundaries needed for subsequent command implementations.

## Out of scope

- Implementing `init`, `sync`, `doctor`, or any memory mutation command behavior.
- Enforcing permissions, schemas, or adapter-specific file generation.
- Covering acceptance criteria from §9 beyond what is indirectly enabled by bootstrap.

## Prior dependencies

- None.

## Related spec blocks

- `docs/spec.md` §1 Overview & Goals
- `docs/spec.md` §6 CLI
- `docs/spec.md` Appendix B

## Assigned acceptance criteria

- None directly assigned. This feature exists to reduce risk and keep later slices vertical.

## Implementation notes / risks

- Keep CLI parsing separate from filesystem side effects to preserve testability.
- Template lookup must work both from source and bundled `dist/` output.
- Avoid introducing extra architecture layers before concrete command needs exist.
