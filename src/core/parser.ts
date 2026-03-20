import {
  TRACK_PRIORITIES,
  TRACK_STATUSES,
  type ParsedTrackMarkdown,
  type TrackPriority,
  type TrackStatus
} from "../types";

function parseFrontmatterBlock(markdown: string): Record<string, string> {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n");

  if (parts[0] !== "---") {
    throw new Error("Missing frontmatter");
  }

  const endIndex = parts.indexOf("---", 1);
  if (endIndex === -1) {
    throw new Error("Missing frontmatter");
  }

  const raw: Record<string, string> = {};
  for (const line of parts.slice(1, endIndex)) {
    if (line.trim() === "") {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    raw[key] = value;
  }

  return raw;
}

function parseSections(markdown: string): Record<string, string> {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n---\n");
  const body = parts.length > 1 ? parts.slice(1).join("\n---\n") : "";

  const sectionMap: Record<string, string> = {};
  const headings = ["Overview", "Tasks", "Decisions", "Log"] as const;

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading === undefined) {
      continue;
    }
    const startToken = `# ${heading}\n`;
    const startIndex = body.indexOf(startToken);
    if (startIndex === -1) {
      continue;
    }

    const contentStart = startIndex + startToken.length;
    const nextHeading = headings[index + 1];
    const endIndex =
      nextHeading === undefined
        ? body.length
        : body.indexOf(`# ${nextHeading}\n`, contentStart);

    const content = body.slice(contentStart, endIndex === -1 ? body.length : endIndex).trim();
    sectionMap[heading.toLowerCase()] = content;
  }

  return sectionMap;
}

export function parseTrackMarkdown(markdown: string): ParsedTrackMarkdown {
  const frontmatter = parseFrontmatterBlock(markdown);
  const sections = parseSections(markdown);

  const getRequiredField = (field: "track_id" | "status" | "priority" | "created_at" | "updated_at"): string => {
    const value = frontmatter[field];
    if (!value) {
      throw new Error(`Missing frontmatter field: ${field}`);
    }
    return value;
  };

  const requiredFrontmatterFields = [
    "track_id",
    "status",
    "priority",
    "created_at",
    "updated_at"
  ] as const;
  for (const field of requiredFrontmatterFields) {
    getRequiredField(field);
  }

  const status = getRequiredField("status");
  const priority = getRequiredField("priority");
  const trackId = getRequiredField("track_id");
  const createdAt = getRequiredField("created_at");
  const updatedAt = getRequiredField("updated_at");
  const completionRaw = frontmatter.completion;
  const compactedAtRaw = frontmatter.compacted_at;
  const historyPathRaw = frontmatter.history_path;

  if (!TRACK_STATUSES.includes(status as TrackStatus)) {
    throw new Error("Invalid status");
  }
  if (!TRACK_PRIORITIES.includes(priority as TrackPriority)) {
    throw new Error("Invalid priority");
  }

  const requiredSections = ["overview", "tasks", "decisions", "log"] as const;
  for (const requiredSection of requiredSections) {
    if (!(requiredSection in sections)) {
      const heading = requiredSection.charAt(0).toUpperCase() + requiredSection.slice(1);
      throw new Error(`Missing section: ${heading}`);
    }
  }

  let completion: number | undefined;
  if (completionRaw !== undefined) {
    const parsedCompletion = Number.parseInt(completionRaw, 10);
    if (!Number.isInteger(parsedCompletion)) {
      throw new Error("Invalid completion");
    }
    completion = parsedCompletion;
  }

  return {
    frontmatter: {
      track_id: trackId,
      status: status as TrackStatus,
      priority: priority as TrackPriority,
      created_at: createdAt,
      updated_at: updatedAt,
      ...(completion !== undefined ? { completion } : {}),
      ...(compactedAtRaw !== undefined ? { compacted_at: compactedAtRaw } : {}),
      ...(historyPathRaw !== undefined ? { history_path: historyPathRaw } : {})
    },
    sections: {
      overview: sections.overview ?? "",
      tasks: sections.tasks ?? "",
      decisions: sections.decisions ?? "",
      log: sections.log ?? ""
    }
  };
}
