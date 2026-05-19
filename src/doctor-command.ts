/**
 * Implements read-only `bitacora doctor` diagnostics.
 */

import { createHash } from 'node:crypto';
import { access, lstat, readFile, readlink, stat } from 'node:fs/promises';
import path from 'node:path';

import { BitacoraError } from './bitacora-error.js';
import {
  CLAUDE_AGENT_FILES,
  REQUIRED_DENY_RULES,
  translateClaudeAgentMarkdown,
  translateClaudeSkillMarkdown,
} from './claude-adapter.js';
import {
  type CurrentMemory,
  parseCurrentMemory,
  parseHistoryMemory,
  parseLessonsMemory,
} from './memory-storage.js';
import {
  loadManagedOpenCodeAgents,
  OPENCODE_AGENT_FILES,
  OPENCODE_MANAGED_AGENT_NAMES,
  parseOpenCodeConfig,
  translateOpenCodeAgentMarkdown,
  translateOpenCodeSkillMarkdown,
} from './opencode-adapter.js';
import {
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
} from './platform-template-renderer.js';

type DoctorCommandOptions = {
  cwd?: string;
  now?: Date;
  writeStdout?: (chunk: string) => void;
};

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue };

type CheckResult = {
  label: string;
  ok: boolean;
  details: string[];
};

const REQUIRED_STRUCTURE_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.bitacora',
  '.bitacora/version',
  '.bitacora/.lock',
  '.bitacora/harness/architecture.md',
  '.bitacora/harness/convention.md',
  '.bitacora/harness/verification.md',
  '.bitacora/harness/checkpoints.md',
  '.bitacora/memory/current.json',
  '.bitacora/memory/history.jsonl',
  '.bitacora/memory/lessons.jsonl',
  '.bitacora/agents/manager.md',
  '.bitacora/agents/coder.md',
  '.bitacora/agents/reviewer.md',
  '.bitacora/skills/bitacora-cli/SKILL.md',
  '.claude/settings.json',
  '.claude/agents/manager.md',
  '.claude/agents/coder.md',
  '.claude/agents/reviewer.md',
  '.claude/skills/bitacora-cli/SKILL.md',
  '.opencode/agents/manager.md',
  '.opencode/agents/coder.md',
  '.opencode/agents/reviewer.md',
  '.opencode/skills/bitacora-cli/SKILL.md',
  '.agents/skills/bitacora-cli/SKILL.md',
] as const;

export async function runDoctorCommand(options: DoctorCommandOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const writeStdout = options.writeStdout ?? ((chunk: string) => process.stdout.write(chunk));
  const results = await Promise.all([
    checkRequiredStructure(cwd),
    checkMemorySchemas(cwd),
    checkCurrentOrphan(cwd, now),
    checkRootSymlinks(cwd),
    checkAdapterDrift(cwd),
    checkClaudePermissions(cwd),
    checkMemorySizes(cwd),
  ]);
  const failed = results.some((result) => !result.ok);

  writeStdout(`${formatDoctorReport(results, failed)}\n`);

  if (failed) {
    throw new BitacoraError('doctor checks failed', 1);
  }
}

async function checkRequiredStructure(cwd: string): Promise<CheckResult> {
  const missingPaths: string[] = [];

  for (const relativePath of REQUIRED_STRUCTURE_PATHS) {
    if (!(await pathExists(path.join(cwd, relativePath)))) {
      missingPaths.push(`missing required path: ${relativePath}`);
    }
  }

  return {
    label: 'structure',
    ok: missingPaths.length === 0,
    details: missingPaths.length === 0 ? ['all required paths are present'] : missingPaths,
  };
}

async function checkMemorySchemas(cwd: string): Promise<CheckResult> {
  const results = await Promise.all([
    checkMemorySchema(
      path.join(cwd, '.bitacora/memory/current.json'),
      'current.json',
      parseCurrentMemory
    ),
    checkMemorySchema(
      path.join(cwd, '.bitacora/memory/history.jsonl'),
      'history.jsonl',
      parseHistoryMemory
    ),
    checkMemorySchema(
      path.join(cwd, '.bitacora/memory/lessons.jsonl'),
      'lessons.jsonl',
      parseLessonsMemory
    ),
  ]);

  const failures = results.flatMap((result) => result.failure ?? []);

  return {
    label: 'schema',
    ok: failures.length === 0,
    details:
      failures.length === 0 ? results.map((result) => `${result.label} schema valid`) : failures,
  };
}

async function checkCurrentOrphan(cwd: string, now: Date): Promise<CheckResult> {
  const currentPath = path.join(cwd, '.bitacora/memory/current.json');

  try {
    const currentMemory = parseCurrentMemory(await readFile(currentPath, 'utf8'));

    if (isCurrentMemoryActive(currentMemory)) {
      const startedAt = Date.parse(currentMemory.start);

      if (Number.isFinite(startedAt) && now.getTime() - startedAt > 24 * 60 * 60 * 1000) {
        return {
          label: 'orphan',
          ok: false,
          details: [`current.json appears orphaned (start=${currentMemory.start})`],
        };
      }
    }

    return {
      label: 'orphan',
      ok: true,
      details: ['current.json is not orphaned'],
    };
  } catch (error) {
    return {
      label: 'orphan',
      ok: false,
      details: [`cannot evaluate orphan check: ${getErrorMessage(error)}`],
    };
  }
}

