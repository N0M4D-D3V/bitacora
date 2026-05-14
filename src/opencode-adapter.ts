/**
 * Generates OpenCode adapter outputs from canonical Bitacora sources.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BitacoraError } from './bitacora-error.js';
import {
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
} from './platform-template-renderer.js';

type SyncOpenCodeAdapterOptions = {
  cwd?: string;
};

type JsonValue = boolean | null | number | string | JsonValue[] | JsonObject;

type JsonObject = {
  [key: string]: JsonValue;
};

type OpenCodeManagedAgentName = (typeof OPENCODE_MANAGED_AGENT_NAMES)[number];

export type OpenCodeManagedAgents = Partial<Record<OpenCodeManagedAgentName, JsonObject>>;

export const OPENCODE_AGENT_FILES = ['manager.md', 'coder.md', 'reviewer.md'] as const;

export const OPENCODE_MANAGED_AGENT_NAMES = ['manager', 'coder', 'reviewer'] as const;

export class OpenCodeConfigError extends BitacoraError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'OpenCodeConfigError';
  }
}

export async function syncOpenCodeAdapter(options: SyncOpenCodeAdapterOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const opencodeAgentsDir = path.join(cwd, '.opencode/agents');
  const opencodeSkillDir = path.join(cwd, '.opencode/skills/bitacora-cli');

  await mkdir(opencodeAgentsDir, { recursive: true });
  await mkdir(opencodeSkillDir, { recursive: true });

  await Promise.all(
    OPENCODE_AGENT_FILES.map(async (fileName) => {
      const sourcePath = path.join(cwd, '.bitacora/agents', fileName);
      const outputPath = path.join(opencodeAgentsDir, fileName);
      const content = await readFile(sourcePath, 'utf8');

      await writeFile(outputPath, translateOpenCodeAgentMarkdown(content));
    })
  );

  const skillContent = await readFile(
    path.join(cwd, '.bitacora/skills/bitacora-cli/SKILL.md'),
    'utf8'
  );

  await writeFile(
    path.join(opencodeSkillDir, 'SKILL.md'),
    translateOpenCodeSkillMarkdown(skillContent)
  );
}

export function translateOpenCodeAgentMarkdown(markdown: string): string {
  return renderPlatformTemplate('opencode', 'subagent', parseCanonicalTemplateMarkdown(markdown));
}

export function translateOpenCodeSkillMarkdown(markdown: string): string {
  return renderPlatformTemplate('opencode', 'skill', parseCanonicalTemplateMarkdown(markdown));
}

export function renderOpenCodeConfig(
  existingContent: string | undefined,
  managedAgents: OpenCodeManagedAgents
): string {
  const existingConfig = existingContent === undefined ? {} : parseOpenCodeConfig(existingContent);

  return `${JSON.stringify(mergeBitacoraOpenCodeAgents(existingConfig, managedAgents), null, 2)}\n`;
}

export function mergeBitacoraOpenCodeAgents(
  existingConfig: JsonObject,
  managedAgents: OpenCodeManagedAgents
): JsonObject {
  const existingAgentValue = existingConfig.agent;

  if (existingAgentValue !== undefined && !isJsonObject(existingAgentValue)) {
    throw new OpenCodeConfigError('opencode.json agent key must be a JSON object when present');
  }

  const existingAgents = readJsonObject(existingAgentValue);
  const managedAgentEntries = OPENCODE_MANAGED_AGENT_NAMES.reduce<OpenCodeManagedAgents>(
    (entries, agentName) => {
      const managedAgent = managedAgents[agentName];

      if (managedAgent !== undefined) {
        entries[agentName] = managedAgent;
      }

      return entries;
    },
    {}
  );

  return mergeJsonObjects(existingConfig, {
    agent: mergeJsonObjects(existingAgents, managedAgentEntries),
  });
}

function parseOpenCodeConfig(content: string): JsonObject {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(content);
  } catch {
    throw new OpenCodeConfigError('opencode.json must contain valid JSON');
  }

  if (!isJsonObject(parsedValue)) {
    throw new OpenCodeConfigError('opencode.json root must be a JSON object');
  }

  return parsedValue;
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

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
