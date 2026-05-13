/**
 * Declares the spec-shaped OpenCode adapter contract.
 */

import { rm } from 'node:fs/promises';
import path from 'node:path';

import { syncOpenCodeAdapter } from '../opencode-adapter.js';

export type AdapterContext = {
  cwd?: string;
};

export const OPENCODE_GENERATED_PATHS = [
  '.opencode/agents/manager.md',
  '.opencode/agents/coder.md',
  '.opencode/agents/reviewer.md',
  '.opencode/skills/bitacora-cli/SKILL.md',
] as const;

export const opencodeAdapter = {
  name: 'opencode',
  async generate(context: AdapterContext = {}): Promise<void> {
    await syncOpenCodeAdapter(context);
  },
  async clean(context: AdapterContext = {}): Promise<void> {
    const cwd = context.cwd ?? process.cwd();

    await rm(path.join(cwd, '.opencode/agents'), {
      recursive: true,
      force: true,
    });
    await rm(path.join(cwd, '.opencode/skills/bitacora-cli/SKILL.md'), {
      force: true,
    });
  },
} as const;
