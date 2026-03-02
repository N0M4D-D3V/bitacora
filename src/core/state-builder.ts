import path from "node:path";

import type { ParsedTrackFile, ProjectState, TrackIndexEntry } from "../types";

function getTrackNumber(trackId: string): number {
  const match = /^TRACK-(\d{3})$/.exec(trackId);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const numericPart = match[1];
  if (!numericPart) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number.parseInt(numericPart, 10);
}

function sortTrackEntries(entries: TrackIndexEntry[]): TrackIndexEntry[] {
  return [...entries].sort((left, right) => getTrackNumber(left.track_id) - getTrackNumber(right.track_id));
}

export function buildIndexFromTracks(tracks: ParsedTrackFile[]): TrackIndexEntry[] {
  const entries = tracks.map((track) => ({
    track_id: track.frontmatter.track_id,
    status: track.frontmatter.status,
    priority: track.frontmatter.priority,
    created_at: track.frontmatter.created_at,
    updated_at: track.frontmatter.updated_at,
    path: path.join("bitacora", "tracks", track.directoryName, "track.md").replace(/\\/g, "/")
  }));

  return sortTrackEntries(entries);
}

export function buildStateFromTracks(tracks: ParsedTrackFile[]): ProjectState {
  const indexEntries = buildIndexFromTracks(tracks);

  return {
    project: {
      memory_root: "bitacora",
      context_paths: [
        "bitacora/product.md",
        "bitacora/tech-stack.md",
        "bitacora/workflow.md",
        "bitacora/ux-style-guide.md"
      ],
      track_count: tracks.length
    },
    active_tracks: sortTrackEntries(indexEntries.filter((entry) => entry.status === "active")),
    blocked_tracks: sortTrackEntries(indexEntries.filter((entry) => entry.status === "blocked")),
    completed_tracks: sortTrackEntries(indexEntries.filter((entry) => entry.status === "completed"))
  };
}
