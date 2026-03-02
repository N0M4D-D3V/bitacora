# Spec

## Title
MA strategy + deterministic fake market feed

## Goal
Proveer una strategy de referencia y un feed determinista para integración sin dependencia de red.

## Scope
- `MaCrossoverStrategy` con estado serializable
- `FakeMarketDataAdapter` con playback determinista (`playAll`)
- Tests de señales y restauración de estado

## Acceptance Criteria
- Señales deterministas para secuencias de ticks conocidas.
- Feed fake reproducible para tests de integración.
- Estado de strategy serializable/restaurable.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `conductor/tracks.md`.
