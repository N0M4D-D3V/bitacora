import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createCliProgram, runCli } from "../../src/cli";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-cli-"));
}

describe("cli", () => {
  it("registers all required commands", () => {
    const program = createCliProgram();
    const names = program.commands.map((command) => command.name()).sort();

    expect(names).toEqual(["compact", "history", "init", "log", "new-track", "rebuild-state", "validate"]);
  });

  it("returns non-zero exit code for unknown command", async () => {
    const output: string[] = [];
    const exitCode = await runCli(["node", "bitacora", "unknown"], {
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(exitCode).toBe(1);
    expect(output.join("\n")).toContain("unknown command");
  });

  it("runs init command and exits with code 0", async () => {
    const rootDir = makeTempRoot();
    const exitCode = await runCli(["node", "bitacora", "init", "--root", rootDir], {
      now: () => "2026-02-27T00:00:00.000Z"
    });

    expect(exitCode).toBe(0);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md"))).toBe(true);
  });
});