async function checkRootSymlinks(cwd: string): Promise<CheckResult> {
  const symlinkNames = ['CLAUDE.md', 'GEMINI.md'] as const;
  const failures: string[] = [];

  for (const symlinkName of symlinkNames) {
    const linkPath = path.join(cwd, symlinkName);
    const expectedTargetPath = path.join(cwd, 'AGENTS.md');

    try {
      const linkStats = await lstat(linkPath);

      if (!linkStats.isSymbolicLink()) {
        failures.push(`${symlinkName} does not resolve to AGENTS.md`);
        continue;
      }

      const linkTarget = await readlink(linkPath);
      const resolvedTargetPath = path.resolve(path.dirname(linkPath), linkTarget);

      if (resolvedTargetPath !== expectedTargetPath || !(await fileExists(expectedTargetPath))) {
        failures.push(`${symlinkName} does not resolve to AGENTS.md`);
      }
    } catch {
      failures.push(`${symlinkName} does not resolve to AGENTS.md`);
    }
  }

  return {
    label: 'symlinks',
    ok: failures.length === 0,
    details: failures.length === 0 ? ['CLAUDE.md and GEMINI.md resolve to AGENTS.md'] : failures,
  };
}

async function checkAdapterDrift(cwd: string): Promise<CheckResult> {
  const issues: string[] = [];

  for (const fileName of CLAUDE_AGENT_FILES) {
    const canonicalRelativePath = `.bitacora/agents/${fileName}`;
    const relativePath = `.claude/agents/${fileName}`;
    const canonicalContent = await readDriftTarget(cwd, canonicalRelativePath, issues);

    if (canonicalContent === undefined) {
      continue;
    }

    const expectedContent = translateClaudeAgentMarkdown(canonicalContent);

    await collectFileDrift(cwd, relativePath, expectedContent, issues);
  }

  for (const fileName of OPENCODE_AGENT_FILES) {
    const canonicalRelativePath = `.bitacora/agents/${fileName}`;
    const relativePath = `.opencode/agents/${fileName}`;
    const canonicalContent = await readDriftTarget(cwd, canonicalRelativePath, issues);

    if (canonicalContent === undefined) {
      continue;
    }

    const expectedContent = translateOpenCodeAgentMarkdown(canonicalContent);

    await collectFileDrift(cwd, relativePath, expectedContent, issues);
  }

  const canonicalSkillContent = await readDriftTarget(
    cwd,
    '.bitacora/skills/bitacora-cli/SKILL.md',
    issues
  );

  if (canonicalSkillContent !== undefined) {
    await collectFileDrift(
      cwd,
      '.claude/skills/bitacora-cli/SKILL.md',
      translateClaudeSkillMarkdown(canonicalSkillContent),
      issues
    );
    await collectFileDrift(
      cwd,
      '.opencode/skills/bitacora-cli/SKILL.md',
      translateOpenCodeSkillMarkdown(canonicalSkillContent),
      issues
    );
    await collectFileDrift(
      cwd,
      '.agents/skills/bitacora-cli/SKILL.md',
      renderPlatformTemplate(
        'codex',
        'skill',
        parseCanonicalTemplateMarkdown(canonicalSkillContent)
      ),
      issues
    );
  }

  await collectOpenCodeConfigDrift(cwd, issues);

  return {
    label: 'adapter-drift',
    ok: issues.length === 0,
    details:
      issues.length === 0
        ? ['adapter outputs are in sync']
        : [...issues, 'run `bitacora sync` to regenerate adapter outputs'],
  };
}

async function collectOpenCodeConfigDrift(cwd: string, issues: string[]): Promise<void> {
  const configContent = await readDriftTarget(cwd, 'opencode.json', issues);

  if (configContent === undefined) {
    return;
  }

  try {
    const actualConfig = parseOpenCodeConfig(configContent);
    const actualAgentValue = actualConfig.agent;

    if (actualAgentValue !== undefined && !isJsonObject(actualAgentValue)) {
      issues.push(
        'cannot read drift target: opencode.json (opencode.json agent key must be a JSON object when present)'
      );
      return;
    }

    const actualAgents = readJsonObject(actualAgentValue);
    const expectedAgents = await loadManagedOpenCodeAgents(cwd);

    for (const agentName of OPENCODE_MANAGED_AGENT_NAMES) {
      const actualAgent = actualAgents[agentName];
      const expectedAgent = expectedAgents[agentName];

      if (!isJsonObject(actualAgent) || expectedAgent === undefined) {
        issues.push(`adapter drift detected: opencode.json#agent.${agentName}`);
        continue;
      }

      if (!jsonValuesEqual(actualAgent, expectedAgent)) {
        issues.push(`adapter drift detected: opencode.json#agent.${agentName}`);
      }
    }
  } catch (error) {
    issues.push(`cannot read drift target: opencode.json (${getErrorMessage(error)})`);
  }
}

