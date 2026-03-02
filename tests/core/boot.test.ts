import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { boot } from "../../src/core/boot";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-boot-"));
}

function writeFile(rootDir: string, relativePath: string, content: string): void {
  const targetPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function validTrack(trackId: string, status: "active" | "blocked" | "completed" | "archived"): string {
  return `---
track_id: ${trackId}
status: ${status}
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
overview

# Tasks
- task

# Decisions
- decision

# Log
- 2026-02-27T00:00:00.000Z | created
`;
}

function seedValidMemory(rootDir: string): void {
  writeFile(rootDir, "bitacora/index.md", "# Index\n");
  writeFile(rootDir, "bitacora/product.md", "# Product\n");
  writeFile(rootDir, "bitacora/tech-stack.md", "# Tech Stack\n");
  writeFile(rootDir, "bitacora/workflow.md", "# Workflow\n");
  writeFile(rootDir, "bitacora/ux-style-guide.md", "# UX\n");
  writeFile(rootDir, "bitacora/tracks/TRACK-001/track.md", validTrack("TRACK-001", "active"));
}

describe("boot", () => {
  it("fails on invalid structure", () => {
    const rootDir = makeTempRoot();
    expect(() => boot(rootDir)).toThrowError("Memory structure is invalid");
  });

  it("returns deterministic state object", () => {
    const rootDir = makeTempRoot();
    seedValidMemory(rootDir);

    const first = boot(rootDir);
    const second = boot(rootDir);

    expect(first).toEqual(second);
  });

  it("loads context and tracks in order", () => {
    const rootDir = makeTempRoot();
    seedValidMemory(rootDir);

    const callTrace: string[] = [];
    const contextLoader = vi.fn(() => {
      callTrace.push("context");
    });
    const trackLoader = vi.fn(() => {
      callTrace.push("tracks");
    });

    boot(rootDir, {
      loadContext: contextLoader,
      loadTracks: trackLoader
    });

    expect(callTrace).toEqual(["context", "tracks"]);
  });
});
