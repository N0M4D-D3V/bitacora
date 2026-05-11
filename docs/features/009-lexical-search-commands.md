# F09 — Lexical search commands

## Objective

Provide simple, deterministic lexical search over lessons and history while explicitly rejecting semantic search in v1.

## Session scope

- Implement `bitacora history search`.
- Implement `bitacora lessons search`.
- Make substring matching case-insensitive.
- Accept `--semantic` and fail with the specified exit code and message.

## Out of scope

- Any embedding, ranking, or external search system.
- New memory mutations.
- Doctor reporting.

## Prior dependencies

- F08 — History and lessons commands.

## Related spec blocks

- `docs/spec.md` §6.3 Search
- `docs/spec.md` §6.1 history search and lessons search

## Assigned acceptance criteria

- `AC-SEARCH-01`
- `AC-SEARCH-02`
- `AC-SEARCH-03`

## Implementation notes / risks

- Search results should be emitted as JSON arrays to keep the interface scriptable.
- Match targets differ between history and lessons and should be normalized in one place.
- Do not quietly ignore `--semantic`; it must fail with exit code `5`.
