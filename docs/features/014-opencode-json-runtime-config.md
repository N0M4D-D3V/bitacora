# F14 — OpenCode JSON runtime config and metadata split

## Objective

Move OpenCode-specific runtime policy out of canonical agent markdown frontmatter and into `opencode.json`, while keeping canonical Bitacora templates portable across Claude Code, OpenCode, and Codex.

This change exists to:

- remove OpenCode-only metadata from canonical templates
- avoid overloading the canonical YAML parser/model with runtime-specific permission syntax
- align with OpenCode's documented native configuration model (`opencode.json` / `opencode.jsonc`)
- keep Claude-specific enforcement in `.claude/settings.json`
- preserve deterministic adapter generation

## Problem Statement

Bitacora's canonical templates currently act as the source for all platforms. This worked while the shared metadata surface was small (`id`, `description`, `tools`, `model`, simple permissions).

Recent OpenCode agent templates introduced richer runtime metadata:

- `mode`
- `temperature`
- `color`
- fine-grained `permission.bash` maps like:
  - `"*": ask`
  - `"git status*": allow`

This creates two issues:

1. The current canonical parser and canonical metadata model do not support this shape.
2. The data is not actually portable across runtimes:
   - Claude Code uses generated markdown agents plus `.claude/settings.json`
   - OpenCode supports first-class JSON config in `opencode.json`
   - Codex does not consume this metadata at all

Therefore, OpenCode runtime configuration should move to `opencode.json`, and canonical markdown should retain only cross-platform semantic content plus the minimum metadata required for deterministic rendering.

## Design Goals

- Keep canonical templates portable and minimal.
- Keep OpenCode runtime behavior first-class by using its native JSON config.
- Keep Claude runtime enforcement unchanged.
- Avoid speculative cross-platform metadata.
- Preserve byte-stable semantic bodies and deterministic generated outputs.
- Reduce parser complexity and platform coupling.

## Non-Goals

- Redesigning the full canonical template system.
- Replacing `.opencode/agents/*.md` with JSON-only agents.
- Changing Claude's permission enforcement model.
- Introducing OpenCode features not explicitly used by Bitacora.
- Creating a general-purpose cross-platform permission DSL.

## External Basis

OpenCode documentation confirms:

- global/project runtime config lives in `opencode.json` / `opencode.jsonc`
- agents can be configured in JSON under `agent`
- permissions support structured maps in JSON
- markdown agents remain supported, but JSON is the native structured config channel

Claude Code remains modeled through:

- generated `.claude/agents/*.md`
- merged `.claude/settings.json`

## Canonical Source Rules After This Change

Canonical `.bitacora/agents/*.md` frontmatter must contain only portable fields required by Bitacora's shared rendering layer.

Allowed canonical fields:

- `id`
- `description`
- `tools` when truly cross-platform and still required
- `model` only if Bitacora decides it remains shared and portable
- `codex.exposeAsSkill` when needed

Canonical frontmatter must not contain OpenCode runtime-only fields:

- `mode`
- `temperature`
- `color`
- `permission`
- `permissions`
- command-pattern permission maps
- any OpenCode-only provider/model options

## What Moves To `opencode.json`

The following data must move from agent markdown metadata into generated or merged `opencode.json`:

### Agent registration

Each Bitacora OpenCode agent should be registered under:

- `agent.manager`
- `agent.coder`
- `agent.reviewer`

### Agent runtime fields

Move these fields to JSON:

- `description`
- `mode`
- `model` when the chosen model is OpenCode-specific runtime configuration
- `temperature`
- `color`
- `permission`

### Fine-grained permissions

Move all structured permission maps to JSON, especially:

- `permission.read`
- `permission.edit`
- `permission.glob`
- `permission.grep`
- `permission.bash`
- `permission.task`
- any wildcard or pattern-based permission rules

Example:

```json
{
  "agent": {
    "manager": {
      "description": "Orchestrates Bitacora sessions and delivery flow.",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.1,
      "color": "primary",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "bash": {
          "*": "ask",
          "git status*": "allow",
          "ls*": "allow"
        }
      }
    }
  }
}
```

## What Stays In `.opencode/agents/*.md`

Generated OpenCode markdown agents should remain as semantic prompt files, not as the primary place for runtime policy.

They should contain:

- the prompt/instructions body
- at most the minimal header required by OpenCode to recognize the file as an agent if Bitacora still chooses to emit markdown agents

Preferred rule:

- keep the header minimal
- do not duplicate runtime policy in both markdown and JSON unless OpenCode requires it

If OpenCode can resolve the agent from JSON plus markdown body cleanly, Bitacora should avoid duplicating permissions in markdown frontmatter.

## Output Files After This Change

OpenCode outputs should include:

