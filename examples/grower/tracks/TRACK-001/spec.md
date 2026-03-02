# Spec

## Title
Domain models + Portfolio/Risk services

## Goal
Implementar contabilidad de portfolio (long-only MVP) y validaciones de riesgo pre-trade con tests unitarios deterministas.

## Scope
- `PortfolioService` (`applyTrade`, `markToMarket`)
- `RiskService` (`maxPositionQuantity`, `maxOpenOrders`, `maxNotionalUsd`)
- Refinamientos de dominio necesarios para sostener tests

## Acceptance Criteria
- Transiciones de PnL abiertas/parciales/cierre verificadas en unit tests.
- Reglas de riesgo bloquean órdenes inválidas de forma determinista.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `conductor/tracks.md`.
