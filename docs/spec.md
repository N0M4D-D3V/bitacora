# Bitacora — Implementation Spec (v1)

> Source of truth for the v1 implementation of the Bitacora CLI and harness.
> Target implementers: Codex + OpenCode.
> Stack: Node 20+, pnpm.

---

## 1. Overview & Goals

Bitacora is a CLI that scaffolds and maintains a portable harness + memory layer for AI coding agents. After `bitacora init`, any compatible agent runtime (Claude Code, OpenCode, Codex) can read shared project context from a standard location and contribute to a structured memory layer through the CLI.

**Primary goals (v1):**
- One-command project setup via `bitacora init`.
- Cross-runtime compatibility via the `AGENTS.md` standard.
- Three pre-configured agent roles: `manager`, `coder`, `reviewer`.
- All memory writes channeled through the CLI to guarantee schema integrity.
- Harness files marked read-only to agents at the runtime level (deny rules), not just by convention.

**Non-goals (v1):** see §10.

---

## 2. Glossary

- **Harness files** — markdown documents under `.bitacora/harness/` defining quality standards, conventions, and verification rules. Read-only for agents.
- **Memory files** — JSON/JSONL files under `.bitacora/memory/` holding project state, history, and lessons. Read anytime; **all writes via CLI**.
- **Canonical** — the source-of-truth file under `.bitacora/` (e.g. `.bitacora/agents/manager.md`). Adapters generate from canonical.
- **Adapter** — code that translates canonical definitions into runtime-specific outputs (e.g. `.claude/agents/manager.md`).
- **Session** — contiguous span of agent work bracketed by `bitacora session start` and `bitacora session end`.

---

## 3. Filesystem Layout (post-`init`)

```
project-root/
├── AGENTS.md                              # entrypoint (root)
├── CLAUDE.md       → AGENTS.md            # symlink
├── GEMINI.md       → AGENTS.md            # symlink
├── .bitacora/
│   ├── version                            # "1"
│   ├── .lock                              # CLI write lock
│   ├── harness/
│   │   ├── architecture.md
│   │   ├── convention.md
│   │   ├── verification.md
│   │   └── checkpoints.md
│   ├── memory/
│   │   ├── current.json
│   │   ├── history.jsonl
│   │   └── lessons.jsonl
│   ├── agents/                            # canonical role definitions
│   │   ├── manager.md
│   │   ├── coder.md
│   │   └── reviewer.md
│   └── skills/
│       └── bitacora-cli/
│           └── SKILL.md                   # canonical skill
├── .claude/
│   ├── settings.json                      # generated/merged
│   ├── agents/
│   │   ├── manager.md                     # adapter output
│   │   ├── coder.md
│   │   └── reviewer.md
│   └── skills/
│       └── bitacora-cli/
│           └── SKILL.md                   # symlink → canonical
├── .opencode/
│   └── agent/
│       ├── manager.md                     # adapter output
│       ├── coder.md
│       └── reviewer.md
└── .agents/
    └── skills/
        └── bitacora-cli/
            └── SKILL.md                   # symlink → canonical (for Codex)
```

All filenames are **lowercase**. Memory files use `.json` (single object) or `.jsonl` (one entry per line). Harness files are markdown.

---

## 4. File Contracts

### 4.1 AGENTS.md

The CLI ships a default `AGENTS.md` template containing exactly five sections, in this order:

1. **Session Start (mandatory)** — instructions an agent must execute before starting work (e.g., load harness files, check `current.json`, run baseline tests).
2. **Hard Rules (mandatory)** — invariants no agent may break (e.g., one feature at a time; never mix unrelated tasks).
3. **Session End (mandatory)** — instructions before closing (e.g., run tests, clean temp files, invoke `bitacora session end`).
4. **If blocked** — escalation procedure when an agent cannot proceed.
5. **Repository map** — table listing each Bitacora file with `path | purpose | read when`.

The CLI treats this template as an **opaque blob** and copies it verbatim during `init`. Users edit it post-init.

