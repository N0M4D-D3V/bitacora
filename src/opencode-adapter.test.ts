import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { syncOpenCodeAdapter } from './opencode-adapter.js';

describe('syncOpenCodeAdapter', () => {
  it('generates OpenCode agent files with translated frontmatter and preserved canonical bodies', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-adapter-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });

      const canonicalManager = [
        '---',
        'name: manager',
        'description: Orchestrates Bitacora sessions and delivery flow.',
        '---',
        '',
        'Manager body line 1.',
        'Manager body line 2.',
      ].join('\n');
      const canonicalCoder = [
        '---',
        'name: coder',
        'description: Implements scoped changes and records delivery progress.',
        '---',
        '',
        'Coder body.',
      ].join('\n');
      const canonicalReviewer = [
        '---',
        'name: reviewer',
        'description: Verifies completed work against Bitacora quality gates.',
        '---',
        '',
        'Reviewer body.',
      ].join('\n');

      await writeFile(path.join(workspaceDir, '.bitacora/agents/manager.md'), canonicalManager);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/coder.md'), canonicalCoder);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/reviewer.md'), canonicalReviewer);

      await syncOpenCodeAdapter({ cwd: workspaceDir });

      const managerOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/manager.md'),
        'utf8'
      );
      const coderOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/coder.md'),
        'utf8'
      );
      const reviewerOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/reviewer.md'),
        'utf8'
      );

      expect(managerOutput).toContain(
        'description: Orchestrates Bitacora sessions and delivery flow.\n'
      );
      expect(managerOutput).toContain('mode: subagent\n');
      expect(managerOutput).toContain('permission:\n  edit: deny\n');
      expect(managerOutput).not.toContain('name: manager\n');
      expect(managerOutput.endsWith('\n\nManager body line 1.\nManager body line 2.')).toBe(true);

      expect(coderOutput).toContain(
        'description: Implements scoped changes and records delivery progress.\n'
      );
      expect(coderOutput).toContain('mode: subagent\n');
      expect(coderOutput).not.toContain('permission:\n  edit: deny\n');
      expect(coderOutput).not.toContain('name: coder\n');
      expect(coderOutput.endsWith('\n\nCoder body.')).toBe(true);

      expect(reviewerOutput).toContain(
        'description: Verifies completed work against Bitacora quality gates.\n'
      );
      expect(reviewerOutput).toContain('mode: subagent\n');
      expect(reviewerOutput).toContain('permission:\n  edit: deny\n');
      expect(reviewerOutput).not.toContain('name: reviewer\n');
      expect(reviewerOutput.endsWith('\n\nReviewer body.')).toBe(true);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
