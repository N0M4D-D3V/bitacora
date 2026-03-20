import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  createAgentSkillTemplate,
  createIndexTemplate,
  createProductTemplate,
  createTechStackTemplate,
  createTrackTemplate,
  createTracksRegistryTemplate,
  createTracksTemplate,
  createUxStyleGuideTemplate,
  createWorkflowTemplate
} from "../core/templates";

interface InitCommandOptions {
  rootDir: string;
  force: boolean;
}

interface InitCommandDependencies {
  now?: () => string;
  onError?: (message: string) => void;
}

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

export function runInitCommand(
  options: InitCommandOptions,
  dependencies: InitCommandDependencies = {}
): number {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const onError = dependencies.onError ?? (() => {});

  const memoryRoot = path.join(options.rootDir, "bitacora");
  if (fs.existsSync(memoryRoot)) {
    if (!options.force) {
      onError("bitacora already exists");
      return 1;
    }

    fs.rmSync(memoryRoot, { recursive: true, force: true });
  }

  const createdAt = now();
  const createdOnDate = createdAt.slice(0, 10);
  const trackId = "TRACK-001";

  fs.mkdirSync(path.join(memoryRoot, "tracks", trackId), { recursive: true });
  fs.mkdirSync(path.join(memoryRoot, "history"), { recursive: true });
  fs.mkdirSync(path.join(options.rootDir, ".agents", "skills", "bitacora"), { recursive: true });

  fs.writeFileSync(path.join(memoryRoot, "product.md"), createProductTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "tech-stack.md"), createTechStackTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "workflow.md"), createWorkflowTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "ux-style-guide.md"), createUxStyleGuideTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "index.md"), createIndexTemplate(), "utf8");
  const skillContent = createAgentSkillTemplate();
  fs.writeFileSync(path.join(options.rootDir, ".agents", "skills", "bitacora", "SKILL.md"), skillContent, "utf8");
  writeSkillsLockFile(options.rootDir, skillContent);
  fs.writeFileSync(
    path.join(memoryRoot, "tracks", "tracks.md"),
    createTracksRegistryTemplate(createdOnDate),
    "utf8"
  );
  fs.writeFileSync(path.join(memoryRoot, "tracks", "tracks-template.md"), createTracksTemplate(), "utf8");
  fs.writeFileSync(
    path.join(memoryRoot, "tracks", trackId, "track.md"),
    createTrackTemplate(trackId, "active", "medium", createdAt),
    "utf8"
  );

  return 0;
}
