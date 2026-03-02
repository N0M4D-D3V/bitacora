# Spec

## Title
Strategy-switch compatible restore with shared-account continuity

## Status
`done` (`verification`)

## Goal
Allow strategy changes between runs without losing account continuity or breaking startup due to incompatible persisted `strategyState`.

## Implemented Outcomes
- `AccountState` upgraded to `schemaVersion: 2` with `strategyContext` metadata.
- Restore compatibility checks use `strategy.name + paramsFingerprint`.
- Incompatible `strategyState` (or `setState` failure) resets only strategy state; account state remains.
- Structured warning logs emitted on compatibility fallback.
- Historical trades/equity tagged with strategy identity/fingerprint.
- Equity dedupe supports same bucket across different strategy fingerprints.

## Non-Negotiable Rules
- Account continuity is shared per `stateFile`.
- No per-strategy state slots in MVP.
- `schemaVersion: 1` files are rejected (no auto-migration).
- `core` remains decoupled from storage-specific compatibility logic.

## Acceptance Snapshot
- Same strategy+params restores strategy state.
- Strategy or params change preserves account and resets incompatible strategy state.
- History keeps strategy tags and dedupe semantics across strategy switches.
