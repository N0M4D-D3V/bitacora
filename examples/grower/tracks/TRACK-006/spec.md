# Spec

## Title
Config loader + CLI + LiveBroker stub + final verification

## Goal
Finalizar bootstrap de runtime por config (JSON/YAML), selección de broker y stub de live broker sin tocar el orquestador.

## Scope
- `src/app/config/loadConfig.ts`
- `src/main.ts` (`--config` + wiring)
- `src/adapters/broker/live/LiveBroker.ts`

## Acceptance Criteria
- CLI arranca con config válida.
- Selección `paper/live` por config sin cambios en engine.
- `LiveBroker` mantiene contrato con `NotImplemented` explícito.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `conductor/tracks.md`.

Extension registrada (2026-02-27):
- Config runtime extendida con `execution.maxTradesPerCandle` (entero positivo opcional).
- Wiring actualizado para propagar el valor al `TradingEngine` sin acoplar el core a adapters.
