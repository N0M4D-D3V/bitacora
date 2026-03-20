import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runSkillCommand } from "../../src/commands/skill";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-skill-command-"));
}

function readFile(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(rootDir: string, relativePath: string): unknown {
  return JSON.parse(readFile(rootDir, relativePath));
}

describe("runSkillCommand", () => {
  it("creates only skill files without bootstrapping bitacora memory", () => {
    const rootDir = makeTempRoot();

    const exitCode = runSkillCommand({ rootDir });

    expect(exitCode).toBe(0);
    expect(fs.existsSync(path.join(rootDir, ".agents", "skills", "bitacora", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "skills-lock.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora"))).toBe(false);
  });

  it("overwrites existing SKILL.md with current template", () => {
    const rootDir = makeTempRoot();
    const skillPath = path.join(rootDir, ".agents", "skills", "bitacora", "SKILL.md");
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, "old skill content", "utf8");

    const exitCode = runSkillCommand({ rootDir });

    expect(exitCode).toBe(0);
    const createdSkill = readFile(rootDir, ".agents/skills/bitacora/SKILL.md");
    expect(createdSkill).toContain("name: bitacora");
    expect(createdSkill).toContain("version: 1.1.1");
    expect(createdSkill).not.toContain("old skill content");
  });

  it("updates skills-lock.json while preserving unrelated skills", () => {
    const rootDir = makeTempRoot();
    fs.writeFileSync(
      path.join(rootDir, "skills-lock.json"),
      JSON.stringify(
        {
          version: 1,
          skills: {
            tdd: {
              source: "mattpocock/skills",
              sourceType: "github",
              computedHash: "abc"
            }
          }
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const exitCode = runSkillCommand({ rootDir });

    expect(exitCode).toBe(0);

    const lock = readJson(rootDir, "skills-lock.json") as {
      version: number;
      skills: Record<string, { source: string; sourceType: string; computedHash: string }>;
    };

    expect(lock.version).toBe(1);
    expect(lock.skills.tdd).toEqual({
      source: "mattpocock/skills",
      sourceType: "github",
      computedHash: "abc"
    });
    expect(lock.skills.bitacora).toMatchObject({
      source: ".agents/skills/bitacora/SKILL.md",
      sourceType: "local"
    });
    expect(lock.skills.bitacora?.computedHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
