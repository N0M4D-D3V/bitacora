# Spec

## Title
Resume-aware PnL/equity handling across downtime gaps

## Status
`planned` (`red`)

## Goal
Eliminar ambiguedad de PnL/equity cuando el bot se detiene con posiciones abiertas y luego reanuda tras un lapso sin datos.

## In Scope
- Definir contrato explicito para estado restaurado: que campos se heredan vs que campos se recalculan al primer tick nuevo.
- Modelar la nocion de `resume gap` (tiempo entre `state.updatedAt` y primer tick aceptado tras restart).
- Registrar metadatos de resume para historico/telemetria (sin inventar candles ni equity intermedio).
- Ajustar UI/servidor para exponer claramente que existe un hueco temporal y evitar inferencias de continuidad.
- Cobertura integration + unit del flujo restart/resume con posicion abierta.

## Out of Scope
- Backfill historico desde exchange/proveedor externo durante downtime.
- Repricing retroactivo tick-a-tick del lapso apagado.
- Cambios de arquitectura fuera de ports/adapters actuales.

## Required Touchpoints
- `src/app/orchestrator/TradingEngine.ts`
- `src/app/history/EventEmittingPersistenceDecorator.ts`
- `src/app/history/HistoryRecorder.ts`
- `src/app/history/TradingEventBus.ts`
- `src/app/telemetry/TelemetryRecorder.ts`
- `src/viz/server/VisualizationServer.ts`
- `src/viz/ui/static/app.js`
- `tests/integration/history.restart-resume.test.ts`
- `tests/integration/resume-state.test.ts`

## Acceptance Criteria
- En restart con posicion abierta, el estado inicial restaurado se conserva sin recalculo retroactivo del lapso apagado.
- Al primer tick post-restart se recalculan `unrealizedPnl` y `equity` con mark-to-market actual.
- Se persiste un evento/metadato de resume gap (`resumeStartedAt`, `firstTickAfterResumeAt`, `gapMs`) consultable por API/SSE.
- UI refleja el hueco temporal (indicador de resume gap) y no sugiere continuidad artificial de PnL/equity durante el lapso sin datos.
- Tests nuevos/actualizados en verde para esta casuistica.
