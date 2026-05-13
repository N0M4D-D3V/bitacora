import { execFile } from 'node:child_process';
import { lstat, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('bitacora init', () => {
  it('creates the core filesystem layout in an empty directory', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-'));

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      const { stdout, stderr } = await execFileAsync(
        'node',
        [path.resolve(__dirname, '../dist/index.js'), 'init'],
        { cwd: workspaceDir }
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('.bitacora');

      const expectedPaths = [
        'AGENTS.md',
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
        '.claude/agents/manager.md',
        '.claude/agents/coder.md',
        '.claude/agents/reviewer.md',
        '.claude/settings.json',
        '.opencode/agents/manager.md',
        '.opencode/agents/coder.md',
        '.opencode/agents/reviewer.md',
        '.opencode/skills/bitacora-cli/SKILL.md',
      ];

      await Promise.all(
        expectedPaths.map(async (relativePath) => {
          const stats = await lstat(path.join(workspaceDir, relativePath));
          expect(stats.isFile()).toBe(true);
        })
      );

      const currentJson = await readFile(
        path.join(workspaceDir, '.bitacora/memory/current.json'),
        'utf8'
      );
      const historyJsonl = await readFile(
        path.join(workspaceDir, '.bitacora/memory/history.jsonl'),
        'utf8'
      );
      const lessonsJsonl = await readFile(
        path.join(workspaceDir, '.bitacora/memory/lessons.jsonl'),
        'utf8'
      );

      expect(currentJson).toBe('{}\n');
      expect(historyJsonl).toBe('');
      expect(lessonsJsonl).toBe('');

      const managerRole = await readFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        'utf8'
      );
      const coderRole = await readFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        'utf8'
      );
      const reviewerRole = await readFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        'utf8'
      );
      const bitacoraSkill = await readFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        'utf8'
      );

      expect(managerRole).toContain(
        'description: Orchestrates Bitacora sessions and delivery flow.'
      );
      expect(managerRole).toContain(
        'Owns session lifecycle, status transitions, and history archival.'
      );
      expect(coderRole).toContain(
        'description: Implements scoped changes and records delivery progress.'
      );
      expect(coderRole).toContain('Never modifies session status or closes sessions.');
      expect(reviewerRole).toContain(
        'description: Verifies completed work against Bitacora quality gates.'
      );
      expect(reviewerRole).toContain('Never edits implementation code while acting as reviewer.');
      expect(bitacoraSkill).toContain('# Bitacora CLI');
      expect(bitacoraSkill).toContain(
        'Use the `bitacora` CLI for all writes to `.bitacora/memory/`.'
      );

      const claudeLink = await lstat(path.join(workspaceDir, 'CLAUDE.md'));
      const geminiLink = await lstat(path.join(workspaceDir, 'GEMINI.md'));
      const claudeSkillLink = await lstat(
        path.join(workspaceDir, '.claude/skills/bitacora-cli/SKILL.md')
      );
      const codexSkillLink = await lstat(
        path.join(workspaceDir, '.agents/skills/bitacora-cli/SKILL.md')
      );

      expect(claudeLink.isSymbolicLink()).toBe(true);
      expect(geminiLink.isSymbolicLink()).toBe(true);
      expect(claudeSkillLink.isFile()).toBe(true);
      expect(claudeSkillLink.isSymbolicLink()).toBe(false);
      expect(codexSkillLink.isFile()).toBe(true);
      expect(codexSkillLink.isSymbolicLink()).toBe(false);
      expect(await readlink(path.join(workspaceDir, 'CLAUDE.md'))).toBe('AGENTS.md');
      expect(await readlink(path.join(workspaceDir, 'GEMINI.md'))).toBe('AGENTS.md');
      expect(
        await readFile(path.join(workspaceDir, '.claude/skills/bitacora-cli/SKILL.md'), 'utf8')
      ).toContain('name: "bitacora-cli"\n');
      expect(
        await readFile(path.join(workspaceDir, '.agents/skills/bitacora-cli/SKILL.md'), 'utf8')
      ).toContain('name: "bitacora-cli"\n');
      expect(
        await readFile(path.join(workspaceDir, '.opencode/skills/bitacora-cli/SKILL.md'), 'utf8')
      ).toContain('name: "bitacora-cli"\n');

      const claudeSettings = JSON.parse(
        await readFile(path.join(workspaceDir, '.claude/settings.json'), 'utf8')
      ) as {
        permissions: { deny: Array<{ tool: string; pattern: string }> };
      };
      const opencodeManager = await readFile(
        path.join(workspaceDir, '.opencode/agents/manager.md'),
        'utf8'
      );
      const opencodeCoder = await readFile(
        path.join(workspaceDir, '.opencode/agents/coder.md'),
        'utf8'
      );
      const opencodeReviewer = await readFile(
        path.join(workspaceDir, '.opencode/agents/reviewer.md'),
        'utf8'
      );

      expect(claudeSettings.permissions.deny).toEqual([
        { tool: 'Edit', pattern: '.bitacora/harness/**' },
        { tool: 'Write', pattern: '.bitacora/harness/**' },
        { tool: 'Edit', pattern: '.bitacora/memory/**' },
        { tool: 'Write', pattern: '.bitacora/memory/**' },
      ]);
      expect(opencodeManager).toContain(
        'description: "Orchestrates Bitacora sessions and delivery flow."'
      );
      expect(opencodeManager).toContain('mode: subagent\n');
      expect(opencodeManager).toContain('permission:\n  edit: "deny"\n');
      expect(opencodeManager).toContain(
        'Owns session lifecycle, status transitions, and history archival.'
      );
      expect(opencodeCoder).toContain(
        'description: "Implements scoped changes and records delivery progress."'
      );
      expect(opencodeCoder).toContain('mode: subagent\n');
      expect(opencodeCoder).not.toContain('permission:');
      expect(opencodeCoder).toContain('Never modifies session status or closes sessions.');
      expect(opencodeReviewer).toContain(
        'description: "Verifies completed work against Bitacora quality gates."'
      );
      expect(opencodeReviewer).toContain('mode: subagent\n');
      expect(opencodeReviewer).toContain('permission:\n  edit: "deny"\n');
      expect(opencodeReviewer).toContain(
        'Never edits implementation code while acting as reviewer.'
      );
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('refuses to re-initialize an existing repo without force', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-refuse-'));

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      await execFileAsync('node', [path.resolve(__dirname, '../dist/index.js'), 'init'], {
        cwd: workspaceDir,
      });

      const versionPath = path.join(workspaceDir, '.bitacora/version');

      await writeFile(versionPath, 'custom-version\n');

      await expect(
        execFileAsync('node', [path.resolve(__dirname, '../dist/index.js'), 'init'], {
          cwd: workspaceDir,
        })
      ).rejects.toMatchObject({
        code: 6,
      });

      expect(await readFile(versionPath, 'utf8')).toBe('custom-version\n');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('preserves a pre-existing AGENTS.md and warns', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-agents-'));
    const customAgents = '# custom agents\n';

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      await writeFile(path.join(workspaceDir, 'AGENTS.md'), customAgents);

      const { stderr } = await execFileAsync(
        'node',
        [path.resolve(__dirname, '../dist/index.js'), 'init'],
        { cwd: workspaceDir }
      );

      expect(stderr).toContain('warning: preserving existing AGENTS.md');
      expect(await readFile(path.join(workspaceDir, 'AGENTS.md'), 'utf8')).toBe(customAgents);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('regenerates .bitacora with force and preserves user runtime folders', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-force-'));

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      await execFileAsync('node', [path.resolve(__dirname, '../dist/index.js'), 'init'], {
        cwd: workspaceDir,
      });

      await writeFile(path.join(workspaceDir, '.bitacora/version'), 'stale\n');
      await writeFile(path.join(workspaceDir, '.claude-user-note'), 'keep me\n');

      const { stderr } = await execFileAsync(
        'node',
        [path.resolve(__dirname, '../dist/index.js'), 'init', '--force'],
        { cwd: workspaceDir }
      );

      expect(stderr).toContain('warning: preserving existing AGENTS.md');
      expect(await readFile(path.join(workspaceDir, '.bitacora/version'), 'utf8')).toBe('1\n');
      expect(await readFile(path.join(workspaceDir, '.claude-user-note'), 'utf8')).toBe(
        'keep me\n'
      );
      expect(await readFile(path.join(workspaceDir, '.bitacora/memory/current.json'), 'utf8')).toBe(
        '{}\n'
      );
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('recreates the generated Codex skill file on force init', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-codex-force-'));

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      await execFileAsync('node', [path.resolve(__dirname, '../dist/index.js'), 'init'], {
        cwd: workspaceDir,
      });

      const codexSkillPath = path.join(workspaceDir, '.agents/skills/bitacora-cli/SKILL.md');

      await rm(codexSkillPath, { force: true });
      await writeFile(codexSkillPath, 'stale generated output\n');

      await execFileAsync(
        'node',
        [path.resolve(__dirname, '../dist/index.js'), 'init', '--force'],
        { cwd: workspaceDir }
      );

      const codexSkillStats = await lstat(codexSkillPath);

      expect(codexSkillStats.isFile()).toBe(true);
      expect(codexSkillStats.isSymbolicLink()).toBe(false);
      expect(await readFile(codexSkillPath, 'utf8')).toContain('name: "bitacora-cli"\n');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('deep merges existing Claude settings on force init without dropping user keys', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-init-claude-force-'));

    try {
      await execFileAsync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
      });

      await execFileAsync('node', [path.resolve(__dirname, '../dist/index.js'), 'init'], {
        cwd: workspaceDir,
      });

      await writeFile(
        path.join(workspaceDir, '.claude/settings.json'),
        JSON.stringify(
          {
            custom: { keep: true },
            permissions: {
              deny: [{ tool: 'Edit', pattern: '.bitacora/harness/**' }],
            },
          },
          null,
          2
        )
      );

      await execFileAsync(
        'node',
        [path.resolve(__dirname, '../dist/index.js'), 'init', '--force'],
        { cwd: workspaceDir }
      );

      const settings = JSON.parse(
        await readFile(path.join(workspaceDir, '.claude/settings.json'), 'utf8')
      ) as {
        custom: { keep: boolean };
        permissions: { deny: Array<{ tool: string; pattern: string }> };
      };

      expect(settings.custom).toEqual({ keep: true });
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
});
