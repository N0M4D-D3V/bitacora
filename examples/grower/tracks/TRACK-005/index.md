# TRACK-005

Estado: `done` (`verification`, 2026-02-25).

Resumen:
- Implementados `TradingEngine`, `JsonLogger` y `CoinbaseWsMarketDataAdapter`.
- Endurecimiento post-cierre del adapter WS: reconexión automática con backoff+jitter, re-suscripción y reciclado ante errores del feed.
- Cobertura principal en `tests/integration/engine.paper-flow.test.ts` y `tests/integration/engine.concurrent-ticks.test.ts`.
- Detalle canónico en `conductor/tracks.md` (sección TRACK-005).
