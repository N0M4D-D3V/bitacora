# Grower Viz UI Style Guide (Pixelart + Neobrutalism)

## Visual Tokens
- Background: `#0b0f1a`
- Panel: `#121826`
- Panel alt: `#0f1522`
- Text: `#f2f5ff`
- Muted: `#8fa2c1`
- Buy: `#00d084`
- Sell: `#ff4d4f`
- Close: `#ffd166`
- Skip/Hold: `#5dade2`
- Border: `#f2f5ff`

## Layout / Spacing
- Base spacing: 4px grid.
- Primary panel gap: 12px.
- Panel padding: 12px.
- Header padding: 12x16px.

## Borders / Depth
- Border width: 3px solid.
- Hard shadow only: `4px 4px 0 #000`.
- No blur, no glass effects.
- No soft gradients (flat colors first).

## Typography
- Monospace stack only.
- Heading: 22px bold.
- Panel titles: 14px uppercase.
- Labels: 12px uppercase.

## Marker Rules
- BUY: green arrow up.
- SELL: red arrow down.
- CLOSE: yellow circle.
- SKIP/HOLD: blue square.
- Marker encoding uses color + shape for accessibility.

## Motion / Performance
- Minimal transitions only.
- No per-tick decorative animations.
- Prefer incremental chart updates over full redraws.
- Prioritize readability and event latency over ornament.
