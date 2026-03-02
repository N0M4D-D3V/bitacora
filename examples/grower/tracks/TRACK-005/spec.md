# Spec

## Title
Orchestrator + WS market adapter + trace logs

## Goal
Conectar el flujo end-to-end (`tick -> strategy -> order -> fill -> portfolio -> persist`) con trazabilidad `traceId`.

## Scope
- `TradingEngine` orquestando puertos de dominio
- `CoinbaseWsMarketDataAdapter` para feed público
- `JsonLogger` con payload estructurado y correlación

## Acceptance Criteria
- Flujo paper end-to-end determinista en integración.
- Correlación de `traceId` en logs y eventos clave.
- Adaptador WS preparado para smoke manual en entorno con red.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `conductor/tracks.md`.

Extension registrada (2026-02-27):
- El orquestador soporta `maxTradesPerCandle` para limitar ordenes `buy/sell` por vela de 1m (por simbolo).
- Cuando se supera el limite, la decision se emite como `skip` sin colocar orden.
