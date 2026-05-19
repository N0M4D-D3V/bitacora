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

const OPENCODE_CONFIG_SCHEMA = 'https://opencode.ai/config.json';
const OPENCODE_MANAGED_AGENT_RUNTIME_KEYS = ['description', 'mode'] as const;
const BITACORA_METADATA_KEY = '_bitacora';
const OPENCODE_MANAGED_AGENTS_METADATA_KEY = 'managedOpenCodeAgents';
const OPENCODE_AGENT_MODES: Record<OpenCodeManagedAgentName, string> = {
  manager: 'primary',
  coder: 'subagent',
  reviewer: 'subagent',
};

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

  const existingConfig = await readOptionalUtf8File(path.join(cwd, 'opencode.json'));
  const managedAgents = await loadManagedOpenCodeAgents(cwd);

  await writeFile(
    path.join(cwd, 'opencode.json'),
    renderOpenCodeConfig(existingConfig, managedAgents)
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
  const mergedConfig = mergeBitacoraOpenCodeAgents(existingConfig, managedAgents);
  const { $schema: _ignoredSchema, ...configWithoutSchema } = mergedConfig;
  const configWithSchema = {
    $schema: OPENCODE_CONFIG_SCHEMA,
    ...configWithoutSchema,
  };

  return `${JSON.stringify(configWithSchema, null, 2)}\n`;
}

export function mergeBitacoraOpenCodeAgents(
  existingConfig: JsonObject,
  managedAgents: OpenCodeManagedAgents
): JsonObject {
  validateManagedAgentKeys(managedAgents);

  const existingAgentValue = existingConfig.agent;

  if (existingAgentValue !== undefined && !isJsonObject(existingAgentValue)) {
    throw new OpenCodeConfigError('opencode.json agent key must be a JSON object when present');
  }

  const existingAgents = readJsonObject(existingAgentValue);
  const normalizedManagedAgents = normalizeManagedAgents(managedAgents);
  const ownershipProof = readBitacoraManagedAgentsOwnershipProof(existingConfig);

  assertNoUserManagedAgentConflicts(existingAgents, normalizedManagedAgents, ownershipProof);

  return {
    ...existingConfig,
    agent: {
      ...existingAgents,
      ...normalizedManagedAgents,
    },
    [BITACORA_METADATA_KEY]: mergeBitacoraMetadata(existingConfig, normalizedManagedAgents),
  };
}

export function parseOpenCodeConfig(content: string): JsonObject {
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

export async function loadManagedOpenCodeAgents(cwd: string): Promise<OpenCodeManagedAgents> {
  const managedAgents: OpenCodeManagedAgents = {};
  const seenAgentNames = new Set<OpenCodeManagedAgentName>();

  for (const fileName of OPENCODE_AGENT_FILES) {
    const sourcePath = path.join(cwd, '.bitacora/agents', fileName);
    const content = await readFile(sourcePath, 'utf8');
    const template = parseCanonicalTemplateMarkdown(content);
    const agentName = readManagedAgentName(template.id);

    if (seenAgentNames.has(agentName)) {
      throw new OpenCodeConfigError(`Duplicate OpenCode managed agent id: ${agentName}`);
    }

    seenAgentNames.add(agentName);
    managedAgents[agentName] = {
      description: template.description,
      mode: OPENCODE_AGENT_MODES[agentName],
    };
  }

  return managedAgents;
}

async function readOptionalUtf8File(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return undefined;
    }

    throw error;
  }
}

function readManagedAgentName(id: string): OpenCodeManagedAgentName {
  if (!isManagedAgentName(id)) {
    throw new OpenCodeConfigError(`Unsupported OpenCode managed agent id: ${id}`);
  }

  return id;
}

function validateManagedAgentKeys(managedAgents: OpenCodeManagedAgents): void {
  for (const agentName of Object.keys(managedAgents)) {
    if (!isManagedAgentName(agentName)) {
      throw new OpenCodeConfigError(`Unsupported OpenCode managed agent id: ${agentName}`);
    }
  }
}

