# Plan

## Execution Status
Plan ejecutado y track cerrado.

## TDD Summary (Executed)
- RED: tests fallando para adapter SQLite, recorder de telemetry, resampling y servidor de visualización.
- GREEN: implementación mínima para persistencia/query, emisión runtime, stream SSE y UI web base.
- REFACTOR: consolidación de contratos compartidos y wiring en `main.ts` sin romper fronteras del core.

## TDD Summary (Post-close UX/VIZ tuning, 2026-02-27)
- RED:
  - fallo por import CDN inválido de `lightweight-charts` (404 y resolución de módulo en browser).
  - tests fallando para nuevo módulo de agregación de markers (`decision-summary-marker.test.ts`).
- GREEN:
  - migración a bundle CDN standalone.
  - agregación por vela y rendering de markers apilados por tipo.
  - mapeo semántico de color/shape por tipo (`BUY/SELL/HOLD` + tipos restantes).
- REFACTOR:
  - extracción de lógica de agregación/formateo a `src/viz/ui/static/decision-summary.js`.
  - mantenimiento de resumen global inline en panel lateral.

## TDD Summary (Post-close marker label declutter, 2026-02-27)
- RED:
  - `decision-summary-marker.test.ts` falla al exigir simbolo-only para conteo `1` y metadata de hover por marker.
- GREEN:
  - markers de `BUY/SELL/CLOSE` usan `^/v/o` cuando count=`1` (sin `x1`).
  - tooltip hover en chart revela accion semantica (`BUY/SELL/CLOSE`).
- REFACTOR:
  - id estable por marker (`<bucket>:<decisionType>`) para lookup de hover sin acoplar a orden visual.

## Verification Commands Used
- `npm test -- --run tests/unit/sqlite-telemetry-store.test.ts tests/unit/resample-candles.test.ts tests/unit/telemetry-recorder.test.ts tests/integration/visualization-server.test.ts tests/unit/load-config.test.ts tests/unit/main-wiring.test.ts`
- `npm test -- --run`
- `npm run build`
- `npm test -- --run tests/unit/decision-summary-marker.test.ts`
- `npm run test:viz`
- `npm test -- --run tests/unit/decision-summary-marker.test.ts`
- `npm run build`
- manual UX verification via Chrome MCP (`/`, `HISTORY`, `LOAD HISTORY`, SSE stream + network/console checks)

## Handoff
- En sandbox restringido, el test de servidor tolera `EPERM` al bindear puerto local.
- `node:sqlite` está en modo experimental de Node 22 (warning esperado).
- Próximo paso recomendado: smoke manual en entorno con red real usando `examples/paper-btc-viz.yaml`, validando legibilidad de markers en ventanas temporales de alta densidad.
