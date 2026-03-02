import { describe, expect, it } from "vitest";

import { parseTrackMarkdown } from "../../src/core/parser";

describe("parseTrackMarkdown", () => {
  it("parses a valid track markdown file", () => {
    const markdown = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
Overview text

# Tasks
- task

# Decisions
- decision

# Log
- 2026-02-27T00:00:00.000Z | created
`;

    const parsed = parseTrackMarkdown(markdown);

    expect(parsed.frontmatter.track_id).toBe("TRACK-001");
    expect(parsed.frontmatter.status).toBe("active");
    expect(parsed.frontmatter.priority).toBe("medium");
    expect(parsed.sections.log).toContain("created");
  });

  it("throws when frontmatter is missing", () => {
    const markdown = `
# Overview
Overview text

# Tasks
- task

# Decisions
- decision

# Log
- 2026-02-27T00:00:00.000Z | created
`;

    expect(() => parseTrackMarkdown(markdown)).toThrowError("Missing frontmatter");
  });

  it("throws when a required section is missing", () => {
    const markdown = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
Overview text

# Tasks
- task

# Log
- 2026-02-27T00:00:00.000Z | created
`;

    expect(() => parseTrackMarkdown(markdown)).toThrowError("Missing section: Decisions");
  });

  it("throws when status is invalid", () => {
    const markdown = `---
track_id: TRACK-001
status: started
priority: medium
created_at: 2026-02-27T00:00:00.000Z
updated_at: 2026-02-27T00:00:00.000Z
---

# Overview
Overview text

# Tasks
- task

# Decisions
- decision

# Log
- 2026-02-27T00:00:00.000Z | created
`;

    expect(() => parseTrackMarkdown(markdown)).toThrowError("Invalid status");
  });

  it("throws when required frontmatter fields are missing", () => {
    const markdown = `---
track_id: TRACK-001
status: active
priority: medium
created_at: 2026-02-27T00:00:00.000Z
---

# Overview
Overview text

# Tasks
- task

# Decisions
- decision

# Log
- 2026-02-27T00:00:00.000Z | created
`;

    expect(() => parseTrackMarkdown(markdown)).toThrowError("Missing frontmatter field: updated_at");
  });

  it("normalizes windows newlines deterministically", () => {
    const markdown = `---\r
track_id: TRACK-001\r
status: active\r
priority: medium\r
created_at: 2026-02-27T00:00:00.000Z\r
updated_at: 2026-02-27T00:00:00.000Z\r
---\r
\r
# Overview\r
Overview text\r
\r
# Tasks\r
- task\r
\r
# Decisions\r
- decision\r
\r
# Log\r
- 2026-02-27T00:00:00.000Z | created\r
`;

    const parsed = parseTrackMarkdown(markdown);
    expect(parsed.sections.overview).toBe("Overview text");
    expect(parsed.sections.log).toBe("- 2026-02-27T00:00:00.000Z | created");
  });
});
