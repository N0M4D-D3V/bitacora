import { describe, expect, it } from "vitest";

import { buildStateFromTracks } from "../../src/core/state-builder";
import type { ParsedTrackFile } from "../../src/types";

function makeTrack(
  trackId: string,
  status: "active" | "blocked" | "completed" | "archived"
): ParsedTrackFile {
  return {
    directoryName: trackId,
    filePath: `/tmp/${trackId}/track.md`,
    frontmatter: {
      track_id: trackId,
      status,
      priority: "medium",
      created_at: "2026-02-27T00:00:00.000Z",
      updated_at: "2026-02-27T00:00:00.000Z"
    },
    sections: {
      overview: "overview",
      tasks: "tasks",
      decisions: "decisions",
      log: "- 2026-02-27T00:00:00.000Z | created"
    }
  };
}

describe("buildStateFromTracks", () => {
  it("builds required project state shape and stable ordering", () => {
    const tracks: ParsedTrackFile[] = [
      makeTrack("TRACK-003", "completed"),
      makeTrack("TRACK-001", "active"),
      makeTrack("TRACK-004", "archived"),
      makeTrack("TRACK-002", "blocked")
    ];

    const state = buildStateFromTracks(tracks);

    expect(state.project.memory_root).toBe("bitacora");
    expect(state.project.context_paths).toEqual([
      "bitacora/product.md",
      "bitacora/tech-stack.md",
      "bitacora/workflow.md",
      "bitacora/ux-style-guide.md"
    ]);
    expect(state.project.track_count).toBe(4);
    expect(state.active_tracks.map((track) => track.track_id)).toEqual(["TRACK-001"]);
    expect(state.blocked_tracks.map((track) => track.track_id)).toEqual(["TRACK-002"]);
    expect(state.completed_tracks.map((track) => track.track_id)).toEqual(["TRACK-003"]);
  });

  it("produces deterministic serialization output", () => {
    const tracks: ParsedTrackFile[] = [
      makeTrack("TRACK-002", "blocked"),
      makeTrack("TRACK-001", "active"),
      makeTrack("TRACK-003", "completed")
    ];

    const state = buildStateFromTracks(tracks);
    const serialized = JSON.stringify(state, null, 2);

    expect(serialized).toMatchInlineSnapshot(`
      "{
        "project": {
          "memory_root": "bitacora",
          "context_paths": [
            "bitacora/product.md",
            "bitacora/tech-stack.md",
            "bitacora/workflow.md",
            "bitacora/ux-style-guide.md"
          ],
          "track_count": 3
        },
        "active_tracks": [
          {
            "track_id": "TRACK-001",
            "status": "active",
            "priority": "medium",
            "created_at": "2026-02-27T00:00:00.000Z",
            "updated_at": "2026-02-27T00:00:00.000Z",
            "path": "bitacora/tracks/TRACK-001/track.md"
          }
        ],
        "blocked_tracks": [
          {
            "track_id": "TRACK-002",
            "status": "blocked",
            "priority": "medium",
            "created_at": "2026-02-27T00:00:00.000Z",
            "updated_at": "2026-02-27T00:00:00.000Z",
            "path": "bitacora/tracks/TRACK-002/track.md"
          }
        ],
        "completed_tracks": [
          {
            "track_id": "TRACK-003",
            "status": "completed",
            "priority": "medium",
            "created_at": "2026-02-27T00:00:00.000Z",
            "updated_at": "2026-02-27T00:00:00.000Z",
            "path": "bitacora/tracks/TRACK-003/track.md"
          }
        ]
      }"
    `);
  });
});
