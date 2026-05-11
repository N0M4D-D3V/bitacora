/**
 * Generates Claude adapter outputs from canonical Bitacora sources.
 */

import { access, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

type SyncClaudeAdapterOptions = {
  cwd?: string;
};

type ClaudeDenyRule = {
  tool: string;
  pattern: string;
};

type ClaudeAgentFrontmatter = {
  name: string;
  description: string;
  model: string;
  allowedTools: string[];
};

type JsonValue = boolean | null | number | string | JsonValue[] | JsonObject;

type JsonObject = {
  [key: string]: JsonValue;
};

const CLAUDE_AGENT_FILES = ['manager.md', 'coder.md', 'reviewer.md'] as const;

const REQUIRED_DENY_RULES: ClaudeDenyRule[] = [
  { tool: 'Edit', pattern: '.bitacora/harness/**' },
  { tool: 'Write', pattern: '.bitacora/harness/**' },
  { tool: 'Edit', pattern: '.bitacora/memory/**' },
  { tool: 'Write', pattern: '.bitacora/memory/**' },
];

const CLAUDE_AGENT_TOOLS: Record<string, string[]> = {
  manager: ['Read', 'Glob', 'Grep', 'Bash'],
  coder: ['Read', 'Glob', 'Grep', 'Bash', 'Edit', 'Write'],
  reviewer: ['Read', 'Glob', 'Grep', 'Bash'],
};

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

  await recreateRelativeSymlink(
    path.join(cwd, '.bitacora/skills/bitacora-cli/SKILL.md'),
    path.join(claudeSkillDir, 'SKILL.md')
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

function translateClaudeAgentMarkdown(markdown: string): string {
  const { frontmatter, body } = parseCanonicalAgentMarkdown(markdown);
  const allowedTools = CLAUDE_AGENT_TOOLS[frontmatter.name] ?? ['Read', 'Glob', 'Grep', 'Bash'];
  const claudeFrontmatter: ClaudeAgentFrontmatter = {
    name: frontmatter.name,
    description: frontmatter.description,
    model: 'sonnet',
    allowedTools,
  };

  return `${serializeClaudeAgentFrontmatter(claudeFrontmatter)}\n\n${body}`;
}

function parseCanonicalAgentMarkdown(markdown: string): {
  frontmatter: { name: string; description: string };
  body: string;
} {
  const normalized = markdown.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    throw new Error('Canonical agent markdown must start with YAML frontmatter');
  }

  const frontmatterEnd = normalized.indexOf('\n---\n', 4);

  if (frontmatterEnd === -1) {
    throw new Error('Canonical agent markdown frontmatter is not terminated');
  }

  const frontmatterLines = normalized.slice(4, frontmatterEnd).split('\n');
  const frontmatterEntries = new Map<string, string>();

  for (const line of frontmatterLines) {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    frontmatterEntries.set(key, value);
  }

  const name = frontmatterEntries.get('name');
  const description = frontmatterEntries.get('description');

  if (!name || !description) {
    throw new Error('Canonical agent markdown must include name and description frontmatter');
  }

  return {
    frontmatter: { name, description },
    body: normalized.slice(frontmatterEnd + '\n---\n'.length),
  };
}

function serializeClaudeAgentFrontmatter(frontmatter: ClaudeAgentFrontmatter): string {
  return [
    '---',
    `name: ${frontmatter.name}`,
    `description: ${frontmatter.description}`,
    `model: ${frontmatter.model}`,
    `allowed-tools: ${frontmatter.allowedTools.join(', ')}`,
    '---',
  ].join('\n');
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

async function recreateRelativeSymlink(targetPath: string, linkPath: string): Promise<void> {
  await rm(linkPath, { force: true });
  await symlink(path.relative(path.dirname(linkPath), targetPath), linkPath);
}
