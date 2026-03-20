import type { TrackPriority, TrackStatus } from "../types";

export function createIndexTemplate(): string {
  return `# Bitacora Index

Quick map of where to find each kind of project memory.

## Read Order (Session Start)

1. \`product.md\` (product goals, constraints, and scope)
2. \`tech-stack.md\` (runtime, dependencies, and technical rules)
3. \`workflow.md\` (execution process and mandatory handoff rules)
4. \`ux-style-guide.md\` (visual style tokens and UX constraints)
5. \`tracks/tracks.md\` (canonical project status and next actions)
6. \`tracks/TRACK-*/track.md\` (details for active or relevant tracks)
7. \`history/\` (archived detail, read only when needed)

## File Index

### Root Docs
- \`product.md\`: what the project is, why it exists, and what is in scope.
- \`tech-stack.md\`: runtime, dependencies, architecture constraints, and technical rules.
- \`workflow.md\`: TDD process, quality gates, and mandatory handoff rules.
- \`ux-style-guide.md\`: colors, typography, spacing, and interaction style rules.

### \`tracks/\`
- \`tracks/tracks.md\`: canonical project status, registry, and handoff summary.
- \`tracks/tracks-template.md\`: template used when creating new tracks.
- \`tracks/TRACK-001/track.md\`: first active track created by \`bitacora init\`.
- \`tracks/TRACK-*/track.md\`: per-track execution details (overview, tasks, decisions, log).

### \`history/\`
- \`history/TRACK-*.md\`: archived full detail after compaction.
- \`history/tracks-*.md\`: archived snapshots of \`tracks/tracks.md\`.

Mandatory behavior:

- Always read this index at session start.
- Always update memory before session end.
- Always keep \`tracks/tracks.md\` aligned with track-level changes.
- Read \`history/\` only when active context is insufficient.
`;
}

export function createProductTemplate(): string {
  return `# Product

## Name
<project name>

## One-liner
<single sentence describing the product and core value>

## Problem
<what pain/problem this project solves>

## Goals
- <goal 1>
- <goal 2>

## Non-goals
- <out of scope 1>
- <out of scope 2>

## Success Criteria
- <measurable outcome 1>
- <measurable outcome 2>
`;
}

export function createTechStackTemplate(): string {
  return `# Tech Stack

## Runtime
- Node.js <version>
- TypeScript

## Tooling
- <test runner>
- <build tool>
- <dev runtime>

## Runtime Dependencies
- <dependency>: <why it exists>

## Core Technical Rules
- Keep core/domain modules isolated from infra adapters.
- Keep persistence and external integrations behind explicit contracts.
- Keep logs and outputs deterministic when possible.
`;
}

export function createWorkflowTemplate(): string {
  return `# Workflow

## Development Method
- Mandatory TDD: RED -> GREEN -> REFACTOR.
- Prefer small vertical slices with deterministic verification.

## Implementation Rules
- Start from domain/core behavior before adapters when feasible.
- Keep side effects isolated behind explicit interfaces.
- Keep tests focused, deterministic, and close to behavior.

## Non-negotiable Session Rules
- Always read \`bitacora/index.md\` at the beginning of every session.
- Always update \`bitacora/tracks/tracks.md\` after meaningful implementation changes.
- Always write handoff updates before ending a session.

## Handoff Checklist
- What changed
- Tests run (exact commands + result)
- Current TDD phase
- Blockers or assumptions
- Single best next action
`;
}

export function createUxStyleGuideTemplate(): string {
  return `# UX Style Guide

## Visual Tokens
- Background: <hex>
- Surface: <hex>
- Surface alt: <hex>
- Text: <hex>
- Muted text: <hex>
- Primary accent: <hex>
- Success: <hex>
- Warning: <hex>
- Error: <hex>
- Border: <hex>

## Layout / Spacing
- Base spacing unit: 4px grid.
- Panel gap: <value>.
- Panel padding: <value>.
- Header padding: <value>.

## Borders / Depth
- Border style: <width and color>.
- Shadow style: <value>.
- Effects policy: avoid visual noise; prefer crisp, readable UI.

## Typography
- Font family: <font stack>.
- Heading style: <size/weight>.
- Body style: <size/weight>.
- Label style: <size/weight/casing>.

## Components / Interaction Rules
- Buttons: <primary and secondary behavior>.
- Inputs: <states and readability constraints>.
- Data views: <tables/charts/cards style constraints>.
- Feedback states: define clear success/warning/error treatment.

## Motion / Performance
- Keep animations minimal and purposeful.
- Prefer readability and responsiveness over decoration.
- Avoid expensive full-screen effects in frequent update paths.
`;
}

