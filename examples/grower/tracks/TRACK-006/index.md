# TRACK-006

Estado: `done` (`verification`, 2026-02-25).

Resumen:
- Implementados `loadConfig`, CLI de `main.ts` y `LiveBroker` stub.
- Ampliación post-cierre: parámetros configurables de Coinbase WS (`url`, `productId`, política de reconnect y algoritmo de backoff) validados y cableados hasta el adapter.
- Cobertura principal en `tests/unit/load-config.test.ts`, `tests/unit/main-wiring.test.ts` y `tests/unit/live-broker.test.ts`.
- Detalle canónico en `conductor/tracks.md` (sección TRACK-006).