### 4.2 Harness files (opaque)

`architecture.md`, `convention.md`, `verification.md`, `checkpoints.md` are shipped as defaults from the CLI bundle. The CLI does not parse or validate their content. `bitacora doctor` only verifies they exist.

### 4.3 Memory files (schema-enforced)

The CLI **must validate every write** against these schemas. Validation failure → exit 2, no mutation.

#### 4.3.1 `current.json`

Single object. Empty state is `{}`.

```json
{
  "feature":   "string, required when active",
  "agent":     "string, required when active",
  "start":     "ISO 8601 timestamp",
  "status":    "in_progress | in_review | done",
  "plan":      ["bullet 1", "bullet 2", "..."],
  "bitacora":  [
    { "ts": "ISO 8601", "agent": "string", "msg": "string" }
  ],
  "next_step": "string"
}
```

> Note: `status` is **added** to the field list originally specified. Required because the design assigns the manager exclusive control over status transitions; without it there is no place to record the transition.

#### 4.3.2 `history.jsonl`

One entry per line. Append-only.

```json
{
  "agent":        "string",
  "feature":      "string",
  "date":         "ISO 8601",
  "plan":         ["bullet 1", "..."],
  "bitacora":     [{ "ts": "...", "agent": "...", "msg": "..." }],
  "verification": { "process": "string", "result": "string" },
  "close":        "done | interrupted | abandoned | blocked"
}
```

#### 4.3.3 `lessons.jsonl`

One entry per line. Updates rewrite the matching `id` line.

```json
{
  "id":         "lsn_<yyyymmdd>_<8-char-random>",
  "feature":    "string",
  "knowledge":  "string",
  "agent":      "string (optional)",
  "date":       "ISO 8601 (created)",
  "updated_at": "ISO 8601"
}
```

---

## 5. Agents

### 5.1 Canonical roles

The CLI ships three canonical role files at `.bitacora/agents/{manager,coder,reviewer}.md`. Each contains:

- A short role description (purpose, scope, what this agent does NOT do).
- Permission expectations (mirroring §5.2).
- Workflow guidance referencing CLI commands.

These are markdown with optional frontmatter. Adapters translate frontmatter to runtime-specific formats.

### 5.2 Permission matrix

