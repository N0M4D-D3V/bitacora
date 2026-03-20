# Spec

## Title
File JSON persistence + resume state

## Goal
Persistir/restaurar estado de cuenta y estrategia entre ejecuciones mediante archivo JSON con reemplazo atómico.

## Scope
- Implementación de `PersistencePort` por archivo JSON
- Envelope versionado (`schemaVersion`)
- Restore de `lastProcessedTick` y `strategyState`

## Acceptance Criteria
- Roundtrip save/load sin pérdida de shape.
- Integración de resume restaura cuenta y estrategia.
- Escritura atómica documentada y probada.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `tracks/tracks.md`.
