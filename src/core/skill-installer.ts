import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { createAgentSkillTemplate } from "./templates";

interface LockedSkill {
  source: string;
  sourceType: string;
  computedHash: string;
}

interface SkillsLockFile {
  version: number;
  skills: Record<string, LockedSkill>;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function readSkillsLockFile(filePath: string): SkillsLockFile {
  if (!fs.existsSync(filePath)) {
    return {
      version: 1,
      skills: {}
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { version: 1, skills: {} };
    }

    const versionRaw = (parsed as { version?: unknown }).version;
    const skillsRaw = (parsed as { skills?: unknown }).skills;
    const normalized: Record<string, LockedSkill> = {};

    if (typeof skillsRaw === "object" && skillsRaw !== null) {
      for (const [name, value] of Object.entries(skillsRaw as Record<string, unknown>)) {
        if (typeof value !== "object" || value === null) {
          continue;
        }
        const source = (value as { source?: unknown }).source;
        const sourceType = (value as { sourceType?: unknown }).sourceType;
        const computedHash = (value as { computedHash?: unknown }).computedHash;
        if (
          typeof source === "string" &&
          typeof sourceType === "string" &&
          typeof computedHash === "string"
        ) {
          normalized[name] = { source, sourceType, computedHash };
        }
      }
    }

    return {
      version: typeof versionRaw === "number" ? versionRaw : 1,
      skills: normalized
    };
  } catch {
    return {
      version: 1,
      skills: {}
    };
  }
}

function writeSkillsLockFile(rootDir: string, skillContent: string): void {
  const lockPath = path.join(rootDir, "skills-lock.json");
  const lock = readSkillsLockFile(lockPath);
  lock.skills.bitacora = {
    source: ".agents/skills/bitacora/SKILL.md",
    sourceType: "local",
    computedHash: computeHash(skillContent)
  };

  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function installBitacoraSkill(rootDir: string): void {
  const skillDir = path.join(rootDir, ".agents", "skills", "bitacora");
  fs.mkdirSync(skillDir, { recursive: true });

  const skillContent = createAgentSkillTemplate();
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillContent, "utf8");
  writeSkillsLockFile(rootDir, skillContent);
}
