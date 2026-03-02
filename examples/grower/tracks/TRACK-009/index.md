# TRACK-009

Estado: `done` (`verification`, 2026-02-27).

Resumen:
- Implementado subsistema de visualización con modos `live` y `historical`.
- Persistencia de telemetry en SQLite (candles, decisions, trades, equity, runs) con schema versionado.
- API HTTP + stream SSE + UI web Pixelart/Neobrutalism.
- UX/VIZ tuning: markers por vela apilados por tipo con color/iconografía semántica y resumen agregado en panel.
- UX/VIZ tuning adicional: markers single-event con simbolo-only (`^/v/o`) + hover label semantico (`BUY/SELL/CLOSE`).
- Detalle canónico en `conductor/tracks.md` (sección TRACK-009).
