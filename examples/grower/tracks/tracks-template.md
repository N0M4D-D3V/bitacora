# Tracks Template (Compact)

Use this only when creating a new active track. Keep entries short and execution-oriented.

## Header

- Track ID: `TRACK-XYZ`
- Title: `<short title>`
- Status: `planned | in-progress | blocked | review | done`
- Phase: `red | green | refactor | verification | docs`
- Owner: `<agent>`
- Last update: `YYYY-MM-DD`

## Spec (Minimal)

- Goal: `<one sentence>`
- In scope:
  - `<item>`
  - `<item>`
- Out of scope:
  - `<item>`
- Required touchpoints:
  - `src/...`
  - `tests/...`
- Acceptance criteria:
  - `<verifiable condition>`
  - `<verifiable condition>`

## Plan (TDD)

- RED:
  - `<failing test 1>`
  - `<failing test 2>`
- GREEN:
  - `<minimal implementation>`
- REFACTOR:
  - `<safe cleanup>`
- Verification commands:
  - `<command>`
  - `<command>`

## Handoff (Required)

- Tests run: `<command -> result>`
- Blockers/assumptions: `<list>`
- Next action: `<single best next step>`
- Docs updated:
  - `conductor/tracks.md`
  - `conductor/tracks/TRACK-XYZ/metadata.json`
  - `conductor/tracks/TRACK-XYZ/spec.md` or `plan.md` if needed

## Metadata JSON Template

```json
{
  "id": "TRACK-XYZ",
  "status": "planned",
  "phase": "red",
  "owner": null,
  "lastUpdated": "YYYY-MM-DD"
}
```
