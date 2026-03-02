import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";
import { runValidateCommand } from "../../src/commands/validate";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-validate-"));
}

describe("runValidateCommand", () => {
  it("returns exit code 0 when memory is valid", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const outputs: string[] = [];
    const exitCode = runValidateCommand(
      { rootDir, json: false },
      { onOutput: (message) => outputs.push(message) }
    );

    expect(exitCode).toBe(0);
    expect(outputs).toEqual(["Validation passed"]);
  });

  it("returns exit code 1 and deterministic errors when memory is invalid", () => {
    const rootDir = makeTempRoot();
    runInitCommand({ rootDir, force: false }, { now: () => "2026-02-27T00:00:00.000Z" });

    const trackPath = path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md");
    const content = fs.readFileSync(trackPath, "utf8").replace("status: active", "status: bad");
    fs.writeFileSync(trackPath, content, "utf8");

    const outputs: string[] = [];
    const exitCode = runValidateCommand(
      { rootDir, json: false },
      { onOutput: (message) => outputs.push(message) }
    );

    expect(exitCode).toBe(1);
    expect(outputs).toEqual([
      "Validation failed",
      "Invalid track file TRACK-001: Invalid status"
    ]);
  });
});
