import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { syncClaudeAdapter } from './claude-adapter.js';

describe('syncClaudeAdapter', () => {
  it('generates Claude agent files with translated frontmatter and preserved canonical bodies', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-claude-adapter-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      const canonicalManager = [
        '---',
        'id: manager',
        'description: Orchestrates Bitacora sessions and delivery flow.',
        'tools:',
        '  - Read',
        '  - Glob',
        '  - Grep',
        '  - Bash',
        'model: sonnet',
        '---',
        '',
        'Manager body line 1.',
        'Manager body line 2.',
      ].join('\n');
      const canonicalCoder = [
        '---',
        'id: coder',
        'description: Implements scoped changes and records delivery progress.',
        'tools:',
        '  - Read',
        '  - Glob',
        '  - Grep',
        '  - Bash',
        '  - Edit',
        '  - Write',
        'model: sonnet',
        '---',
        '',
        'Coder body.',
      ].join('\n');
      const canonicalReviewer = [
        '---',
        'id: reviewer',
        'description: Verifies completed work against Bitacora quality gates.',
        'tools:',
        '  - Read',
        '  - Glob',
        '  - Grep',
        '  - Bash',
        'model: sonnet',
        '---',
        '',
        'Reviewer body.',
      ].join('\n');

      await writeFile(path.join(workspaceDir, '.bitacora/agents/manager.md'), canonicalManager);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/coder.md'), canonicalCoder);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/reviewer.md'), canonicalReviewer);
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        [
          '---',
          'id: bitacora-cli',
          'description: Use the Bitacora CLI.',
          '---',
          '',
          '# Bitacora CLI',
          '',
        ].join('\n')
      );

      await syncClaudeAdapter({ cwd: workspaceDir });

      const managerOutput = await readFile(
        path.join(workspaceDir, '.claude/agents/manager.md'),
        'utf8'
      );
      const coderOutput = await readFile(
        path.join(workspaceDir, '.claude/agents/coder.md'),
        'utf8'
      );
      const reviewerOutput = await readFile(
        path.join(workspaceDir, '.claude/agents/reviewer.md'),
        'utf8'
      );

      expect(managerOutput).toContain('name: "manager"\n');
      expect(managerOutput).toContain(
        'description: "Orchestrates Bitacora sessions and delivery flow."\n'
      );
      expect(managerOutput).toContain('model: "sonnet"\n');
      expect(managerOutput).toContain('tools: "Read, Glob, Grep, Bash"\n');
      expect(managerOutput).not.toContain('allowed-tools:');
      expect(managerOutput.endsWith('\n\nManager body line 1.\nManager body line 2.')).toBe(true);
      expect(managerOutput).toContain('Manager body line 1.\nManager body line 2.');
      expect(managerOutput).not.toBe(canonicalManager);

      expect(coderOutput).toContain('name: "coder"\n');
      expect(coderOutput).toContain(
        'description: "Implements scoped changes and records delivery progress."\n'
      );
      expect(coderOutput).toContain('model: "sonnet"\n');
      expect(coderOutput).toContain('tools: "Read, Glob, Grep, Bash, Edit, Write"\n');
      expect(coderOutput).not.toContain('allowed-tools:');
      expect(coderOutput.endsWith('\n\nCoder body.')).toBe(true);
      expect(coderOutput).toContain('Coder body.');

      expect(reviewerOutput).toContain('name: "reviewer"\n');
      expect(reviewerOutput).toContain(
        'description: "Verifies completed work against Bitacora quality gates."\n'
      );
      expect(reviewerOutput).toContain('model: "sonnet"\n');
      expect(reviewerOutput).toContain('tools: "Read, Glob, Grep, Bash"\n');
      expect(reviewerOutput).not.toContain('allowed-tools:');
      expect(reviewerOutput.endsWith('\n\nReviewer body.')).toBe(true);
      expect(reviewerOutput).toContain('Reviewer body.');

      const skillPath = path.join(workspaceDir, '.claude/skills/bitacora-cli/SKILL.md');
      const skillStats = await lstat(skillPath);
      const skillOutput = await readFile(skillPath, 'utf8');
      const settings = JSON.parse(
        await readFile(path.join(workspaceDir, '.claude/settings.json'), 'utf8')
      ) as {
        permissions: { deny: Array<{ tool: string; pattern: string }> };
      };

      expect(skillStats.isFile()).toBe(true);
      expect(skillStats.isSymbolicLink()).toBe(false);
      expect(skillOutput).toContain('name: "bitacora-cli"\n');
      expect(skillOutput).not.toContain('id: bitacora-cli');
      expect(settings.permissions.deny).toEqual([
        { tool: 'Edit', pattern: '.bitacora/harness/**' },
        { tool: 'Write', pattern: '.bitacora/harness/**' },
        { tool: 'Edit', pattern: '.bitacora/memory/**' },
        { tool: 'Write', pattern: '.bitacora/memory/**' },
      ]);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('deep merges settings and deduplicates deny rules by tool and pattern', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-claude-settings-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.claude'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'id: manager', 'description: Manager', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'id: coder', 'description: Coder', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'id: reviewer', 'description: Reviewer', '---', '', 'reviewer'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        ['---', 'id: bitacora-cli', 'description: Skill', '---', '', '# Bitacora CLI'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.claude/settings.json'),
        JSON.stringify(
          {
            env: { CLAUDE_TRACE: '1' },
            permissions: {
              allow: ['Read'],
              deny: [
                { tool: 'Edit', pattern: '.bitacora/harness/**' },
                { tool: 'Bash', pattern: 'dist/**' },
              ],
            },
            theme: 'dark',
          },
          null,
          2
        )
      );

      await syncClaudeAdapter({ cwd: workspaceDir });

      const settings = JSON.parse(
        await readFile(path.join(workspaceDir, '.claude/settings.json'), 'utf8')
      ) as {
        env: { CLAUDE_TRACE: string };
        permissions: {
          allow: string[];
          deny: Array<{ tool: string; pattern: string }>;
        };
        theme: string;
      };

      expect(settings.env).toEqual({ CLAUDE_TRACE: '1' });
      expect(settings.permissions.allow).toEqual(['Read']);
      expect(settings.theme).toBe('dark');
      expect(settings.permissions.deny).toEqual([
        { tool: 'Edit', pattern: '.bitacora/harness/**' },
        { tool: 'Bash', pattern: 'dist/**' },
        { tool: 'Write', pattern: '.bitacora/harness/**' },
        { tool: 'Edit', pattern: '.bitacora/memory/**' },
        { tool: 'Write', pattern: '.bitacora/memory/**' },
      ]);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
