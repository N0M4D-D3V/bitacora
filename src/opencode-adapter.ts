/**
 * Generates OpenCode adapter outputs from canonical Bitacora sources.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseCanonicalAgentMarkdown } from './canonical-agent-markdown.js';

type SyncOpenCodeAdapterOptions = {
  cwd?: string;
};

type OpenCodeAgentFrontmatter = {
  description: string;
  mode: 'subagent';
  permission?: {
    edit: 'deny';
  };
};

export const OPENCODE_AGENT_FILES = ['manager.md', 'coder.md', 'reviewer.md'] as const;

export async function syncOpenCodeAdapter(options: SyncOpenCodeAdapterOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const opencodeAgentsDir = path.join(cwd, '.opencode/agents');

  await mkdir(opencodeAgentsDir, { recursive: true });

  await Promise.all(
    OPENCODE_AGENT_FILES.map(async (fileName) => {
      const sourcePath = path.join(cwd, '.bitacora/agents', fileName);
      const outputPath = path.join(opencodeAgentsDir, fileName);
      const content = await readFile(sourcePath, 'utf8');

      await writeFile(outputPath, translateOpenCodeAgentMarkdown(content));
    })
  );
}

export function translateOpenCodeAgentMarkdown(markdown: string): string {
  const { frontmatter, body } = parseCanonicalAgentMarkdown(markdown);
  const opencodeFrontmatter: OpenCodeAgentFrontmatter = {
    description: frontmatter.description,
    mode: 'subagent',
    ...(frontmatter.name === 'coder' ? {} : { permission: { edit: 'deny' } }),
  };

  return `${serializeOpenCodeAgentFrontmatter(opencodeFrontmatter)}\n\n${body}`;
}

function serializeOpenCodeAgentFrontmatter(frontmatter: OpenCodeAgentFrontmatter): string {
  const lines = ['---', `description: ${frontmatter.description}`, `mode: ${frontmatter.mode}`];

  if (frontmatter.permission) {
    lines.push('permission:', `  edit: ${frontmatter.permission.edit}`);
  }

  lines.push('---');

  return lines.join('\n');
}
