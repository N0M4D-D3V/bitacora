import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runCompactCommand } from "../../src/commands/compact";
import { runHistoryCommand } from "../../src/commands/history";
import { runInitCommand } from "../../src/commands/init";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-history-"));
}

function makeTrackCompletable(rootDir: string): void {
  const trackPath = path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md");
  const ready = fs.readFileSync(trackPath, "utf8")
    .replace("- [ ] RED: add failing test(s)", "- [x] RED: add failing test(s)")
    .replace("- [ ] GREEN: implement minimal passing behavior", "- [x] GREEN: implement minimal passing behavior")
    .replace("- [ ] REFACTOR: improve without changing behavior", "- [x] REFACTOR: improve without changing behavior")
    .replaceAll("- 2026-02-27T00:00:00.000Z | track created", "- 2026-02-27T00:00:00.000Z | TEST: npm test -> pass");

  fs.writeFileSync(trackPath, ready, "utf8");
}

describe("runHistoryCommand", () => {
  it("prints metadata by default and full archived content with --show", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });
    makeTrackCompletable(rootDir);

    runCompactCommand(
      {
        rootDir,
        trackId: "TRACK-001",
        all: false,
        complete: true,
        dryRun: false
      },
      { now: () => "2026-02-27T01:00:00.000Z" }
    );

    const metadataOutput: string[] = [];
    const metadataErrors: string[] = [];
    const metaExitCode = runHistoryCommand(
      { rootDir, trackId: "TRACK-001", show: false },
      {
        onOutput: (message) => metadataOutput.push(message),
        onError: (message) => metadataErrors.push(message)
      }
    );

    expect(metadataErrors).toEqual([]);
    expect(metaExitCode).toBe(0);
    expect(metadataOutput).toEqual([
      "Track: TRACK-001",
      "History path: bitacora/history/TRACK-001.md",
      "Use --show to print history contents"
    ]);

    const fullOutput: string[] = [];
    const showExitCode = runHistoryCommand(
      { rootDir, trackId: "TRACK-001", show: true },
      { onOutput: (message) => fullOutput.push(message) }
    );

    expect(showExitCode).toBe(0);
    expect(fullOutput.join("\n")).toContain("TEST: npm test -> pass");
  });

  it("fails when history does not exist", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const errors: string[] = [];
    const exitCode = runHistoryCommand(
      { rootDir, trackId: "TRACK-001", show: false },
      { onError: (message) => errors.push(message) }
    );

    expect(exitCode).toBe(1);
    expect(errors).toEqual(["History not found for TRACK-001: bitacora/history/TRACK-001.md"]);
  });
});
