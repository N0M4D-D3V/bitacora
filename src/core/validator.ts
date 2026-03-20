import fs from "node:fs";
import path from "node:path";

import { parseTrackMarkdown } from "./parser";
import type { ParsedTrackFile, ValidationResult } from "../types";

const TRACK_DIRECTORY_REGEX = /^TRACK-(\d{3})$/;

function getTrackDirectories(rootDir: string): string[] {
  const tracksRoot = path.join(rootDir, "bitacora", "tracks");
  if (!fs.existsSync(tracksRoot)) {
    return [];
  }

  return fs
    .readdirSync(tracksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function loadTracks(rootDir: string, errors: string[]): ParsedTrackFile[] {
  const tracksRoot = path.join(rootDir, "bitacora", "tracks");
  const trackDirs = getTrackDirectories(rootDir);
  const tracks: ParsedTrackFile[] = [];

  for (const directoryName of trackDirs) {
    const filePath = path.join(tracksRoot, directoryName, "track.md");
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing track.md: ${directoryName}`);
      continue;
    }

    const markdown = fs.readFileSync(filePath, "utf8");
    try {
      const parsed = parseTrackMarkdown(markdown);
      tracks.push({
        ...parsed,
        filePath,
        directoryName
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Invalid track file ${directoryName}: ${message}`);
    }
  }

  return tracks;
}

function validateTrackNumbering(trackDirectories: string[], errors: string[]): void {
  const numericTrackIds = trackDirectories
    .map((directoryName) => {
      const match = TRACK_DIRECTORY_REGEX.exec(directoryName);
      if (!match) {
        errors.push(`Invalid track directory name: ${directoryName}`);
        return null;
      }

      const numericPart = match[1];
      if (!numericPart) {
        errors.push(`Invalid track directory name: ${directoryName}`);
        return null;
      }

      return Number.parseInt(numericPart, 10);
    })
    .filter((trackNumber): trackNumber is number => trackNumber !== null)
    .sort((left, right) => left - right);

  for (let index = 0; index < numericTrackIds.length; index += 1) {
    const expected = index + 1;
    const actual = numericTrackIds[index];
    if (actual !== expected) {
      const expectedId = `TRACK-${String(expected).padStart(3, "0")}`;
      const actualId = `TRACK-${String(actual).padStart(3, "0")}`;
      errors.push(`Track numbering gap: expected ${expectedId} but found ${actualId}`);
      return;
    }
  }
}

function validateDuplicateTrackIds(tracks: ParsedTrackFile[], errors: string[]): void {
  const seen = new Set<string>();
  for (const track of tracks) {
    const trackId = track.frontmatter.track_id;
    if (seen.has(trackId)) {
      errors.push(`Duplicate track_id: ${trackId}`);
      continue;
    }
    seen.add(trackId);
  }
}

function parseLogTimestamp(line: string): number | null {
  const match = /^-\s+([^|]+)\s+\|\s+.+$/.exec(line.trim());
  if (!match) {
    return null;
  }

  const timestampRaw = match[1];
  if (!timestampRaw) {
    return null;
  }

  const timestamp = Date.parse(timestampRaw.trim());
  return Number.isNaN(timestamp) ? null : timestamp;
}

function validateUpdatedAtAgainstLogEntries(tracks: ParsedTrackFile[], errors: string[]): void {
  for (const track of tracks) {
    const updatedAt = Date.parse(track.frontmatter.updated_at);
    if (Number.isNaN(updatedAt)) {
      continue;
    }

    const latestLogTimestamp = track.sections.log
      .split("\n")
      .map((line) => parseLogTimestamp(line))
      .filter((timestamp): timestamp is number => timestamp !== null)
      .reduce<number | null>(
        (latest, current) => (latest === null || current > latest ? current : latest),
        null
      );

    if (latestLogTimestamp !== null && updatedAt < latestLogTimestamp) {
      errors.push(`updated_at is older than latest log entry for ${track.frontmatter.track_id}`);
    }
  }
}

function validateCompactionMetadata(rootDir: string, tracks: ParsedTrackFile[], errors: string[]): void {
  for (const track of tracks) {
    const { completion, status, history_path: historyPath } = track.frontmatter;
    if (completion !== undefined && (completion < 0 || completion > 100)) {
      errors.push(`Invalid completion value for ${track.frontmatter.track_id}: ${completion}`);
    }

    if (status === "completed" && completion !== undefined && completion !== 100) {
      errors.push(`Completed track must have completion 100: ${track.frontmatter.track_id}`);
    }

    if (track.frontmatter.compacted_at !== undefined) {
      if (!historyPath) {
        errors.push(`Compacted track missing history_path: ${track.frontmatter.track_id}`);
        continue;
      }

      const historyAbsolutePath = path.join(rootDir, historyPath);
      if (!fs.existsSync(historyAbsolutePath)) {
        errors.push(`Compacted track history file not found for ${track.frontmatter.track_id}`);
      }
    }
  }
}

export function validateMemory(rootDir: string): ValidationResult {
  const errors: string[] = [];
  const trackDirectories = getTrackDirectories(rootDir);
  validateTrackNumbering(trackDirectories, errors);

  const tracks = loadTracks(rootDir, errors);

  validateDuplicateTrackIds(tracks, errors);
  validateUpdatedAtAgainstLogEntries(tracks, errors);
  validateCompactionMetadata(rootDir, tracks, errors);
  errors.sort((left, right) => left.localeCompare(right));

  return {
    ok: errors.length === 0,
    errors,
    tracks
  };
}
