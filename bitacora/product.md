# Product

## Name
Bitacora CLI

## One-liner
Deterministic project memory CLI for agent-driven workflows, using structured Markdown files, strict validation, and rebuildable track state.

## Problem
Agent and human collaborators lose context across sessions, drift from agreed scope, and make changes that are hard to reconstruct or validate. This repository solves that by creating a fixed `bitacora/` memory layout, enforcing track structure, and providing commands that keep project state inspectable and reproducible.

## Goals
- Create and maintain a deterministic project memory structure under `bitacora/`.
- Validate memory shape and rebuild active project state from track files.
- Support common agent workflow operations such as bootstrap, track creation, logging, compaction, history lookup, and skill-only updates.

## Non-goals
- It is not a hosted collaboration service, database-backed issue tracker, or general project management platform.
- It does not manage arbitrary knowledge formats outside the repository-owned Markdown memory structure.
- It does not attempt to replace the project's primary source of truth for implementation behavior, which remains the code and tests.

## Success Criteria
- `bitacora init`, `new-track`, `log`, `validate`, `rebuild-state`, `compact`, `history`, and `skill` operate against a predictable filesystem contract.
- Validation catches malformed track structure, numbering gaps, duplicate IDs, inconsistent timestamps, and invalid compaction metadata.
- Project context can be reconstructed from `bitacora/` files without hidden runtime state.
