import fs from "node:fs";
import path from "node:path";

import { createArchitectureTemplate, createConventionsTemplate } from "./templates";
import { buildStateFromTracks } from "./state-builder";
import { validateMemory } from "./validator";
import type { ProjectState } from "../types";

export interface BootLoaders {
  loadContext?: (context: {
    index: string;
    product: string;
    techStack: string;
    architecture: string;
    conventions: string;
    workflow: string;
    uxStyleGuide: string;
  }) => void;
  loadTracks?: (trackFiles: string[]) => void;
}

function ensureTechnicalRootDocs(rootDir: string): void {
  const memoryRoot = path.join(rootDir, "bitacora");
  if (!fs.existsSync(memoryRoot)) {
    return;
  }

  const missingTechnicalDocs = [
    {
      fileName: "architecture.md",
      content: createArchitectureTemplate()
    },
    {
      fileName: "conventions.md",
      content: createConventionsTemplate()
    }
  ];

  for (const document of missingTechnicalDocs) {
    const targetPath = path.join(memoryRoot, document.fileName);
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, document.content, "utf8");
    }
  }
}

function readRequiredFile(rootDir: string, relativePath: string): string {
  const targetPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(targetPath)) {
    throw new Error("Memory structure is invalid");
  }

  return fs.readFileSync(targetPath, "utf8");
}

export function boot(rootDir: string, loaders: BootLoaders = {}): ProjectState {
  ensureTechnicalRootDocs(rootDir);

  const index = readRequiredFile(rootDir, path.join("bitacora", "index.md"));
  const product = readRequiredFile(rootDir, path.join("bitacora", "product.md"));
  const techStack = readRequiredFile(rootDir, path.join("bitacora", "tech-stack.md"));
  const architecture = readRequiredFile(rootDir, path.join("bitacora", "architecture.md"));
  const conventions = readRequiredFile(rootDir, path.join("bitacora", "conventions.md"));
  const workflow = readRequiredFile(rootDir, path.join("bitacora", "workflow.md"));
  const uxStyleGuide = readRequiredFile(rootDir, path.join("bitacora", "ux-style-guide.md"));
  loaders.loadContext?.({
    index,
    product,
    techStack,
    architecture,
    conventions,
    workflow,
    uxStyleGuide
  });

  const tracksRoot = path.join(rootDir, "bitacora", "tracks");
  if (!fs.existsSync(tracksRoot)) {
    throw new Error("Memory structure is invalid");
  }
  const trackFiles = fs
    .readdirSync(tracksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(tracksRoot, entry.name, "track.md"))
    .sort((left, right) => left.localeCompare(right));
  loaders.loadTracks?.(trackFiles);

  const validation = validateMemory(rootDir);
  if (!validation.ok) {
    throw new Error(`Memory structure is invalid: ${validation.errors.join("; ")}`);
  }

  return buildStateFromTracks(validation.tracks);
}
