# Plan

## TDD Order (executed)
- RED: tests fallando de señales MA y orden de playback.
- GREEN: implementación mínima de strategy/feed.
- REFACTOR: helpers de indicadores y fixtures.

## Verification
- `npm test -- tests/unit/ma-crossover-strategy.test.ts tests/integration/fake-marketdata-adapter.test.ts`
- `npm run build`

## Notes
Plan ejecutado y track cerrado. Fuente de verdad detallada: `conductor/tracks.md`.
