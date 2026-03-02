# Plan

## TDD Order (executed)
- RED: tests fallando para parseo config y selección de broker.
- GREEN: implementación mínima de loader/CLI/stub.
- REFACTOR: separación de validaciones y wiring factories.

## Verification
- `npm test -- tests/unit/load-config.test.ts tests/unit/main-wiring.test.ts tests/unit/live-broker.test.ts`
- `npm run build`

## Notes
Plan ejecutado y track cerrado. Fuente de verdad detallada: `conductor/tracks.md`.

## Post-close TDD Update (Configurable Coinbase reconnect, 2026-02-27)
- RED:
  - tests fallando para validación de `marketData.coinbase.reconnect.*` en `loadConfig`.
  - tests fallando en `main-wiring` por ausencia de wiring explícito hacia `CoinbaseWsMarketDataAdapter`.
- GREEN:
  - `RuntimeConfig` extendido con `marketData.coinbase.{url,productId,reconnect}`.
  - validación de tipos/rangos para reconnect (`enabled`, `baseDelayMs`, `maxDelayMs`, `jitterMs`).
  - wiring en `createMarketDataFromConfig` hacia `url/productId/autoReconnect/base/max/jitter`.
- REFACTOR:
  - función de wiring de market-data exportada para prueba unitaria directa y estable.
  - ejemplos de config (`config/` + `examples/`) y `examples/README.md` actualizados.

## Verification (post-close update)
- `npm test -- --run tests/unit/load-config.test.ts tests/unit/main-wiring.test.ts tests/unit/coinbase-ws-market-data-adapter.test.ts`
- `npm test -- --run`
- `npm run build`

## Post-close TDD Update 2 (Backoff algorithm extraction, 2026-02-27)
- RED:
  - test fallando para `reconnect.strategy=linear` + `reconnect.growthFactor` en cálculo de delay.
  - test fallando para validación de `marketData.coinbase.reconnect.strategy`.
  - test fallando para wiring de `strategy/growthFactor` desde config hasta adapter.
- GREEN:
  - adapter extendido con `reconnectStrategy` (`exponential|linear`) y `reconnectGrowthFactor`.
  - fórmula configurable de delay (`exponential` por defecto, `linear` opcional), respetando `maxDelayMs` + `jitterMs`.
  - `RuntimeConfig`, `loadConfig`, `main` y ejemplos actualizados para `strategy/growthFactor`.
- REFACTOR:
  - defaults y validaciones centralizados para evitar heurísticas codificadas no configurables.

## Verification (post-close update 2)
- `npm test -- --run tests/unit/coinbase-ws-market-data-adapter.test.ts tests/unit/load-config.test.ts tests/unit/main-wiring.test.ts`
- `npm test -- --run`
- `npm run build`