export function createAgentSkillTemplate(): string {
  return `---
name: bitacora
description: Keep deterministic project memory in bitacora/ and update it continuously during implementation sessions.
version: 1.0.0
type: local
source: .agents/skills/bitacora/SKILL.md
---

# Bitacora Skill

Use this skill to keep deterministic project memory in \`bitacora/\` and to update it continuously while implementing changes.

Canonical skill file path: \`.agents/skills/bitacora/SKILL.md\`.

## Mandatory Session Protocol
- Always read \`bitacora/index.md\` at session start.
- Always read \`bitacora/product.md\`, \`bitacora/tech-stack.md\`, \`bitacora/workflow.md\`, and \`bitacora/ux-style-guide.md\` before making code changes.
- Always read \`bitacora/tracks/tracks.md\` and the active \`bitacora/tracks/TRACK-*/track.md\` files before implementation.
- Always write memory updates before ending the session.
- Do not read \`bitacora/history/\` unless needed to recover full detail.

## What To Update During Work
- Update \`bitacora/tracks/TRACK-*/track.md\` while work progresses (tasks, decisions, logs).
- Update \`bitacora/tracks/tracks.md\` after meaningful changes, including current status and next action.
- Update root docs when product/tech/workflow/ux assumptions change.
- Before closing a fully completed track, append a \`TEST:\` verification log and run \`bitacora compact --track-id <id> --complete\`.

## File Map (Where To Look)
- \`bitacora/product.md\`: scope, goals, constraints, non-goals.
- \`bitacora/tech-stack.md\`: runtime, dependencies, architecture rules.
- \`bitacora/workflow.md\`: TDD rules, handoff checklist, quality gates.
- \`bitacora/ux-style-guide.md\`: visual tokens, layout, typography, interaction style.
- \`bitacora/tracks/tracks.md\`: canonical status registry and handoff summary.
- \`bitacora/tracks/tracks-template.md\`: template for new tracks.
- \`bitacora/tracks/TRACK-*/track.md\`: per-track execution details.
- \`bitacora/history/\`: archived detail to inspect only when needed.

## Manual Bootstrap (No CLI Required)
If the CLI is unavailable, create this exact structure manually:

\`\`\`text
bitacora/
  index.md
  product.md
  tech-stack.md
  workflow.md
  ux-style-guide.md
  history/
  tracks/
    tracks.md
    tracks-template.md
    TRACK-001/
      track.md
\`\`\`

Required initial metadata for \`TRACK-001\` in \`track.md\` frontmatter:
- \`track_id: TRACK-001\`
- \`status: active\`
- \`priority: medium\`
- \`created_at\` and \`updated_at\` as ISO timestamps

Required track sections in \`track.md\`:
- \`# Overview\`
- \`# Tasks\`
- \`# Decisions\`
- \`# Log\`

## End Of Session Checklist
- Confirm \`bitacora/tracks/tracks.md\` is updated.
- Confirm active \`TRACK-*/track.md\` files include latest decisions and logs.
- Confirm compacted tracks have history in \`bitacora/history/\`.
`;
}

export function createTracksRegistryTemplate(date: string): string {
  return `# Tracks

> Canonical project status and handoff registry.
>
> Last updated: ${date}
>
> Rule: update this file after meaningful implementation changes.

## Snapshot

- Project: <project-name>
- Current status: TRACK-001 initialized
- Active tracks: TRACK-001

## Track Registry

| ID | Title | Status | Phase | Last Update | Notes |
| --- | --- | --- | --- | --- | --- |
| TRACK-001 | Bootstrap memory | active | red | ${date} | Initial track created by \`bitacora init\` |

## Session Handoff (Required)

After each substantial change, update:

1. This file (\`tracks/tracks.md\`).
2. Affected \`tracks/TRACK-*/track.md\` files.

Minimum handoff payload:
- Track(s) touched
- Tests run (exact command + result)
- Current TDD phase
- Blockers/assumptions
- Next recommended action
`;
}

export function createTracksTemplate(): string {
  return `# Tracks Template

Use this template when creating a new track.

## Header

- Track ID: \`TRACK-XYZ\`
- Title: <short title>
- Status: \`active | blocked | completed | archived\`
- Priority: \`low | medium | high\`
- Updated at: \`YYYY-MM-DDTHH:mm:ss.sssZ\`

## Overview

- Goal: <one sentence>
- Scope:
  - <item>
  - <item>
- Out of scope:
  - <item>

## Tasks

- [ ] RED: <failing test>
- [ ] GREEN: <minimal implementation>
- [ ] REFACTOR: <safe cleanup>

## Decisions

- <YYYY-MM-DD> | <decision and rationale>

## Log

- <YYYY-MM-DDTHH:mm:ss.sssZ> | <progress update>
`;
}

export function createTrackTemplate(
  trackId: string,
  status: TrackStatus,
  priority: TrackPriority,
  isoTimestamp: string
): string {
  return `---
track_id: ${trackId}
status: ${status}
priority: ${priority}
created_at: ${isoTimestamp}
updated_at: ${isoTimestamp}
---

# Overview

- Goal: <one sentence>
- Scope:
  - <item>
  - <item>

# Tasks

- [ ] RED: add failing test(s)
- [ ] GREEN: implement minimal passing behavior
- [ ] REFACTOR: improve without changing behavior

# Decisions

- ${isoTimestamp} | track created

# Log
- ${isoTimestamp} | track created
`;
}
