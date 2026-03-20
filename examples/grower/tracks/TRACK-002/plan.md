# Plan

## TDD Order (executed)
- RED: tests de pricing/fees, touch/cross y contrato de broker.
- GREEN: implementación mínima de `FillModel` + `PaperBroker`.
- REFACTOR: separación de políticas de fill y estado interno del broker.

## Verification
- `npm test -- tests/unit/fill-model.test.ts tests/unit/paper-broker.contract.test.ts`
- `npm run build`

## Notes
Plan ejecutado y track cerrado. Fuente de verdad detallada: `tracks/tracks.md`.
