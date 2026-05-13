# Bitácora Platform Header Layer Specification (Revised)

## Purpose

Implement a thin platform-header compatibility layer on top of the existing Bitácora template generation system.

This specification does not redesign the existing generation flow.

The only required responsibility of this layer is:

> Transform canonical Bitácora templates into platform-compatible files by parsing canonical metadata, removing canonical frontmatter, rendering the correct platform-specific header, and preserving the semantic body exactly.

Target platforms:

- codex
- claude-code
- opencode

The semantic meaning of skills/subagents must remain equivalent across platforms.

---

# Core Architectural Decision

Bitácora already duplicates files physically per platform.

This behavior remains unchanged.

The new compatibility layer introduces:

1. Platform-specific static header templates
2. A minimal deterministic renderer
3. Validation before generation

The renderer must:

1. Parse canonical template frontmatter
2. Remove canonical frontmatter from the semantic body
3. Render the platform-specific header
4. Concatenate:

```txt
<platform-header>

<semantic-body>
```

The semantic body must remain byte-preserved after canonical frontmatter removal.

---

# Important Constraint

The compatibility layer must NOT prepend headers to the raw original file directly.

Canonical templates may already contain frontmatter.

Incorrect behavior:

```txt
<platform-header>
<canonical-frontmatter>
<body>
```

Correct behavior:

```txt
<platform-header>

<body-without-canonical-frontmatter>
```

---

# Scope

## In scope

- Platform-specific headers
- Platform-specific output paths
- Static header templates
- Minimal rendering logic
- Validation
- Snapshot tests

## Out of scope

- Redesigning Bitácora
- Replacing duplicated files
- Introducing symlink systems
- Introducing migration/versioning logic
- Creating platform-specific semantic bodies
- General-purpose template engines
- Inventing unsupported metadata

---

# Static Header Template System

## Goal

Avoid scattering platform conditionals across the codebase.

Instead, define static reusable header templates.

Example structure:

```txt
/templates/
  /headers/
    /codex/
      skill.yml
    /claude-code/
      skill.yml
      subagent.yml
    /opencode/
      skill.yml
      subagent.yml
```

These files define ONLY the YAML frontmatter structure.

Example:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

The renderer performs safe placeholder substitution.

---

# Renderer Responsibilities

The renderer must:

- Parse canonical frontmatter
- Validate required fields
- Remove canonical frontmatter
- Select the correct static header template
- Replace placeholders safely
- Omit unsupported or undefined fields
- Validate rendered YAML
- Concatenate rendered header + semantic body

The renderer must NOT:

- Rewrite semantic bodies
- Inject platform-specific prompt logic
- Invent fields
- Change semantic meaning

---

# Canonical Template Model

Canonical frontmatter is metadata input only.

It is NOT preserved in generated output.

Example canonical file:

```md
---
id: verifier
description: Use when independently verifying whether an implementation satisfies the requested requirements.
tools:
  - Read
  - Grep
---

# Verifier

Verify the result against the original requirements.
```

The renderer extracts:

```yaml
id: verifier
description: ...
tools:
  - Read
  - Grep
```

And preserves ONLY:

```md
# Verifier

Verify the result against the original requirements.
```

As the semantic body.

---

# Platform Rules

# 1. Codex

## Codex Skills

Output path:

```txt
.agents/skills/<id>/SKILL.md
```

Header template:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

Rules:

- Only emit:
  - name
  - description
- Do not emit unsupported fields
- File name must be SKILL.md
- Skill folder basename must match frontmatter name

---

## Codex Agents/Subagents

Codex skills are NOT equivalent to delegable subagents.

Therefore:

- Agents/subagents must NOT automatically become Codex skills.
- Rendering agents/subagents as skills must be explicit.

Supported strategies:

```ts
type CodexAgentStrategy =
  | "skip"
  | "render-as-skill";
```

Recommended default:

```ts
"skip"
```

Optional canonical metadata:

```yaml
codex:
  exposeAsSkill: true
```

Only when explicitly enabled may a Codex agent/subagent generate:

```txt
.agents/skills/<id>/SKILL.md
```

Using:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

---

# 2. Claude Code

## Claude Skills

Output path:

```txt
.claude/skills/<id>/SKILL.md
```

Header template:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

Rules:

- Keep header minimal
- Do not emit unsupported fields
- Do not emit empty fields

---

## Claude Agents/Subagents

Output path:

```txt
.claude/agents/<id>.md
```

Base header template:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

Optional fields:

```yaml
tools: "{{tools}}"
model: "{{model}}"
```

Rules:

- Use tools, not allowed-tools
- tools must serialize as comma-separated text
- Only emit tools if explicitly configured
- Only emit model if explicitly configured
- Do not emit speculative Claude fields

Example:

```yaml
---
name: "verifier"
description: "Use when independently verifying whether an implementation satisfies the requested requirements."
tools: "Read, Grep"
---
```

---

# 3. OpenCode

## OpenCode Skills

Output path:

```txt
.opencode/skills/<id>/SKILL.md
```

Header template:

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

Rules:

