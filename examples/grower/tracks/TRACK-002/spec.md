# Spec

## Title
PaperBroker + fill model + broker contracts

## Goal
Implementar simulación de ejecución paper para órdenes market/limit con fees/slippage y contratos reutilizables por broker.

## Scope
- `FillModel` para cálculo de fill en market/limit
- `PaperBroker` con callbacks de fill y gestión de órdenes pendientes
- Suite de contrato para validar cumplimiento de `BrokerPort`

## Acceptance Criteria
- Aplicación correcta de fees/slippage en fills.
- Comportamiento determinista de limit touch/cross.
- Contratos de broker en verde.

## Notes
Track cerrado. Ver evidencia, comandos y handoff histórico en `conductor/tracks.md`.
