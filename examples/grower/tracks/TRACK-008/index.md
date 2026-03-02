# TRACK-008

Strategy-switch compatible state restore with shared-account continuity and strategy-tagged history metadata.

Use this track folder as the source of truth for:
- requirements and boundaries (`spec.md`)
- TDD execution order (`plan.md`)
- current track state (`metadata.json`)

Primary constraints:
- preserve account continuity (`portfolio`, `openOrders`, `lastProcessedTick`)
- reset only incompatible `strategyState`
- keep `core` free of storage-specific compatibility logic
- maintain historical dedupe and tagging semantics across strategy switches