| Action                                          | Manager | Coder | Reviewer |
|--------------------------------------------------|:-------:|:-----:|:--------:|
| Read harness/*                                  |   R     |   R   |    R     |
| Read current.json                               |   ✓     |   ✓   |    ✓     |
| Append to `current.bitacora` (log a step)       |   ✓     |   ✓   |    ✓     |
| Modify `current.status`                         |   ✓     |   ✗   |    ✗     |
| Modify `current.plan` / `next_step` / `feature` |   ✓     |   ✗   |    ✗     |
| Read history.jsonl                              |   ✓     |   ✓   |    ✓     |
| Append to history.jsonl                         |   ✓     |   ✗   |    ✗     |
| Read lessons.jsonl                              |   ✓     |   ✓   |    ✓     |
| Add lesson                                      |   ✓     |   ✓   |    ✓     |
| Update lesson                                   |   ✓     |   ✓   |    ✓     |

Enforcement layers:
1. Documental — described in each canonical agent file and in `AGENTS.md`.
2. Runtime — `.claude/settings.json` deny rules block `Edit`/`Write` on `.bitacora/harness/**` and `.bitacora/memory/**`, forcing agents to use the CLI.
3. CLI — every write command accepts `--agent <role>` (or reads `BITACORA_AGENT` env). The CLI rejects unauthorized actions per matrix above (exit 3).

### 5.3 Session state machine

```
       (start)
         │
         ▼
   in_progress ──manager──► in_review ──manager──► done
         │                      │                   │
         └─── interrupted ──────┴── abandoned ──────┘
              (auto-recovery on next session start)
```

- Only the manager mutates `status`.
- Coder and reviewer log activity in `current.bitacora` only.
- On `bitacora session start` with non-empty `current.json`, the previous session is archived to `history.jsonl` with `close: "interrupted"` before reset.

---

## 6. CLI

Binary name: `bitacora`. Distributed via pnpm. Help text auto-generated.

### 6.1 Command surface

```
bitacora init [--force]

bitacora session start
bitacora session end [--close <done|abandoned|blocked>]

bitacora current log <msg> [--agent <name>]
bitacora current status <in_progress|in_review|done>   # manager only
bitacora current set <key=value>...                    # manager only
bitacora current show

bitacora history append --from-current                 # manager only; usually called by session end
bitacora history show [--last <n>] [--feature <name>]
bitacora history search <query> [--semantic] [--feature <name>]

bitacora lessons add <knowledge> [--feature <f>] [--agent <name>]
bitacora lessons update <id> <knowledge>
bitacora lessons list [--feature <name>]
bitacora lessons search <query> [--semantic] [--feature <name>]

bitacora sync                                          # regenerate all adapters
bitacora doctor
```

### 6.2 Validation & errors

Exit codes:
- `0` — success.
- `1` — generic error.
- `2` — schema validation failure (no file modified).
- `3` — permission denied (agent attempted disallowed action).
- `4` — lock acquisition timeout.
- `5` — feature not implemented in v1 (e.g. `--semantic`).
- `6` — `init` aborted because `.bitacora/` already exists and `--force` not given.

Validation rules:
- All writes parse-and-revalidate the entire target file before commit.
- Writes are atomic: write to temp file in same directory, then `fs.rename`.
- File lock at `.bitacora/.lock` (use `proper-lockfile` or equivalent). Wait up to 5s, then exit 4.

### 6.3 Search (lexical only in v1)

- Default search is **lexical**: case-insensitive substring match.
  - Lessons: matches `knowledge`.
  - History: matches concatenation of `plan` + `bitacora.msg` + `verification.process`.
- `--semantic` flag is **accepted but unimplemented**: exits with code 5 and message `"semantic search not implemented in v1; use lexical (omit --semantic)"`.
- Output: JSON array of matching entries to stdout.

### 6.4 `bitacora doctor`

Performs and reports on:
1. **Files present** — all paths in §3 exist.
2. **Schema validity** — every memory file parses against §4.3.
3. **Orphan check** — `current.json` non-empty AND `start` older than 24h → flag.
4. **Symlink integrity** — `CLAUDE.md` and `GEMINI.md` resolve to `AGENTS.md`.
5. **Adapter sync** — checksums of canonical agent files match generated adapters; mismatch suggests the user should run `bitacora sync`.
6. **Permission rules** — `.claude/settings.json` contains the 4 deny rules from §7.1.
7. **Sizes** — print byte-size of `history.jsonl` and `lessons.jsonl`.

Exit 0 if everything passes; exit 1 if any check fails (full report still printed).

---

## 7. Adapters

All adapters are generated by `bitacora init` and refreshed by `bitacora sync`. v1 ships three adapters.

### 7.1 Claude Code

Outputs:
- `.claude/agents/{manager,coder,reviewer}.md` — generated from `.bitacora/agents/*.md` with Claude-Code-compatible frontmatter (model, allowed-tools as needed).
- `.claude/skills/bitacora-cli/SKILL.md` — symlink to `.bitacora/skills/bitacora-cli/SKILL.md`.
- `.claude/settings.json` — deep-merge (do not overwrite existing keys) the following:

```json
{
  "permissions": {
    "deny": [
      { "tool": "Edit",  "pattern": ".bitacora/harness/**" },
      { "tool": "Write", "pattern": ".bitacora/harness/**" },
      { "tool": "Edit",  "pattern": ".bitacora/memory/**"  },
      { "tool": "Write", "pattern": ".bitacora/memory/**"  }
    ]
  }
}
```

If the file exists, merge by appending to `permissions.deny` array, dedup by `(tool,pattern)`. Never delete existing rules.

### 7.2 OpenCode

Outputs:
- `.opencode/agent/{manager,coder,reviewer}.md` — generated from canonical with OpenCode frontmatter.
- Permissions equivalent if supported by OpenCode at implementation time (verify against current OpenCode docs).

> Implementation note: confirm exact path (`.opencode/agent/` vs `.opencode/agents/`) and frontmatter schema against OpenCode docs at implementation time. Adjust adapter accordingly.

### 7.3 Codex (skill only)

Outputs:
- `.agents/skills/bitacora-cli/SKILL.md` — symlink to canonical.
- No agent files. Codex does not yet support custom agent definitions in scope for Bitacora v1.

### 7.4 Adding a new adapter

1. Create `src/adapters/<name>.ts` exporting `{ name: string, generate(ctx): Promise<void>, clean(ctx): Promise<void> }`.
2. Register in `src/adapters/index.ts`.
3. Update §7 of this spec.
4. Add acceptance criteria in §9.

All adapters always run on `init` / `sync`; selective enable/disable is a v2 feature.

---

## 8. `bitacora init` flow

1. Refuse if `.bitacora/` exists and `--force` is absent → exit 6.
2. If `--force`, remove `.bitacora/` and regenerate. Do NOT delete `.claude/`, `.opencode/`, or root `AGENTS.md` blindly — re-merge instead.
3. Create `.bitacora/` skeleton (§3).
4. Copy bundled templates → `.bitacora/harness/*.md`.
5. Initialize memory files: `current.json` ← `{}`, `history.jsonl` ← empty, `lessons.jsonl` ← empty.
6. Copy bundled canonical agent files → `.bitacora/agents/*.md`.
7. Copy bundled canonical skill → `.bitacora/skills/bitacora-cli/SKILL.md`.
8. Write `AGENTS.md` from template at repo root (skip if exists; warn).
9. Create symlinks `CLAUDE.md`, `GEMINI.md` → `AGENTS.md` (skip + warn if files already exist as non-symlinks).
10. Run all adapters (§7).
11. Print summary tree of created/modified paths.

---

## 9. Acceptance Criteria

Every criterion below must have a corresponding automated test. Test framework: `vitest`. Tests run with `pnpm test`.

### Init
- **AC-INIT-01** After `bitacora init` in an empty directory, every path in §3 exists.
- **AC-INIT-02** `bitacora init` on an already-initialized repo exits 6 without modifying any file.
- **AC-INIT-03** `bitacora init --force` regenerates `.bitacora/` cleanly and re-merges adapter outputs.
- **AC-INIT-04** `CLAUDE.md` and `GEMINI.md` are symlinks resolving to `AGENTS.md`.
- **AC-INIT-05** Pre-existing `AGENTS.md` is preserved with a warning.

### Permissions
- **AC-PERM-01** `.claude/settings.json` contains all 4 deny rules from §7.1.
- **AC-PERM-02** Pre-existing `.claude/settings.json` keys are preserved after merge.
- **AC-PERM-03** Pre-existing deny rules are not duplicated.

### Memory writes
- **AC-MEM-01** `bitacora lessons add --feature x "y"` creates a JSONL entry with auto-generated `id`, `date`, `updated_at`.
- **AC-MEM-02** `bitacora lessons update <id> "new"` rewrites the matching line, updates `updated_at`, leaves `date` and `id` unchanged.
- **AC-MEM-03** `bitacora current log "msg" --agent coder` appends `{ts, agent, msg}` to `current.bitacora`.
- **AC-MEM-04** Manager-only commands enforce identity at the CLI level. On rejection, exit 3 (permission denied) and the target file is byte-identical to its prior state:
  - `bitacora current status in_review --agent coder` exits 3.
  - `bitacora current status in_review --agent reviewer` exits 3.
  - `bitacora current status in_review --agent manager` succeeds; `current.json.status == "in_review"`.
  - `bitacora current set plan='[...]' --agent coder` exits 3; with `--agent manager`, succeeds.
  - `bitacora history append --from-current --agent coder` exits 3; with `--agent manager`, succeeds.
  - Missing `--agent` flag (and unset `BITACORA_AGENT`) on any manager-only command exits 3.
- **AC-MEM-05** Invalid JSON / schema input exits 2 with no file mutation.
- **AC-MEM-06** Two CLI processes writing concurrently: one wins, the other waits or exits 4. No corruption.
- **AC-MEM-07** All writes are atomic (temp file + rename). Killing the process mid-write leaves the original file intact.

### Session
- **AC-SESS-01** `bitacora session start` with empty `current.json` is a no-op + prints status.
- **AC-SESS-02** `bitacora session start` with non-empty `current.json` archives it to `history.jsonl` with `close: "interrupted"`, then resets `current.json` to `{}`.
- **AC-SESS-03** `bitacora session end` requires non-empty `current.json`; archives + resets, default `close: "done"`.

### Search
- **AC-SEARCH-01** `bitacora lessons search "keyword"` returns matching entries as a JSON array on stdout.
- **AC-SEARCH-02** `--semantic` exits 5 with the v1 message defined in §6.3.
- **AC-SEARCH-03** Search is case-insensitive substring match.

### Doctor
- **AC-DOCT-01** Reports byte-size of `history.jsonl` and `lessons.jsonl`.
- **AC-DOCT-02** Detects orphan `current.json` (non-empty, `start` > 24h ago).
- **AC-DOCT-03** Detects broken `CLAUDE.md` / `GEMINI.md` symlinks.
- **AC-DOCT-04** Detects missing deny rules in `.claude/settings.json`.
- **AC-DOCT-05** Detects schema-invalid memory files.
- **AC-DOCT-06** Returns exit 0 only when all checks pass.

### Adapters
- **AC-ADAPT-01** `bitacora sync` regenerates `.claude/agents/*` from canonical without touching unrelated files.
- **AC-ADAPT-02** Editing canonical and running `bitacora sync` propagates the change to all adapter outputs.
- **AC-ADAPT-03** All symlinks are created with relative targets (portable across `git clone`).

---

## 10. Non-goals (v1)

The following are explicitly **out of scope** for v1 and must not be implemented:

- Semantic search (flag accepted, returns exit 5 — see §6.3).
- Auto-distillation of `history` → `lessons`.
- Custom Codex agent definitions (skill only — see §7.3).
- Multi-agent concurrency beyond a single advisory file lock.
- Schema versioning or migration tooling.
- Remote / shared memory backends (local files only).
- Selective adapter enable/disable (all adapters always run).
- Web UI, dashboard, or telemetry.
- Hook-based automatic session start/end (relies on agent invocation + auto-recovery only — see §5.3).

---

## Appendix A — Default agent role descriptions (canonical seeds)

Brief content shipped at `.bitacora/agents/*.md`. Each starts with frontmatter:

```yaml
---
name: <role>
description: <one-line purpose>
---
```

- **Manager** — Orchestrates work. Owns session lifecycle, status transitions, history archival. Delegates implementation and review.
- **Coder** — Implements features. Logs each significant step in `current.bitacora`. Captures lessons. Never modifies status.
- **Reviewer** — Verifies completed work against `verification.md` and `checkpoints.md`. Logs review steps in `current.bitacora`. Captures lessons. Never modifies status.

Full prose body for each ships in the CLI bundle and is treated as opaque template content (like §4.2).

---

## Appendix B — Implementation suggestions (non-binding)

- **Language**: TypeScript with `tsx` for dev, build to ESM via `tsup`.
- **CLI framework**: `commander` or `cac`.
- **Validation**: `zod` for schemas (§4.3).
- **File locking**: `proper-lockfile`.
- **Symlinks**: `fs.symlink` with relative targets (use `path.relative`).
- **JSONL**: read line-by-line with `readline`; never load whole file unless small.
- **Tests**: `vitest` with `tmp-promise` for filesystem isolation.
- **Bundling templates**: ship under `templates/` in the published package; resolve via `import.meta.url`.

These are suggestions; the implementer may substitute equivalents.
