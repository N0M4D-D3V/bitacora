# Plan

## Execution Status
Pendiente de implementacion.

## TDD Plan

### RED
- Agregar integration test: restart con posicion abierta + tick tardio; verificar que no hay snapshots interpolados durante downtime.
- Agregar integration test: primer tick post-restart recalcula `unrealizedPnl/equity` contra nuevo mark price.
- Agregar test API/SSE para metadato de `resume gap` (historical + live stream).
- Agregar test UI/helper para render de indicador de gap sin ruido en chart.

### GREEN
- Implementar metadatos de resume gap en runtime/event bus/telemetry.
- Emitir evento de reanudacion al aceptar el primer tick valido post-restart.
- Exponer metadato por `VisualizationServer` (REST + SSE) y consumirlo en UI.
- Mantener invariantes actuales: sin backfill retroactivo y sin duplicados en replay.

### REFACTOR
- Consolidar tipos compartidos de resume en `src/shared/telemetry.ts`.
- Extraer helper de calculo de gap para reducir logica en `TradingEngine`.
- Revisar nomenclatura de campos para coherencia (`resume*`/`gap*`) en todo el stack.

## Verification Commands (target)
- `npm test -- --run tests/integration/history.restart-resume.test.ts tests/integration/resume-state.test.ts`
- `npm test -- --run tests/integration/visualization-server.test.ts tests/unit/telemetry-recorder.test.ts`
- `npm test -- --run`
- `npm run build`

## Assumptions / Risks
- En este MVP no se obtiene precio historico externo para el lapso apagado.
- La semantica correcta es: conservar estado, marcar gap, recalcular al primer tick nuevo.
- Debe mantenerse compatibilidad con persistencia historica file-json y telemetry SQLite.

## Next Action
Implementar RED de tests de resume gap y alinear contratos de eventos antes de tocar UI.
