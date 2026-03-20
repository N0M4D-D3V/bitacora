import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateMemory } from "../../src/core/validator";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-validator-"));
}

function writeTrack(rootDir: string, dirName: string, body: string): void {
  const trackDir = path.join(rootDir, "bitacora", "tracks", dirName);
  fs.mkdirSync(trackDir, { recursive: true });
  fs.writeFileSync(path.join(trackDir, "track.md"), body, "utf8");
}

describe("validateMemory", () => {
  it("reports duplicate track IDs", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T00:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);
    writeTrack(rootDir, "TRACK-002", content.replace("one", "two"));

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Duplicate track_id: TRACK-001");
  });

  it("reports gaps in track numbering", () => {
    const rootDir = makeTempRoot();

    const track001 = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T00:00:00.000Z | one
`;

    const track003 = track001.replace("TRACK-001", "TRACK-003");

    writeTrack(rootDir, "TRACK-001", track001);
    writeTrack(rootDir, "TRACK-003", track003);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Track numbering gap: expected TRACK-002 but found TRACK-003");
  });

  it("reports invalid status values", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: started
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T00:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Invalid track file TRACK-001: Invalid status");
  });

  it("reports missing required sections", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
one

# Tasks
one

# Log
- 2026-02-27T00:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Invalid track file TRACK-001: Missing section: Decisions");
  });

  it("reports missing frontmatter", () => {
    const rootDir = makeTempRoot();

    const content = `
# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T00:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Invalid track file TRACK-001: Missing frontmatter");
  });

  it("reports when updated_at is older than latest log entry", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T00:00:00.000Z | one
- 2026-02-27T01:00:00.000Z | appended later
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("updated_at is older than latest log entry for TRACK-001");
  });

  it("reports completed tracks with invalid completion metadata", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: completed
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T01:00:00.000Z
completion: 80
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T01:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Completed track must have completion 100: TRACK-001");
  });

  it("reports compacted tracks without valid history metadata", () => {
    const rootDir = makeTempRoot();

    const content = `---
track_id: TRACK-001
status: completed
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T01:00:00.000Z
completion: 100
compacted_at: 2026-02-27T01:00:00.000Z
history_path: bitacora/history/TRACK-001.md
---

# Overview
one

# Tasks
one

# Decisions
one

# Log
- 2026-02-27T01:00:00.000Z | one
`;

    writeTrack(rootDir, "TRACK-001", content);

    const result = validateMemory(rootDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Compacted track history file not found for TRACK-001");
  });
});
