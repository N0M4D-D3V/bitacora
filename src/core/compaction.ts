import fs from "node:fs";
import path from "node:path";

import type { ParsedTrackFile, TrackStatus } from "../types";
import { parseTrackMarkdown } from "./parser";

const MAX_DECISIONS_IN_COMPACT_TRACK = 3;
const PENDING_TASK_REGEX = /^-\s*\[\s\]/m;
const TEST_LOG_REGEX = /^-\s+[^|]+\s+\|\s+TEST:\s+.+$/m;

function uniqueOrdered(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    result.push(line);
  }

  return result;
}

function extractLines(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function summarizeOverview(overview: string): string {
  const lines = extractLines(overview);
  if (lines.length === 0) {
    return "- Summary unavailable.";
  }

  return lines.slice(0, 2).map((line) => `- ${line.replace(/^-\s*/, "")}`).join("\n");
}

function summarizeTasks(tasks: string): string {
  const lines = extractLines(tasks);
  const checkboxes = lines.filter((line) => /^-\s*\[[ xX]\]/.test(line));
  const done = checkboxes.filter((line) => /^-\s*\[[xX]\]/.test(line)).length;

  if (checkboxes.length === 0) {
    return "- No checklist tasks found.";
  }

  return `- Checklist completed: ${done}/${checkboxes.length}`;
}

function summarizeDecisions(decisions: string): string {
  const normalizedLines = extractLines(decisions)
    .map((line) => line.replace(/^-\s*/, ""));
  const uniqueLines = uniqueOrdered(normalizedLines);
  const tail = uniqueLines.slice(-MAX_DECISIONS_IN_COMPACT_TRACK);

  if (tail.length === 0) {
    return "- No decisions captured.";
  }

  return tail.map((line) => `- ${line}`).join("\n");
}

function assertCanMarkAsCompleted(trackPath: string, tasks: string, log: string): void {
  if (PENDING_TASK_REGEX.test(tasks)) {
    throw new Error(`Cannot mark track as completed: pending tasks found (${trackPath})`);
  }

  if (!TEST_LOG_REGEX.test(log)) {
    throw new Error(`Cannot mark track as completed: missing TEST: evidence in log (${trackPath})`);
  }
}

function renderFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---`;
}

function ensureHistoryRoot(rootDir: string): string {
  const historyRoot = path.join(rootDir, "bitacora", "history");
  fs.mkdirSync(historyRoot, { recursive: true });
  return historyRoot;
}

function buildCompactedTrackMarkdown(input: {
  trackId: string;
  status: TrackStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
  completion: number;
  compactedAt: string;
  historyPath: string;
  overview: string;
  tasks: string;
  decisions: string;
}): string {
  const frontmatter = renderFrontmatter({
    track_id: input.trackId,
    status: input.status,
    priority: input.priority,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
    completion: String(input.completion),
    compacted_at: input.compactedAt,
    history_path: input.historyPath
  });

  return `${frontmatter}

# Overview
${summarizeOverview(input.overview)}
- Full history: ${input.historyPath}

# Tasks
${summarizeTasks(input.tasks)}

# Decisions
${summarizeDecisions(input.decisions)}

# Log
- ${input.compactedAt} | compacted track and archived full history
`;
}

export interface CompactTrackRequest {
  rootDir: string;
  trackId: string;
  complete: boolean;
  dryRun: boolean;
  now: string;
}

export interface CompactTrackResult {
  trackId: string;
  compacted: boolean;
  skippedReason?: string;
  bytesBefore: number;
  bytesAfter: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function compactTrack(request: CompactTrackRequest): CompactTrackResult {
  const trackPath = path.join(request.rootDir, "bitacora", "tracks", request.trackId, "track.md");
  if (!fs.existsSync(trackPath)) {
    throw new Error(`Track not found: ${request.trackId}`);
  }

  const source = fs.readFileSync(trackPath, "utf8").replace(/\r\n/g, "\n");
  const parsed = parseTrackMarkdown(source);

  if (request.complete) {
    assertCanMarkAsCompleted(trackPath, parsed.sections.tasks, parsed.sections.log);
  } else if (parsed.frontmatter.status !== "completed") {
    return {
      trackId: request.trackId,
      compacted: false,
      skippedReason: "Track is not completed",
      bytesBefore: source.length,
      bytesAfter: source.length,
      estimatedTokensBefore: estimateTokenCount(source),
      estimatedTokensAfter: estimateTokenCount(source)
    };
  }

  const compactedAt = request.now;
  const updatedAt = request.now;
  const completion = 100;
  const status: TrackStatus = "completed";

  const historyRoot = ensureHistoryRoot(request.rootDir);
  const historyFileName = `${request.trackId}.md`;
  const historyAbsolutePath = path.join(historyRoot, historyFileName);
  const historyRelativePath = path.join("bitacora", "history", historyFileName).replace(/\\/g, "/");

  const compactedMarkdown = buildCompactedTrackMarkdown({
    trackId: parsed.frontmatter.track_id,
    status,
    priority: parsed.frontmatter.priority,
    createdAt: parsed.frontmatter.created_at,
    updatedAt,
    completion,
    compactedAt,
    historyPath: historyRelativePath,
    overview: parsed.sections.overview,
    tasks: parsed.sections.tasks,
    decisions: parsed.sections.decisions
  });

  if (!request.dryRun) {
    fs.writeFileSync(historyAbsolutePath, source, "utf8");
    fs.writeFileSync(trackPath, compactedMarkdown, "utf8");
  }

  return {
    trackId: request.trackId,
    compacted: true,
    bytesBefore: source.length,
    bytesAfter: compactedMarkdown.length,
    estimatedTokensBefore: estimateTokenCount(source),
    estimatedTokensAfter: estimateTokenCount(compactedMarkdown)
  };
}

function extractTrackRows(tracks: ParsedTrackFile[]): string {
  const sorted = [...tracks].sort((left, right) => left.frontmatter.track_id.localeCompare(right.frontmatter.track_id));
  return sorted
    .map((track) => {
      const status = track.frontmatter.status;
      const completion = track.frontmatter.completion ?? (status === "completed" ? 100 : 0);
      const notes = track.frontmatter.compacted_at ? "compacted" : "active detail";
      return `| ${track.frontmatter.track_id} | ${status} | ${completion}% | ${track.frontmatter.updated_at} | ${notes} |`;
    })
    .join("\n");
}

export function buildCompactedTracksRegistry(now: string, tracks: ParsedTrackFile[]): string {
  const active = tracks.filter((track) => track.frontmatter.status === "active").length;
  const blocked = tracks.filter((track) => track.frontmatter.status === "blocked").length;
  const completed = tracks.filter((track) => track.frontmatter.status === "completed").length;
  const archived = tracks.filter((track) => track.frontmatter.status === "archived").length;

  const rows = extractTrackRows(tracks);

  return `# Tracks

> Canonical project status and handoff registry.
>
> Last updated: ${now.slice(0, 10)}
>
> Rule: update this file after meaningful implementation changes.

## Snapshot

- Active: ${active}
- Blocked: ${blocked}
- Completed: ${completed}
- Archived: ${archived}

## Track Registry

| ID | Status | Completion | Last Update | Notes |
| --- | --- | --- | --- | --- |
${rows.length > 0 ? rows : "| - | - | - | - | - |"}

## Session Handoff (Required)

- Track(s) touched
- Tests run (exact command + result)
- Current TDD phase
- Blockers/assumptions
- Next recommended action
`;
}

export function compactTracksRegistry(options: {
  rootDir: string;
  now: string;
  tracks: ParsedTrackFile[];
  dryRun: boolean;
}): { bytesBefore: number; bytesAfter: number; estimatedTokensBefore: number; estimatedTokensAfter: number } {
  const tracksRegistryPath = path.join(options.rootDir, "bitacora", "tracks", "tracks.md");
  const before = fs.existsSync(tracksRegistryPath) ? fs.readFileSync(tracksRegistryPath, "utf8") : "";

  const next = buildCompactedTracksRegistry(options.now, options.tracks);

  if (!options.dryRun) {
    const historyRoot = ensureHistoryRoot(options.rootDir);
    const backupFileName = `tracks-${options.now.replace(/[:.]/g, "-")}.md`;
    fs.writeFileSync(path.join(historyRoot, backupFileName), before, "utf8");
    fs.writeFileSync(tracksRegistryPath, next, "utf8");
  }

  return {
    bytesBefore: before.length,
    bytesAfter: next.length,
    estimatedTokensBefore: estimateTokenCount(before),
    estimatedTokensAfter: estimateTokenCount(next)
  };
}

export interface TrackHistoryInfo {
  trackId: string;
  historyPath: string;
  exists: boolean;
  content?: string;
}

export function readTrackHistory(rootDir: string, trackId: string, includeContent: boolean): TrackHistoryInfo {
  const trackPath = path.join(rootDir, "bitacora", "tracks", trackId, "track.md");
  if (!fs.existsSync(trackPath)) {
    throw new Error(`Track not found: ${trackId}`);
  }

  const parsed = parseTrackMarkdown(fs.readFileSync(trackPath, "utf8"));
  const historyPath = parsed.frontmatter.history_path ?? path.join("bitacora", "history", `${trackId}.md`).replace(/\\/g, "/");
  const absoluteHistoryPath = path.join(rootDir, historyPath);
  const exists = fs.existsSync(absoluteHistoryPath);

  if (!includeContent) {
    return {
      trackId,
      historyPath,
      exists
    };
  }

  return {
    trackId,
    historyPath,
    exists,
    ...(exists ? { content: fs.readFileSync(absoluteHistoryPath, "utf8") } : {})
  };
}