- Do not emit compatibility unless explicitly required
- Do not emit metadata.source unless explicitly required
- Keep the header minimal

---

## OpenCode Agents/Subagents

Output path:

```txt
.opencode/agents/<id>.md
```

Base header template:

```yaml
---
description: "{{description}}"
mode: subagent
---
```

Optional permission block:

```yaml
permission:
  edit: "{{editPermission}}"
  bash: "{{bashPermission}}"
```

Rules:

- Do not emit name
- Filename is the agent name
- Do not default bash to deny automatically
- Only emit permission if Bitácora already has explicit permission data
- Avoid restrictive defaults that break CLI workflows

Recommended minimal output:

```yaml
---
description: "{{description}}"
mode: subagent
---
```

---

# Static Header Template Examples

## codex/skill.yml

```yaml
---
name: "{{id}}"
description: "{{description}}"
---
```

---

## claude-code/subagent.yml

```yaml
---
name: "{{id}}"
description: "{{description}}"
{{#if tools}}
tools: "{{tools}}"
{{/if}}
{{#if model}}
model: "{{model}}"
{{/if}}
---
```

---

## opencode/subagent.yml

```yaml
---
description: "{{description}}"
mode: subagent
{{#if permission}}
permission:
  edit: "{{permission.edit}}"
  bash: "{{permission.bash}}"
{{/if}}
---
```

---

# Renderer API

```ts
type Platform =
  | "codex"
  | "claude-code"
  | "opencode";

type TemplateKind =
  | "skill"
  | "agent"
  | "subagent";

interface CanonicalTemplate {
  id: string;
  description: string;
  body: string;
  metadata?: {
    model?: string;
    tools?: string[];
    permissions?: {
      edit?: "allow" | "ask" | "deny";
      bash?: "allow" | "ask" | "deny";
    };
    codex?: {
      exposeAsSkill?: boolean;
    };
  };
}

function renderPlatformTemplate(
  platform: Platform,
  kind: TemplateKind,
  template: CanonicalTemplate
): string;
```

---

# Validation Rules

## Required fields

- platform
- kind
- id
- description
- body

---

## id validation

```ts
/^[a-z0-9]+(-[a-z0-9]+)*$/
```

Additional constraints:

- min length: 1
- max length: 64

Reject:

```txt
QA_Tester
reviewer agent
foo_bar
```

---

## description validation

- required
- min length: 1
- max length: 1024
- reject multiline descriptions unless multiline YAML serialization exists

---

## YAML validation

After rendering:

- YAML must parse successfully
- Unsupported fields must fail validation
- Undefined placeholders must fail validation

Examples:

```txt
Unresolved placeholder "{{model}}"
Unsupported field "temperature" for platform "codex"
```

---

## Path collision validation

The generator must reject duplicate output paths in the same generation run.

Example invalid state:

```txt
codex skill verifier
-> .agents/skills/verifier/SKILL.md

codex subagent verifier
-> .agents/skills/verifier/SKILL.md
```

This must:

- fail loudly
OR
- resolve deterministically

Recommended behavior:

```txt
throw duplicate output path error
```

---

# File Path Resolution

Recommended helper:

```ts
function resolvePlatformTemplatePath(
  platform: Platform,
  kind: TemplateKind,
  id: string
): string;
```

Expected paths:

```ts
// Codex
skill    -> `.agents/skills/${id}/SKILL.md`

// Claude
skill    -> `.claude/skills/${id}/SKILL.md`
agent    -> `.claude/agents/${id}.md`
subagent -> `.claude/agents/${id}.md`

// OpenCode
skill    -> `.opencode/skills/${id}/SKILL.md`
agent    -> `.opencode/agents/${id}.md`
subagent -> `.opencode/agents/${id}.md`
```

Codex agents/subagents resolve only if exposeAsSkill is enabled.

---

# Snapshot Tests

Required snapshots:

```txt
codex.skill.snap
claude.skill.snap
claude.subagent.snap
opencode.skill.snap
opencode.subagent.snap
```

Additional required tests:

- canonical frontmatter removal
- body byte preservation
- YAML parse validation
- duplicate output path rejection
- unresolved placeholder rejection
- unsupported field rejection

---

# Acceptance Criteria

This implementation is complete when:

1. Canonical frontmatter is parsed and removed before rendering.
2. Semantic bodies are preserved exactly after frontmatter removal.
3. Static header templates drive all platform headers.
4. Codex skills generate valid SKILL.md files.
5. Codex agents/subagents are NOT automatically mapped to skills.
6. Claude agents/subagents use tools, not allowed-tools.
7. OpenCode agents/subagents do not default bash to deny unless explicit permissions exist.
8. Generated YAML parses correctly.
9. Duplicate output paths are detected.
10. Unsupported fields fail loudly.
11. Snapshot tests validate all generated outputs.
12. Existing Bitácora architecture remains unchanged.

---

# Non-Negotiables

- Do not redesign Bitácora
- Do not rewrite semantic bodies
- Do not introduce large abstractions
- Do not invent unsupported headers
- Do not silently ignore collisions
- Do not prepend platform headers over canonical frontmatter
- Keep this a thin compatibility layer
