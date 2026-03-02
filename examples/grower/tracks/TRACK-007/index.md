# TRACK-007

Historical persistence extension for forward-only candles, executed trades, and equity snapshots with restart-safe resume behavior.

Use this track folder as the source of truth for:
- requirements and boundaries (`spec.md`)
- TDD execution order (`plan.md`)
- current track state (`metadata.json`)

Primary constraints:
- strict modular boundaries (`core` has no DB imports)
- event-driven ingestion
- no duplication on restart/resume
- query by date range
