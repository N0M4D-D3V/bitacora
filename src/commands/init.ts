import fs from "node:fs";
import path from "node:path";

import {
  createIndexTemplate,
  createProductTemplate,
  createTechStackTemplate,
  createTrackTemplate,
  createTracksRegistryTemplate,
  createTracksTemplate,
  createUxStyleGuideTemplate,
  createWorkflowTemplate
} from "../core/templates";
import { installBitacoraSkill } from "../core/skill-installer";

interface InitCommandOptions {
  rootDir: string;
  force: boolean;
}

interface InitCommandDependencies {
  now?: () => string;
  onError?: (message: string) => void;
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

  fs.writeFileSync(path.join(memoryRoot, "product.md"), createProductTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "tech-stack.md"), createTechStackTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "workflow.md"), createWorkflowTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "ux-style-guide.md"), createUxStyleGuideTemplate(), "utf8");
  fs.writeFileSync(path.join(memoryRoot, "index.md"), createIndexTemplate(), "utf8");
  installBitacoraSkill(options.rootDir);
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
