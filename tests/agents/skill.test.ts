import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-skill-"));
}

describe("bitacora skill generation", () => {
  it("creates a single consolidated SKILL.md file", () => {
    const rootDir = makeTempRoot();
    const exitCode = runInitCommand(
      { rootDir, force: false },
      { now: () => "2026-02-27T00:00:00.000Z" }
    );

    expect(exitCode).toBe(0);

    const skillDir = path.join(rootDir, ".agents", "skills", "bitacora");
    expect(fs.existsSync(skillDir)).toBe(true);
    expect(fs.readdirSync(skillDir)).toEqual(["SKILL.md"]);

    const skillContent = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    expect(skillContent).toContain("## Mandatory Session Protocol");
    expect(skillContent).toContain("## Manual Bootstrap (No CLI Required)");
    expect(skillContent).toContain("bitacora/ux-style-guide.md");
    expect(skillContent).toContain("bitacora/tracks/tracks.md");
    expect(skillContent).toContain("bitacora/history/");
    expect(skillContent).toContain("bitacora compact --track-id <id> --complete");
  });
});
