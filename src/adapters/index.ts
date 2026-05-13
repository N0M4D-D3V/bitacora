/**
 * Registers and runs the generated runtime adapters.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { syncClaudeAdapter } from '../claude-adapter.js';
import {
  assertNoDuplicateOutputPaths,
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
} from '../platform-template-renderer.js';
import { OPENCODE_GENERATED_PATHS, opencodeAdapter } from './opencode.js';

export type AdapterContext = {
  cwd?: string;
};

type AdapterDefinition = {
  name: string;
  generate: (context: AdapterContext) => Promise<void>;
  clean: (context: AdapterContext) => Promise<void>;
  generatedPaths: readonly string[];
};

type SyncCommandOptions = AdapterContext & {
  writeStdout?: (chunk: string) => void;
};

const CODEX_GENERATED_PATHS = ['.agents/skills/bitacora-cli/SKILL.md'] as const;

const codexAdapter: AdapterDefinition = {
  name: 'codex',
  async generate(context: AdapterContext): Promise<void> {
    const cwd = context.cwd ?? process.cwd();
    const codexSkillDir = path.join(cwd, '.agents/skills/bitacora-cli');
    const skillContent = await readFile(
      path.join(cwd, '.bitacora/skills/bitacora-cli/SKILL.md'),
      'utf8'
    );

    await mkdir(codexSkillDir, { recursive: true });
    await writeFile(
      path.join(codexSkillDir, 'SKILL.md'),
      renderPlatformTemplate('codex', 'skill', parseCanonicalTemplateMarkdown(skillContent))
    );
  },
  async clean(context: AdapterContext): Promise<void> {
    const cwd = context.cwd ?? process.cwd();

    await rm(path.join(cwd, '.agents/skills/bitacora-cli/SKILL.md'), { force: true });
  },
  generatedPaths: CODEX_GENERATED_PATHS,
};

const REGISTERED_ADAPTERS: readonly AdapterDefinition[] = [
  {
    name: 'claude',
    generate: syncClaudeAdapter,
    clean: async () => {},
    generatedPaths: [
      '.claude/agents/manager.md',
      '.claude/agents/coder.md',
      '.claude/agents/reviewer.md',
      '.claude/skills/bitacora-cli/SKILL.md',
      '.claude/settings.json',
    ],
  },
  {
    ...opencodeAdapter,
    generatedPaths: OPENCODE_GENERATED_PATHS,
  },
  codexAdapter,
];

export const GENERATED_ADAPTER_PATHS = REGISTERED_ADAPTERS.flatMap(
  (adapter) => adapter.generatedPaths
);

assertNoDuplicateOutputPaths(GENERATED_ADAPTER_PATHS);

export async function syncAllAdapters(context: AdapterContext = {}): Promise<string[]> {
  for (const adapter of REGISTERED_ADAPTERS) {
    await adapter.generate(context);
  }

  return [...GENERATED_ADAPTER_PATHS];
}

export async function runSyncCommand(options: SyncCommandOptions = {}): Promise<void> {
  const writeStdout = options.writeStdout ?? ((chunk: string) => process.stdout.write(chunk));
  const generatedPaths = await syncAllAdapters(options);

  writeStdout(`${generatedPaths.join('\n')}\n`);
}
