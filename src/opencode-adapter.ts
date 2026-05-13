/**
 * Generates OpenCode adapter outputs from canonical Bitacora sources.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
} from './platform-template-renderer.js';

type SyncOpenCodeAdapterOptions = {
  cwd?: string;
};

export const OPENCODE_AGENT_FILES = ['manager.md', 'coder.md', 'reviewer.md'] as const;

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
