import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";
import { runNewTrackCommand } from "../../src/commands/new-track";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-new-track-"));
}

function readFile(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

describe("runNewTrackCommand", () => {
  it("creates next sequential track with default active/medium", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const exitCode = runNewTrackCommand(
      { rootDir },
      { now: () => "2026-02-27T00:01:00.000Z" }
    );

    expect(exitCode).toBe(0);
    const content = readFile(rootDir, "bitacora/tracks/TRACK-002/track.md");
    expect(content).toContain("track_id: TRACK-002");
    expect(content).toContain("status: active");
    expect(content).toContain("priority: medium");
    expect(content).toContain("created_at: 2026-02-27T00:01:00.000Z");
  });

  it("accepts explicit ID only when it equals computed next ID", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const okExitCode = runNewTrackCommand(
      { rootDir, trackId: "TRACK-002" },
      { now: () => "2026-02-27T00:02:00.000Z" }
    );

    expect(okExitCode).toBe(0);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "TRACK-002", "track.md"))).toBe(true);

    const errors: string[] = [];
    const failExitCode = runNewTrackCommand(
      { rootDir, trackId: "TRACK-004" },
      {
        now: () => "2026-02-27T00:03:00.000Z",
        onError: (message) => errors.push(message)
      }
    );

    expect(failExitCode).toBe(1);
    expect(errors).toEqual(["Explicit track ID must match next sequential ID: TRACK-003"]);
  });

  it("fails for invalid explicit ID format", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const errors: string[] = [];
    const exitCode = runNewTrackCommand(
      { rootDir, trackId: "track-002" },
      {
        now: () => "2026-02-27T00:01:00.000Z",
        onError: (message) => errors.push(message)
      }
    );

    expect(exitCode).toBe(1);
    expect(errors).toEqual(["Invalid track ID format. Expected TRACK-###"]);
  });
});
