import fs from "node:fs";
import path from "node:path";

import { createTrackTemplate } from "../core/templates";
import { validateMemory } from "../core/validator";
import type { TrackPriority, TrackStatus } from "../types";

interface NewTrackCommandOptions {
  rootDir: string;
  trackId?: string;
  status?: TrackStatus;
  priority?: TrackPriority;
}

interface NewTrackCommandDependencies {
  now?: () => string;
  onError?: (message: string) => void;
}

const TRACK_ID_REGEX = /^TRACK-\d{3}$/;

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

function computeNextTrackId(trackDirectories: string[]): string {
  const lastTrackId = trackDirectories.at(-1);
  if (!lastTrackId) {
    return "TRACK-001";
  }

  const trackNumber = Number.parseInt(lastTrackId.slice("TRACK-".length), 10);
  const nextTrackNumber = Number.isFinite(trackNumber) ? trackNumber + 1 : 1;
  return `TRACK-${String(nextTrackNumber).padStart(3, "0")}`;
}

export function runNewTrackCommand(
  options: NewTrackCommandOptions,
  dependencies: NewTrackCommandDependencies = {}
): number {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const onError = dependencies.onError ?? (() => {});

  const validation = validateMemory(options.rootDir);
  if (!validation.ok) {
    onError(`Memory structure is invalid: ${validation.errors.join("; ")}`);
    return 1;
  }

  const trackDirectories = getTrackDirectories(options.rootDir);
  const nextTrackId = computeNextTrackId(trackDirectories);
  const desiredTrackId = options.trackId ?? nextTrackId;
  if (!TRACK_ID_REGEX.test(desiredTrackId)) {
    onError("Invalid track ID format. Expected TRACK-###");
    return 1;
  }

  if (options.trackId && options.trackId !== nextTrackId) {
    onError(`Explicit track ID must match next sequential ID: ${nextTrackId}`);
    return 1;
  }

  const trackDir = path.join(options.rootDir, "bitacora", "tracks", desiredTrackId);
  if (fs.existsSync(trackDir)) {
    onError(`Track already exists: ${desiredTrackId}`);
    return 1;
  }

  const status = options.status ?? "active";
  const priority = options.priority ?? "medium";
  const timestamp = now();

  fs.mkdirSync(trackDir, { recursive: true });
  fs.writeFileSync(
    path.join(trackDir, "track.md"),
    createTrackTemplate(desiredTrackId, status, priority, timestamp),
    "utf8"
  );

  return 0;
}
