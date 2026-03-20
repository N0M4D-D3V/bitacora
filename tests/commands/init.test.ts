import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInitCommand } from "../../src/commands/init";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-init-"));
}

function readFile(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(rootDir: string, relativePath: string): unknown {
  return JSON.parse(readFile(rootDir, relativePath));
}

describe("runInitCommand", () => {
  it("creates deterministic bitacora folder structure", () => {
    const rootDir = makeTempRoot();
    const exitCode = runInitCommand(
      { rootDir, force: false },
      { now: () => "2026-02-27T00:00:00.000Z" }
    );

    expect(exitCode).toBe(0);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "product.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tech-stack.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "workflow.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "ux-style-guide.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "history"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "tracks.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "tracks-template.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "spec"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "human"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "machine"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, ".agents", "skills", "bitacora", "SKILL.md"))).toBe(true);
    expect(fs.readdirSync(path.join(rootDir, ".agents", "skills", "bitacora"))).toEqual(["SKILL.md"]);
    expect(fs.existsSync(path.join(rootDir, "skills-lock.json"))).toBe(true);

    const createdIndex = readFile(rootDir, "bitacora/index.md");
    expect(createdIndex).toContain("Always read this index at session start.");
    expect(createdIndex).toContain("`product.md`");
    expect(createdIndex).toContain("`tech-stack.md`");
    expect(createdIndex).toContain("`workflow.md`");
    expect(createdIndex).toContain("`ux-style-guide.md`");
    expect(createdIndex).toContain("`tracks/tracks.md`");
    expect(createdIndex).toContain("`tracks/tracks-template.md`");

    const createdWorkflow = readFile(rootDir, "bitacora/workflow.md");
    expect(createdWorkflow).toContain("Always read `bitacora/index.md` at the beginning of every session.");
    expect(createdWorkflow).toContain("Always write handoff updates before ending a session.");

    const createdSkill = readFile(rootDir, ".agents/skills/bitacora/SKILL.md");
    expect(createdSkill).toContain("name: bitacora");
    expect(createdSkill).toContain("description: Keep deterministic project memory in bitacora/ and update it continuously during implementation sessions.");
    expect(createdSkill).toContain("version: 1.0.0");
    expect(createdSkill).toContain("type: local");
    expect(createdSkill).toContain("source: .agents/skills/bitacora/SKILL.md");
    expect(createdSkill).toContain("## Manual Bootstrap (No CLI Required)");
    expect(createdSkill).toContain("Canonical skill file path: `.agents/skills/bitacora/SKILL.md`.");

    const lock = readJson(rootDir, "skills-lock.json") as {
      version: number;
      skills: Record<string, { source: string; sourceType: string; computedHash: string }>;
    };
    expect(lock.version).toBe(1);
    expect(lock.skills.bitacora).toBeDefined();
    expect(lock.skills.bitacora).toMatchObject({
      source: ".agents/skills/bitacora/SKILL.md",
      sourceType: "local"
    });
    expect(lock.skills.bitacora?.computedHash).toMatch(/^[a-f0-9]{64}$/);

    const createdTrack = readFile(rootDir, "bitacora/tracks/TRACK-001/track.md");
    expect(createdTrack).toContain("track_id: TRACK-001");
    expect(createdTrack).toContain("created_at: 2026-02-27T00:00:00.000Z");
    expect(createdTrack).toContain("updated_at: 2026-02-27T00:00:00.000Z");
  });

  it("fails fast when bitacora already exists and force is false", () => {
    const rootDir = makeTempRoot();
    fs.mkdirSync(path.join(rootDir, "bitacora"), { recursive: true });

    const errors: string[] = [];
    const exitCode = runInitCommand(
      { rootDir, force: false },
      { now: () => "2026-02-27T00:00:00.000Z", onError: (message) => errors.push(message) }
    );

    expect(exitCode).toBe(1);
    expect(errors).toEqual(["bitacora already exists"]);
  });

  it("deletes and recreates memory when force is true", () => {
    const rootDir = makeTempRoot();
    fs.mkdirSync(path.join(rootDir, "bitacora", "tracks", "TRACK-999"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "bitacora", "tracks", "TRACK-999", "track.md"), "old", "utf8");

    const exitCode = runInitCommand(
      { rootDir, force: true },
      { now: () => "2026-02-27T00:00:00.000Z" }
    );

    expect(exitCode).toBe(0);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "TRACK-999"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "bitacora", "tracks", "TRACK-001", "track.md"))).toBe(true);
  });

  it("updates existing skills-lock.json while preserving other skills", () => {
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

    const exitCode = runInitCommand(
      { rootDir, force: false },
      { now: () => "2026-02-27T00:00:00.000Z" }
    );

    expect(exitCode).toBe(0);

    const lock = readJson(rootDir, "skills-lock.json") as {
      version: number;
      skills: Record<string, { source: string; sourceType: string; computedHash: string }>;
    };

    expect(lock.skills.tdd).toEqual({
      source: "mattpocock/skills",
      sourceType: "github",
      computedHash: "abc"
    });
    expect(lock.skills.bitacora).toBeDefined();
    expect(lock.skills.bitacora).toMatchObject({
      source: ".agents/skills/bitacora/SKILL.md",
      sourceType: "local"
    });
  });
});