async function checkClaudePermissions(cwd: string): Promise<CheckResult> {
  const settingsPath = path.join(cwd, '.claude/settings.json');

  try {
    const rawSettings = JSON.parse(await readFile(settingsPath, 'utf8')) as JsonValue;
    const settings = readJsonObject(rawSettings);
    const permissions = readJsonObject(settings.permissions);
    const denyRules = Array.isArray(permissions.deny) ? permissions.deny : [];
    const missingRules = REQUIRED_DENY_RULES.filter(
      (requiredRule) =>
        !denyRules.some(
          (rule) =>
            isJsonObject(rule) &&
            rule.tool === requiredRule.tool &&
            rule.pattern === requiredRule.pattern
        )
    ).map((rule) => `missing Claude deny rule: ${rule.tool} ${rule.pattern}`);

    return {
      label: 'permissions',
      ok: missingRules.length === 0,
      details: missingRules.length === 0 ? ['Claude deny rules are present'] : missingRules,
    };
  } catch (error) {
    return {
      label: 'permissions',
      ok: false,
      details: [`cannot validate Claude deny rules: ${getErrorMessage(error)}`],
    };
  }
}

async function checkMemorySizes(cwd: string): Promise<CheckResult> {
  const details: string[] = [];
  let ok = true;

  const historySize = await readSizeTarget(cwd, '.bitacora/memory/history.jsonl');

  if (historySize.ok) {
    details.push(`history.jsonl: ${historySize.size} bytes`);
  } else {
    ok = false;
    details.push(historySize.detail);
  }

  const lessonsSize = await readSizeTarget(cwd, '.bitacora/memory/lessons.jsonl');

  if (lessonsSize.ok) {
    details.push(`lessons.jsonl: ${lessonsSize.size} bytes`);
  } else {
    ok = false;
    details.push(lessonsSize.detail);
  }

  return {
    label: 'sizes',
    ok,
    details,
  };
}

async function collectFileDrift(
  cwd: string,
  relativePath: string,
  expectedContent: string,
  issues: string[]
): Promise<void> {
  const outputPath = path.join(cwd, relativePath);

  let actualContent: string;

  try {
    actualContent = await readFile(outputPath, 'utf8');
  } catch (error) {
    issues.push(formatDriftTargetFailure(relativePath, error));
    return;
  }

  if (hashContent(actualContent) !== hashContent(expectedContent)) {
    issues.push(`adapter drift detected: ${relativePath}`);
  }
}

async function readDriftTarget(
  cwd: string,
  relativePath: string,
  issues: string[]
): Promise<string | undefined> {
  try {
    return await readFile(path.join(cwd, relativePath), 'utf8');
  } catch (error) {
    issues.push(formatDriftTargetFailure(relativePath, error));
    return undefined;
  }
}

async function readSizeTarget(
  cwd: string,
  relativePath: string
): Promise<{ ok: true; size: number } | { ok: false; detail: string }> {
  try {
    const targetStats = await stat(path.join(cwd, relativePath));
    return { ok: true, size: targetStats.size };
  } catch (error) {
    return { ok: false, detail: formatSizeTargetFailure(relativePath, error) };
  }
}

async function checkMemorySchema<T>(
  filePath: string,
  label: string,
  parse: (content: string) => T
): Promise<{ label: string; failure?: string[] }> {
  try {
    parse(await readFile(filePath, 'utf8'));
    return { label };
  } catch (error) {
    return {
      label,
      failure: [`${label} schema invalid: ${getErrorMessage(error)}`],
    };
  }
}

function formatDoctorReport(results: CheckResult[], failed: boolean): string {
  const lines = [`doctor: ${failed ? 'fail' : 'ok'}`];

  for (const result of results) {
    lines.push(`[${result.ok ? 'ok' : 'fail'}] ${result.label}`);

    for (const detail of result.details) {
      lines.push(`  - ${detail}`);
    }
  }

  return lines.join('\n');
}

function isCurrentMemoryActive(
  value: CurrentMemory
): value is Exclude<CurrentMemory, Record<string, never>> {
  return 'start' in value;
}

function readJsonObject(value: JsonValue | undefined): { [key: string]: JsonValue } {
  return isJsonObject(value) ? value : {};
}

function isJsonObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function jsonValuesEqual(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => jsonValuesEqual(value, right[index]));
  }

  if (isJsonObject(left) || isJsonObject(right)) {
    if (!isJsonObject(left) || !isJsonObject(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every(
      (key) => Object.hasOwn(right, key) && jsonValuesEqual(left[key], right[key])
    );
  }

  return false;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDriftTargetFailure(relativePath: string, error: unknown): string {
  if (isMissingFileError(error)) {
    return `missing drift target: ${relativePath}`;
  }

  return `cannot read drift target: ${relativePath} (${getErrorMessage(error)})`;
}

function formatSizeTargetFailure(relativePath: string, error: unknown): string {
  if (isMissingFileError(error)) {
    return `missing size target: ${relativePath}`;
  }

  return `cannot read size target: ${relativePath} (${getErrorMessage(error)})`;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
