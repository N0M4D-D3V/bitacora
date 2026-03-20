import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runCompactCommand } from "../../src/commands/compact";
import { runInitCommand } from "../../src/commands/init";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-compact-"));
}

function readTrack(rootDir: string, trackId: string): string {
  return fs.readFileSync(path.join(rootDir, "bitacora", "tracks", trackId, "track.md"), "utf8");
}

describe("runCompactCommand", () => {
  it("marks a track as completed, archives it, and compacts the content", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const before = readTrack(rootDir, "TRACK-001")
      .replace("- [ ] RED: add failing test(s)", "- [x] RED: add failing test(s)")
      .replace("- [ ] GREEN: implement minimal passing behavior", "- [x] GREEN: implement minimal passing behavior")
      .replace("- [ ] REFACTOR: improve without changing behavior", "- [x] REFACTOR: improve without changing behavior")
      .replaceAll("- 2026-02-27T00:00:00.000Z | track created", "- 2026-02-27T00:00:00.000Z | TEST: npm test -> pass");
    fs.writeFileSync(path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md"), before, "utf8");

    const outputs: string[] = [];
    const errors: string[] = [];
    const exitCode = runCompactCommand(
      {
        rootDir,
        trackId: "TRACK-001",
        all: false,
        complete: true,
        dryRun: false
      },
      {
        now: () => "2026-02-27T01:00:00.000Z",
        onOutput: (message) => outputs.push(message),
        onError: (message) => errors.push(message)
      }
    );

    expect(errors).toEqual([]);
    expect(exitCode).toBe(0);
    const compacted = readTrack(rootDir, "TRACK-001");
    expect(compacted).toContain("status: completed");
    expect(compacted).toContain("completion: 100");
    expect(compacted).toContain("compacted_at: 2026-02-27T01:00:00.000Z");
    expect(compacted).toContain("history_path: bitacora/history/TRACK-001.md");
    expect(fs.existsSync(path.join(rootDir, "bitacora", "history", "TRACK-001.md"))).toBe(true);
    expect(outputs.some((line) => line.includes("TRACK-001: bytes"))).toBe(true);
    expect(outputs.some((line) => line.includes("tracks.md: bytes"))).toBe(true);
  });

  it("fails completion gate when pending tasks exist", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const errors: string[] = [];
    const exitCode = runCompactCommand(
      {
        rootDir,
        trackId: "TRACK-001",
        all: false,
        complete: true,
        dryRun: false
      },
      {
        now: () => "2026-02-27T01:00:00.000Z",
        onError: (message) => errors.push(message)
      }
    );

    expect(exitCode).toBe(1);
    expect(errors[0]).toContain("Cannot mark track as completed: pending tasks found");
  });

  it("supports dry-run mode without modifying files", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const trackPath = path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md");
    const ready = readTrack(rootDir, "TRACK-001")
      .replace("- [ ] RED: add failing test(s)", "- [x] RED: add failing test(s)")
      .replace("- [ ] GREEN: implement minimal passing behavior", "- [x] GREEN: implement minimal passing behavior")
      .replace("- [ ] REFACTOR: improve without changing behavior", "- [x] REFACTOR: improve without changing behavior")
      .replaceAll("- 2026-02-27T00:00:00.000Z | track created", "- 2026-02-27T00:00:00.000Z | TEST: npm test -> pass");
    fs.writeFileSync(trackPath, ready, "utf8");

    const before = fs.readFileSync(trackPath, "utf8");
    const errors: string[] = [];
    const exitCode = runCompactCommand(
      {
        rootDir,
        trackId: "TRACK-001",
        all: false,
        complete: true,
        dryRun: true
      },
      {
        now: () => "2026-02-27T01:00:00.000Z",
        onError: (message) => errors.push(message)
      }
    );

    const after = fs.readFileSync(trackPath, "utf8");
    expect(errors).toEqual([]);
    expect(exitCode).toBe(0);
    expect(after).toBe(before);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "history", "TRACK-001.md"))).toBe(false);
  });
});
