import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";
import { runLogCommand } from "../../src/commands/log";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-log-"));
}

function readTrack(rootDir: string, trackId: string): string {
  return fs.readFileSync(path.join(rootDir, "bitacora", "tracks", trackId, "track.md"), "utf8");
}

describe("runLogCommand", () => {
  it("appends log line and updates updated_at", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const before = readTrack(rootDir, "TRACK-001");
    expect(before).toContain("updated_at: 2026-02-27T00:00:00.000Z");

    const exitCode = runLogCommand(
      { rootDir, trackId: "TRACK-001", message: "implemented parser" },
      { now: () => "2026-02-27T00:10:00.000Z" }
    );

    const after = readTrack(rootDir, "TRACK-001");
    expect(exitCode).toBe(0);
    expect(after).toContain("updated_at: 2026-02-27T00:10:00.000Z");
    expect(after).toContain("- 2026-02-27T00:10:00.000Z | implemented parser");
  });

  it("fails when # Log section is missing", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const trackPath = path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md");
    const broken = readTrack(rootDir, "TRACK-001").replace("# Log", "# Logs");
    fs.writeFileSync(trackPath, broken, "utf8");

    const errors: string[] = [];
    const exitCode = runLogCommand(
      { rootDir, trackId: "TRACK-001", message: "will fail" },
      { now: () => "2026-02-27T00:10:00.000Z", onError: (message) => errors.push(message) }
    );

    expect(exitCode).toBe(1);
    expect(errors).toEqual(["Missing section: Log"]);
  });

  it("uses deterministic log line format", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    expect(
      runLogCommand(
        { rootDir, trackId: "TRACK-001", message: "deterministic line" },
        { now: () => "2026-02-27T01:23:45.000Z" }
      )
    ).toBe(0);

    const after = readTrack(rootDir, "TRACK-001");
    const lines = after.split("\n").filter((line) => line.includes("deterministic line"));
    expect(lines).toEqual(["- 2026-02-27T01:23:45.000Z | deterministic line"]);
  });
});
