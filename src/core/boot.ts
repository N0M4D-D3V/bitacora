import fs from "node:fs";
import path from "node:path";

import { buildStateFromTracks } from "./state-builder";
import { validateMemory } from "./validator";
import type { ProjectState } from "../types";

export interface BootLoaders {
  loadContext?: (context: {
    index: string;
    product: string;
    techStack: string;
    workflow: string;
    uxStyleGuide: string;
  }) => void;
  loadTracks?: (trackFiles: string[]) => void;
}

function readRequiredFile(rootDir: string, relativePath: string): string {
  const targetPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(targetPath)) {
    throw new Error("Memory structure is invalid");
  }

  return fs.readFileSync(targetPath, "utf8");
}

export function boot(rootDir: string, loaders: BootLoaders = {}): ProjectState {
  const index = readRequiredFile(rootDir, path.join("bitacora", "index.md"));
  const product = readRequiredFile(rootDir, path.join("bitacora", "product.md"));
  const techStack = readRequiredFile(rootDir, path.join("bitacora", "tech-stack.md"));
  const workflow = readRequiredFile(rootDir, path.join("bitacora", "workflow.md"));
  const uxStyleGuide = readRequiredFile(rootDir, path.join("bitacora", "ux-style-guide.md"));
  loaders.loadContext?.({ index, product, techStack, workflow, uxStyleGuide });

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
