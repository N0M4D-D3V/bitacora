import fs from "node:fs";
import path from "node:path";

import { parseTrackMarkdown } from "../core/parser";

interface LogCommandOptions {
  rootDir: string;
  trackId: string;
  message: string;
}

interface LogCommandDependencies {
  now?: () => string;
  onError?: (message: string) => void;
}

function getTrackDirectories(rootDir: string): string[] {
  const tracksRoot = path.join(rootDir, "bitacora", "tracks");
  if (!fs.existsSync(tracksRoot)) {
    return [];
  }

  return fs
    .readdirSync(tracksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export function runLogCommand(
  options: LogCommandOptions,
  dependencies: LogCommandDependencies = {}
): number {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const onError = dependencies.onError ?? (() => {});

  const trackPath = path.join(options.rootDir, "bitacora", "tracks", options.trackId, "track.md");
  if (!fs.existsSync(trackPath)) {
    onError(`Track not found: ${options.trackId}`);
    return 1;
  }

  const timestamp = now();
  const normalized = fs.readFileSync(trackPath, "utf8").replace(/\r\n/g, "\n");

  try {
    parseTrackMarkdown(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError(message);
    return 1;
  }

  const updatedHeader = normalized.replace(
    /^updated_at:\s*.+$/m,
    `updated_at: ${timestamp}`
  );
  const line = `- ${timestamp} | ${options.message}`;
  const finalContent = updatedHeader.endsWith("\n")
    ? `${updatedHeader}${line}\n`
    : `${updatedHeader}\n${line}\n`;

  fs.writeFileSync(trackPath, finalContent, "utf8");

  return 0;
}
