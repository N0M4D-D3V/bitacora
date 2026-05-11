import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GENERATED_ADAPTER_PATHS, syncAllAdapters } from './index.js';
import { opencodeAdapter } from './opencode.js';

describe('syncAllAdapters', () => {
  it('runs the registered adapters and reports their generated paths deterministically', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-adapters-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'name: manager', 'description: Manager', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'name: coder', 'description: Coder', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'name: reviewer', 'description: Reviewer', '---', '', 'reviewer'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        '# Bitacora CLI\n'
      );

      const generatedPaths = await syncAllAdapters({ cwd: workspaceDir });

      expect(generatedPaths).toEqual(GENERATED_ADAPTER_PATHS);
      await expect(
        readFile(path.join(workspaceDir, '.claude/agents/manager.md'), 'utf8')
      ).resolves.toContain('description: Manager\n');
      await expect(
        readFile(path.join(workspaceDir, '.opencode/agents/manager.md'), 'utf8')
      ).resolves.toContain('description: Manager\n');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('exposes the spec-shaped OpenCode adapter contract with clean support', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-clean-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'name: manager', 'description: Manager', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'name: coder', 'description: Coder', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'name: reviewer', 'description: Reviewer', '---', '', 'reviewer'].join('\n')
      );

      expect(opencodeAdapter.name).toBe('opencode');

      await opencodeAdapter.generate({ cwd: workspaceDir });
      await expect(
        readFile(path.join(workspaceDir, '.opencode/agents/manager.md'), 'utf8')
      ).resolves.toContain('description: Manager\n');

      await opencodeAdapter.clean({ cwd: workspaceDir });
      await expect(
        readFile(path.join(workspaceDir, '.opencode/agents/manager.md'), 'utf8')
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
