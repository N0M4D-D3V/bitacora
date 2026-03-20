export const TRACK_STATUSES = ["active", "completed", "blocked", "archived"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];

export const TRACK_PRIORITIES = ["low", "medium", "high"] as const;
export type TrackPriority = (typeof TRACK_PRIORITIES)[number];

export interface TrackFrontmatter {
  track_id: string;
  status: TrackStatus;
  priority: TrackPriority;
  created_at: string;
  updated_at: string;
  completion?: number;
  compacted_at?: string;
  history_path?: string;
}

export interface TrackSections {
  overview: string;
  tasks: string;
  decisions: string;
  log: string;
}

export interface ParsedTrackMarkdown {
  frontmatter: TrackFrontmatter;
  sections: TrackSections;
}

export interface ParsedTrackFile extends ParsedTrackMarkdown {
  filePath: string;
  directoryName: string;
}

export interface TrackIndexEntry {
  track_id: string;
  status: TrackStatus;
  priority: TrackPriority;
  created_at: string;
  updated_at: string;
  path: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  tracks: ParsedTrackFile[];
}

export interface ProjectInfo {
  memory_root: string;
  context_paths: string[];
  track_count: number;
}

export interface ProjectState {
  project: ProjectInfo;
  active_tracks: TrackIndexEntry[];
  blocked_tracks: TrackIndexEntry[];
  completed_tracks: TrackIndexEntry[];
}
