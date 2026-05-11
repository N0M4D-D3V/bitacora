/**
 * Registers and runs the generated runtime adapters.
 */

import { syncClaudeAdapter } from '../claude-adapter.js';
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
];

export const GENERATED_ADAPTER_PATHS = REGISTERED_ADAPTERS.flatMap(
  (adapter) => adapter.generatedPaths
);

export async function syncAllAdapters(context: AdapterContext = {}): Promise<string[]> {
  for (const adapter of REGISTERED_ADAPTERS) {
    await adapter.generate(context);
  }

  return [...GENERATED_ADAPTER_PATHS];
}
