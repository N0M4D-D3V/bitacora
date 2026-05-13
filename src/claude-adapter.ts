/**
 * Generates Claude adapter outputs from canonical Bitacora sources.
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
} from './platform-template-renderer.js';

type SyncClaudeAdapterOptions = {
  cwd?: string;
};

type ClaudeDenyRule = {
  tool: string;
  pattern: string;
};

type JsonValue = boolean | null | number | string | JsonValue[] | JsonObject;

type JsonObject = {
  [key: string]: JsonValue;
};

export const CLAUDE_AGENT_FILES = ['manager.md', 'coder.md', 'reviewer.md'] as const;

export const REQUIRED_DENY_RULES: ClaudeDenyRule[] = [
  { tool: 'Edit', pattern: '.bitacora/harness/**' },
  { tool: 'Write', pattern: '.bitacora/harness/**' },
  { tool: 'Edit', pattern: '.bitacora/memory/**' },
  { tool: 'Write', pattern: '.bitacora/memory/**' },
];

export async function syncClaudeAdapter(options: SyncClaudeAdapterOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const claudeAgentsDir = path.join(cwd, '.claude/agents');
  const claudeSkillDir = path.join(cwd, '.claude/skills/bitacora-cli');

  await mkdir(claudeAgentsDir, { recursive: true });
  await mkdir(claudeSkillDir, { recursive: true });

  await Promise.all(
    CLAUDE_AGENT_FILES.map(async (fileName) => {
      const sourcePath = path.join(cwd, '.bitacora/agents', fileName);
      const outputPath = path.join(claudeAgentsDir, fileName);
      const content = await readFile(sourcePath, 'utf8');

      await writeFile(outputPath, translateClaudeAgentMarkdown(content));
    })
  );

  const skillContent = await readFile(
    path.join(cwd, '.bitacora/skills/bitacora-cli/SKILL.md'),
    'utf8'
  );

  await writeFile(
    path.join(claudeSkillDir, 'SKILL.md'),
    translateClaudeSkillMarkdown(skillContent)
  );

  const settingsPath = path.join(cwd, '.claude/settings.json');
  const existingSettings = await readJsonObjectIfExists(settingsPath);
  const mergedSettings = mergeJsonObjects(existingSettings, {
    permissions: mergeJsonObjects(readJsonObject(existingSettings.permissions), {
      deny: mergeDenyRules(existingSettings.permissions),
    }),
  });

  await writeFile(settingsPath, `${JSON.stringify(mergedSettings, null, 2)}\n`);
}

async function readJsonObjectIfExists(filePath: string): Promise<JsonObject> {
  try {
    await access(filePath);
  } catch {
    return {};
  }

  return readJsonObject(JSON.parse(await readFile(filePath, 'utf8')));
}

export function translateClaudeAgentMarkdown(markdown: string): string {
  return renderPlatformTemplate(
    'claude-code',
    'subagent',
    parseCanonicalTemplateMarkdown(markdown)
  );
}

export function translateClaudeSkillMarkdown(markdown: string): string {
  return renderPlatformTemplate('claude-code', 'skill', parseCanonicalTemplateMarkdown(markdown));
}

function mergeDenyRules(value: JsonValue | undefined): JsonValue[] {
  const existingPermissions = readJsonObject(value);
  const existingDeny = Array.isArray(existingPermissions.deny) ? existingPermissions.deny : [];
  const seenRules = new Set<string>();
  const mergedRules: JsonValue[] = [];

  for (const rule of [...existingDeny, ...REQUIRED_DENY_RULES]) {
    if (!isClaudeDenyRule(rule)) {
      mergedRules.push(rule);
      continue;
    }

    const ruleKey = `${rule.tool}\u0000${rule.pattern}`;

    if (seenRules.has(ruleKey)) {
      continue;
    }

    seenRules.add(ruleKey);
    mergedRules.push(rule);
  }

  return mergedRules;
}

function mergeJsonObjects(base: JsonObject, overlay: JsonObject): JsonObject {
  const merged: JsonObject = { ...base };

  for (const [key, overlayValue] of Object.entries(overlay)) {
    const baseValue = merged[key];

    if (isJsonObject(baseValue) && isJsonObject(overlayValue)) {
      merged[key] = mergeJsonObjects(baseValue, overlayValue);
      continue;
    }

    merged[key] = overlayValue;
  }

  return merged;
}

function readJsonObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}

function isClaudeDenyRule(value: JsonValue): value is ClaudeDenyRule {
  return isJsonObject(value) && typeof value.tool === 'string' && typeof value.pattern === 'string';
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
