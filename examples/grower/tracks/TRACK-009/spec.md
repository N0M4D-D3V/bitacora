# Spec

## Title
Visualization subsystem (live + historical) with telemetry storage

## Status
`done` (`verification`)

## Goal
Agregar visualización desacoplada del core con charting en vivo e histórico, persistiendo decisiones del bot y metadatos de sesión/ejecución con esquema migrable.

## Implemented Outcomes
- `TelemetryStorePort` + `SqliteTelemetryStore` con migración/índices y queries por rango/filtros.
- `TradingEventBus` extendido con `marketTick`, `strategyDecision`, `runStarted`, `runStopped`.
- Emisión de decisiones en `TradingEngine` (incluye clasificación `close` y `skip`).
- `TelemetryRecorder` para persistencia de candles/decisions/trades/equity/runs + stream events.
- `VisualizationServer` con endpoints históricos y stream SSE en tiempo real.
- UI web local con estilo Pixelart + Neobrutalism (dark-first, marcadores BUY/SELL/CLOSE/SKIP).
- UX/VIZ tuning: agregación de decisiones por vela con markers apilados por tipo visible (`BUY/SELL/CLOSE`) para reducir ruido visual en `live` e `historical`.
- UX/VIZ tuning: cuando el conteo por tipo en una vela es `1`, el marker usa solo simbolo (`^/v/o`) y elimina `x1`.
- Semántica visual por tipo en markers apilados:
  - `BUY`: verde + `arrowUp`
  - `SELL`: rojo + `arrowDown`
  - `CLOSE`: naranja + `circle`
- Decisiones no ejecutables (`HOLD/SKIP/CANCEL/OTHER`) se mantienen en telemetría/resumen lateral, pero no se pintan en el chart.
- Hover sobre marker muestra la accion semantica (`BUY/SELL/CLOSE`) para mantener legibilidad sin ruido textual constante.
- Resumen global de decisiones mantenido en panel lateral (`ACTIONS SUMMARY`) para lectura rápida agregada.
- Scripts CLI: `trader:start`, `viz:server`, `viz:dev`, `telemetry:migrate`, `telemetry:import-json`.

## Non-Negotiable Boundaries
- `src/core/*` sigue sin dependencias de UI/DB concretas.
- UI consume datos solo vía capa de servidor/adaptador.
- Persistencia histórica existente (`HistoryPort` file-json) se mantiene compatible.

## Acceptance Snapshot
- Datos históricos consultables por rango (`candles/decisions/trades/equity/runs`).
- Stream en vivo disponible durante ejecución del bot.
- Tests unit/integration del nuevo subsistema en verde.
