import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";
import { runNewTrackCommand } from "../../src/commands/new-track";
import { runRebuildStateCommand } from "../../src/commands/rebuild-state";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-rebuild-"));
}

function readFile(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

describe("runRebuildStateCommand", () => {
  it("fails when memory structure is invalid", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const trackPath = path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md");
    const broken = readFile(rootDir, "bitacora/tracks/TRACK-001/track.md").replace(
      "# Decisions",
      "# Decisionz"
    );
    fs.writeFileSync(trackPath, broken, "utf8");

    const errors: string[] = [];
    const exitCode = runRebuildStateCommand(
      { rootDir },
      { onError: (message) => errors.push(message) }
    );

    expect(exitCode).toBe(1);
    expect(errors[0]).toContain("Memory structure is invalid");
  });

  it("validates and reports rebuild success without machine artifacts", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });
    runNewTrackCommand({ rootDir }, { now: () => "2026-02-27T00:01:00.000Z" });

    const outputs: string[] = [];
    const exitCode = runRebuildStateCommand({ rootDir }, { onOutput: (message) => outputs.push(message) });
    expect(exitCode).toBe(0);
    expect(outputs).toEqual(["State rebuilt"]);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "machine"))).toBe(false);
  });

  it("is stable when run repeatedly", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });
    runNewTrackCommand({ rootDir }, { now: () => "2026-02-27T00:01:00.000Z" });

    expect(runRebuildStateCommand({ rootDir })).toBe(0);
    const firstTrack = readFile(rootDir, "bitacora/tracks/TRACK-001/track.md");

    expect(runRebuildStateCommand({ rootDir })).toBe(0);
    const secondTrack = readFile(rootDir, "bitacora/tracks/TRACK-001/track.md");

    expect(secondTrack).toBe(firstTrack);
  });
});
