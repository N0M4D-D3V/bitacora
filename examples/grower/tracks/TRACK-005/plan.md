# Plan

## TDD Order (executed)
- RED: integración fallando de flujo completo y propagación de trace.
- GREEN: implementación mínima de orquestador/logger/adapter.
- REFACTOR: extracción de helpers de eventos y tracing.

## Verification
- `npm test -- tests/unit/json-logger.test.ts tests/integration/engine.paper-flow.test.ts tests/integration/engine.concurrent-ticks.test.ts`
- `npm run build`

## Notes
Plan ejecutado y track cerrado. Fuente de verdad detallada: `conductor/tracks.md`.

## Post-close TDD Update (WS resilience hardening, 2026-02-27)
- RED:
  - `tests/unit/coinbase-ws-market-data-adapter.test.ts` fallando por ausencia de reconexión/re-suscripción tras `onclose`.
  - fallo por no reciclar conexión ante mensajes exchange `type: "error"` (`ErrSlowConsume` simulada).
- GREEN:
  - reconexión automática con backoff exponencial + jitter.
  - re-suscripción automática al canal `ticker` en cada reconexión.
  - guardas para no reconectar tras `disconnect()` explícito.
  - reciclado del socket cuando el feed devuelve `type: "error"`.
- REFACTOR:
  - centralización del estado de conexión (`connectPromise`, timer y control de intentos) sin cambiar contrato del `MarketDataPort`.

## Verification (post-close update)
- `npm test -- --run tests/unit/coinbase-ws-market-data-adapter.test.ts`
- `npm test -- --run tests/unit/coinbase-ws-market-data-adapter.test.ts tests/integration/engine.paper-flow.test.ts tests/integration/engine.concurrent-ticks.test.ts tests/unit/main-wiring.test.ts`
- `npm run build`
