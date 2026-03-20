import { describe, expect, it } from "vitest";

import {
  createAgentSkillTemplate,
  createIndexTemplate,
  createTrackTemplate,
  createTracksRegistryTemplate,
  createTracksTemplate,
  createWorkflowTemplate
} from "../../src/core/templates";

describe("context templates", () => {
  it("includes mandatory read/write rules in index and workflow templates", () => {
    const index = createIndexTemplate();
    const workflow = createWorkflowTemplate();

    expect(index).toContain("## File Index");
    expect(index).toContain("`product.md`");
    expect(index).toContain("`tech-stack.md`");
    expect(index).toContain("`workflow.md`");
    expect(index).toContain("`ux-style-guide.md`");
    expect(index).toContain("`tracks/tracks.md`");
    expect(index).toContain("`tracks/tracks-template.md`");
    expect(index).toContain("`tracks/TRACK-001/track.md`");
    expect(index).toContain("Always read this index at session start.");
    expect(index).toContain("Always update memory before session end.");
    expect(workflow).toContain("Always read `bitacora/index.md` at the beginning of every session.");
    expect(workflow).toContain("Always write handoff updates before ending a session.");
  });

  it("renders tracks registry and tracks template scaffolds", () => {
    const tracks = createTracksRegistryTemplate("2026-02-27");
    const trackTemplate = createTracksTemplate();

    expect(tracks).toContain("Last updated: 2026-02-27");
    expect(tracks).toContain("| TRACK-001 | Bootstrap memory");
    expect(trackTemplate).toContain("# Tracks Template");
    expect(trackTemplate).toContain("## Header");
    expect(trackTemplate).toContain("## Log");
  });

  it("renders a self-contained SKILL template for non-CLI usage", () => {
    const skill = createAgentSkillTemplate();

    expect(skill).toContain("---");
    expect(skill).toContain("name: bitacora");
    expect(skill).toContain("description: Keep deterministic project memory in bitacora/ and update it continuously during implementation sessions.");
    expect(skill).toContain("version: 1.1.1");
    expect(skill).toContain("type: local");
    expect(skill).toContain("source: .agents/skills/bitacora/SKILL.md");
    expect(skill).toContain("# Bitacora Skill");
    expect(skill).toContain("## Manual Bootstrap (No CLI Required)");
    expect(skill).toContain("bitacora/");
    expect(skill).toContain(".agents/skills/bitacora/SKILL.md");
    expect(skill).toContain("Always read `bitacora/index.md` at session start.");
  });
});

describe("createTrackTemplate", () => {
  it("renders deterministic track markdown with required structure", () => {
    const template = createTrackTemplate(
      "TRACK-001",
      "active",
      "medium",
      "2026-02-27T00:00:00.000Z"
    );

    expect(template).toContain("track_id: TRACK-001");
    expect(template).toContain("status: active");
    expect(template).toContain("priority: medium");
    expect(template).toContain("# Overview");
    expect(template).toContain("# Tasks");
    expect(template).toContain("# Decisions");
    expect(template).toContain("# Log");
    expect(template).toContain("- [ ] RED: add failing test(s)");
    expect(template).toContain("- 2026-02-27T00:00:00.000Z | track created");
  });
});