- `.opencode/agents/manager.md`
- `.opencode/agents/coder.md`
- `.opencode/agents/reviewer.md`
- `.opencode/skills/bitacora-cli/SKILL.md`
- `opencode.json` or merged project-level `opencode.json` entries for Bitacora-owned agents

## Ownership and Merge Rules

Bitacora must treat `opencode.json` like Claude settings are treated today:

- preserve unrelated user configuration
- deep-merge instead of overwrite
- update only Bitacora-owned agent entries
- never delete user-defined non-Bitacora agents
- avoid clobbering unrelated config keys

### Bitacora-owned keys

Bitacora owns only:

- `agent.manager`
- `agent.coder`
- `agent.reviewer`

Bitacora must not modify:

- unrelated `agent.*` entries
- provider config
- model defaults
- commands
- plugins
- MCP config
- any unrelated root-level settings

### Merge semantics

- if `opencode.json` does not exist, create it
- if it exists, parse and merge
- preserve formatting only if practical; semantic preservation is required, formatting preservation is best-effort
- JSONC support may be added later, but v1 may target strict JSON first if needed

## Conflict Policy

If `opencode.json` already defines:

- `agent.manager`
- `agent.coder`
- `agent.reviewer`

and those entries were not previously created by Bitacora, Bitacora must fail with a clear diagnostic instead of silently overwriting them.

Rationale:

- silent overwrite would destroy user-owned OpenCode runtime configuration
- Bitacora currently has no durable ownership marker for OpenCode agent entries
- explicit failure is safer than accidental policy drift

This fail-fast behavior is acceptable for v1 and should be documented in doctor and init/sync error output once implemented.

## Rendering Rules Per Platform

### Claude Code

No change in architecture:

- `.claude/agents/*.md` remain generated from canonical content
- `.claude/settings.json` remains the runtime enforcement layer

### OpenCode

OpenCode runtime metadata is generated into `opencode.json`.
Markdown agent files keep semantic prompt content and minimal compatible headers only.

### Codex

No change.
Codex continues to use rendered skill output only.

## Implementation Constraints

- Do not expand the canonical parser just to support OpenCode-only runtime metadata.
- Prefer shrinking the canonical metadata surface over making it more expressive.
- Keep adapter generation deterministic.
- Keep doctor capable of validating OpenCode drift across both markdown and JSON outputs.

## Validation Requirements

The implementation is complete only when all of the following pass:

1. `bitacora init` succeeds with the updated templates and generated OpenCode config.
2. `bitacora sync` regenerates OpenCode markdown agents and `opencode.json` deterministically.
3. Existing user keys in `opencode.json` are preserved.
4. Bitacora updates only its owned OpenCode agent entries.
5. Claude outputs remain unchanged except where intentionally updated by this feature set.
6. Doctor detects drift in Bitacora-owned OpenCode config.
7. Canonical templates no longer require OpenCode-only runtime metadata.

## Suggested Acceptance Criteria

- `AC-OPENCFG-01` `bitacora init` generates or merges Bitacora-owned OpenCode agent config into `opencode.json`.
- `AC-OPENCFG-02` Existing unrelated `opencode.json` keys are preserved after merge.
- `AC-OPENCFG-03` Bitacora updates only `agent.manager`, `agent.coder`, and `agent.reviewer`.
- `AC-OPENCFG-04` OpenCode fine-grained permissions are represented in JSON, not canonical markdown.
- `AC-OPENCFG-05` Generated `.opencode/agents/*.md` remain semantically correct and deterministic.
- `AC-OPENCFG-06` `bitacora doctor` detects drift in Bitacora-owned OpenCode config.
- `AC-OPENCFG-07` Canonical templates reject or no longer use OpenCode-only runtime metadata.

## Migration Notes

Existing templates that currently contain:

- `mode`
- `temperature`
- `color`
- `permission`
- `permissions`

must be normalized by:

1. moving runtime config into OpenCode JSON generation
2. reducing canonical frontmatter to portable fields
3. keeping prompt body semantics intact

## Risks

- Ambiguity around how much metadata OpenCode markdown agents still require when JSON config is present.
- Potential conflict if users already define `manager`, `coder`, or `reviewer` in `opencode.json`.
- JSON vs JSONC parsing/serialization expectations.
- Doctor drift detection becomes multi-surface for OpenCode.

## Feature Breakdown

This spec should be delivered in small independent features:

1. define ownership and merge contract for `opencode.json`
2. generate OpenCode JSON config from Bitacora-owned agent definitions
3. reduce OpenCode markdown headers to minimal metadata
4. simplify canonical templates by removing OpenCode-only runtime metadata
5. add doctor drift checks for OpenCode JSON
6. add conflict handling for pre-existing user-owned OpenCode agent names
