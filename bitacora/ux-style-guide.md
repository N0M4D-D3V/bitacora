# UX Style Guide

## Visual Tokens
- Background: host terminal or Markdown renderer background; the project does not own a fixed application canvas.
- Surface: plain text output and repository Markdown documents.
- Surface alt: fenced code blocks and tables used in README/help examples.
- Text: default terminal/document foreground with high contrast.
- Muted text: secondary explanatory copy in Markdown, never essential command results.
- Primary accent: backticked commands, paths, and flags for scanability.
- Success: concise pass/output lines such as validation success messages.
- Warning: explicit guardrails for destructive or invalid workflow states.
- Error: stderr output and validation failures with actionable wording.
- Border: Markdown separators, tables, and section headings rather than visual chrome.

## Layout / Spacing
- Base spacing unit: use short sections, one blank line between blocks, and compact CLI output rather than pixel-based spacing rules.
- Panel gap: not applicable in the product UI; favor short sections and single blank lines in Markdown.
- Panel padding: not applicable; CLI output should stay dense and readable.
- Header padding: not applicable; use concise headings and ordered command sections.

## Borders / Depth
- Border style: no owned border system; structure comes from Markdown headings, code fences, and tables.
- Shadow style: none.
- Effects policy: avoid visual noise; prefer crisp, readable UI.

## Typography
- Font family: host terminal monospace for CLI output; repository/renderer defaults for Markdown docs.
- Heading style: short Markdown headings that match command or topic names.
- Body style: concise prose with emphasis on commands, paths, and deterministic behavior.
- Label style: lowercase CLI command names and explicit option flags such as `--root` and `--track-id`.

## Components / Interaction Rules
- Buttons: not applicable; interaction is command-line driven.
- Inputs: commands and flags should remain explicit, descriptive, and copyable from docs/examples.
- Data views: favor Markdown tables and bullet lists for status snapshots, registry data, and examples.
- Feedback states: define clear success/warning/error treatment.

## Motion / Performance
- Keep animations minimal and purposeful.
- Prefer readability and responsiveness over decoration.
- Avoid noisy output; emit only the information needed to understand command results and next steps.