function normalizeManagedAgents(managedAgents: OpenCodeManagedAgents): OpenCodeManagedAgents {
  const normalizedManagedAgents: OpenCodeManagedAgents = {};

  for (const agentName of OPENCODE_MANAGED_AGENT_NAMES) {
    const managedAgent = managedAgents[agentName];

    if (managedAgent === undefined) {
      continue;
    }

    normalizedManagedAgents[agentName] = normalizeManagedAgent(managedAgent);
  }

  return normalizedManagedAgents;
}

function normalizeManagedAgent(managedAgent: JsonObject): JsonObject {
  const description = managedAgent.description;
  const mode = managedAgent.mode;

  return {
    ...(typeof description === 'string' ? { description } : {}),
    ...(typeof mode === 'string' ? { mode } : {}),
  };
}

function assertNoUserManagedAgentConflicts(
  existingAgents: JsonObject,
  normalizedManagedAgents: OpenCodeManagedAgents,
  ownershipProof: ReadonlySet<OpenCodeManagedAgentName>
): void {
  for (const agentName of OPENCODE_MANAGED_AGENT_NAMES) {
    if (normalizedManagedAgents[agentName] === undefined) {
      continue;
    }

    const existingAgent = existingAgents[agentName];

    if (existingAgent === undefined) {
      continue;
    }

    if (ownershipProof.has(agentName)) {
      continue;
    }

    if (!isJsonObject(existingAgent)) {
      throw new OpenCodeConfigError(
        `OpenCode agent name conflict at opencode.json#agent.${agentName}: existing entry must be a JSON object`
      );
    }

    const userManagedKeys = Object.keys(existingAgent)
      .filter((key) => !isOpenCodeManagedAgentRuntimeKey(key))
      .sort();

    if (userManagedKeys.length > 0) {
      throw new OpenCodeConfigError(
        `OpenCode agent name conflict at opencode.json#agent.${agentName}: existing entry contains user-managed keys: ${userManagedKeys.join(', ')}`
      );
    }

    throw new OpenCodeConfigError(
      `OpenCode agent name conflict at opencode.json#agent.${agentName}: existing entry is user-managed and Bitacora cannot prove ownership`
    );
  }
}

function mergeBitacoraMetadata(
  existingConfig: JsonObject,
  normalizedManagedAgents: OpenCodeManagedAgents
): JsonObject {
  const existingMetadata = readJsonObject(existingConfig[BITACORA_METADATA_KEY]);
  const existingManagedAgents = readJsonObject(
    existingMetadata[OPENCODE_MANAGED_AGENTS_METADATA_KEY]
  );
  const managedAgentsMetadata = { ...existingManagedAgents };

  for (const agentName of OPENCODE_MANAGED_AGENT_NAMES) {
    if (normalizedManagedAgents[agentName] !== undefined) {
      managedAgentsMetadata[agentName] = true;
    }
  }

  return {
    ...existingMetadata,
    [OPENCODE_MANAGED_AGENTS_METADATA_KEY]: managedAgentsMetadata,
  };
}

function readBitacoraManagedAgentsOwnershipProof(
  existingConfig: JsonObject
): ReadonlySet<OpenCodeManagedAgentName> {
  const metadata = readJsonObject(existingConfig[BITACORA_METADATA_KEY]);
  const managedAgents = readJsonObject(metadata[OPENCODE_MANAGED_AGENTS_METADATA_KEY]);
  const ownershipProof = new Set<OpenCodeManagedAgentName>();

  for (const agentName of OPENCODE_MANAGED_AGENT_NAMES) {
    if (managedAgents[agentName] === true) {
      ownershipProof.add(agentName);
    }
  }

  return ownershipProof;
}

function readJsonObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isManagedAgentName(value: string): value is OpenCodeManagedAgentName {
  return OPENCODE_MANAGED_AGENT_NAMES.includes(value as OpenCodeManagedAgentName);
}

function isOpenCodeManagedAgentRuntimeKey(
  value: string
): value is (typeof OPENCODE_MANAGED_AGENT_RUNTIME_KEYS)[number] {
  return OPENCODE_MANAGED_AGENT_RUNTIME_KEYS.includes(
    value as (typeof OPENCODE_MANAGED_AGENT_RUNTIME_KEYS)[number]
  );
}

function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
}
