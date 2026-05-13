import { execFile } from 'node:child_process';
import { cp, lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { runCli } from './index.js';

const execFileAsync = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

async function buildCliBundle(): Promise<string> {
  const bundleRoot = await mkdtemp(path.join(workspaceRoot, '.tmp-bitacora-cli-bundle-'));
  const distDir = path.join(bundleRoot, 'dist');

  await execFileAsync(
    'pnpm',
    [
      'exec',
      'tsup',
      'src/index.ts',
      '--format',
      'esm',
      '--target',
      'node22',
      '--sourcemap',
      '--clean',
      '--no-dts',
      '--out-dir',
      distDir,
    ],
    {
      cwd: workspaceRoot,
    }
  );
  await cp(path.join(workspaceRoot, 'templates'), path.join(bundleRoot, 'templates'), {
    recursive: true,
  });

  return path.join(distDir, 'index.js');
}

describe('runCli', () => {
  it('shows the root command help with the expected top-level commands', async () => {
    let stdout = '';
    let stderr = '';

    const exitCode = await runCli(['node', 'bitacora', '--help'], {
      writeStdout: (chunk) => {
        stdout += chunk;
      },
      writeStderr: (chunk) => {
        stderr += chunk;
      },
    });

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: bitacora');
    expect(stdout).toContain('init');
    expect(stdout).toContain('session');
    expect(stdout).toContain('current');
    expect(stdout).toContain('history');
    expect(stdout).toContain('lessons');
    expect(stdout).toContain('sync');
    expect(stdout).toContain('doctor');
  });

  it('sync regenerates adapter outputs from canonical files without touching unrelated files', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-sync-'));
    const cliEntrypoint = await buildCliBundle();

    try {
      await execFileAsync('node', [cliEntrypoint, 'init'], {
        cwd: workspaceDir,
      });

      const canonicalManagerPath = path.join(workspaceDir, '.bitacora/agents/manager.md');
      const claudeManagerPath = path.join(workspaceDir, '.claude/agents/manager.md');
      const opencodeManagerPath = path.join(workspaceDir, '.opencode/agents/manager.md');
      const claudeSkillPath = path.join(workspaceDir, '.claude/skills/bitacora-cli/SKILL.md');
      const codexSkillPath = path.join(workspaceDir, '.agents/skills/bitacora-cli/SKILL.md');
      const opencodeSkillPath = path.join(workspaceDir, '.opencode/skills/bitacora-cli/SKILL.md');
      const unrelatedPath = path.join(workspaceDir, 'notes.txt');
      const updatedDescription =
        'description: Orchestrates Bitacora sessions, delivery flow, and sync coverage.';

      await writeFile(
        canonicalManagerPath,
        (await readFile(canonicalManagerPath, 'utf8')).replace(
          'description: Orchestrates Bitacora sessions and delivery flow.',
          updatedDescription
        )
      );
      await writeFile(claudeManagerPath, 'stale claude output\n');
      await writeFile(opencodeManagerPath, 'stale opencode output\n');
      await rm(claudeSkillPath, { force: true });
      await writeFile(claudeSkillPath, 'stale claude skill\n');
      await rm(codexSkillPath, { force: true });
      await writeFile(codexSkillPath, 'stale codex skill\n');
      await rm(opencodeSkillPath, { force: true });
      await writeFile(opencodeSkillPath, 'stale opencode skill\n');
      await writeFile(unrelatedPath, 'keep me\n');

      const { stderr, stdout } = await execFileAsync('node', [cliEntrypoint, 'sync'], {
        cwd: workspaceDir,
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('.claude/agents/manager.md');
      expect(stdout).toContain('.opencode/agents/manager.md');
      expect(stdout).toContain('.agents/skills/bitacora-cli/SKILL.md');
      expect(stdout).toContain('.opencode/skills/bitacora-cli/SKILL.md');
      expect(await readFile(claudeManagerPath, 'utf8')).toContain(
        `${updatedDescription.replace('description: ', 'description: "')}"\n`
      );
      expect(await readFile(opencodeManagerPath, 'utf8')).toContain(
        `${updatedDescription.replace('description: ', 'description: "')}"\n`
      );
      expect((await lstat(claudeSkillPath)).isFile()).toBe(true);
      expect((await lstat(codexSkillPath)).isFile()).toBe(true);
      expect((await lstat(opencodeSkillPath)).isFile()).toBe(true);
      expect(await readFile(claudeSkillPath, 'utf8')).toContain('name: "bitacora-cli"\n');
      expect(await readFile(codexSkillPath, 'utf8')).toContain('name: "bitacora-cli"\n');
      expect(await readFile(opencodeSkillPath, 'utf8')).toContain('name: "bitacora-cli"\n');
      expect(await readFile(unrelatedPath, 'utf8')).toBe('keep me\n');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
      await rm(path.dirname(path.dirname(cliEntrypoint)), { recursive: true, force: true });
    }
  });

  it('runs the real bundled CLI for doctor and returns exit 1 when checks fail', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-cli-bundle-'));
    const cliEntrypoint = await buildCliBundle();

    try {
      await execFileAsync('node', [cliEntrypoint, 'init'], {
        cwd: workspaceDir,
      });
      await writeFile(path.join(workspaceDir, '.bitacora/memory/history.jsonl'), '{bad json}\n');

      await expect(
        execFileAsync('node', [cliEntrypoint, 'doctor'], {
          cwd: workspaceDir,
        })
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining('history.jsonl schema invalid'),
        stderr: expect.stringContaining('doctor checks failed'),
      });
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
      await rm(path.dirname(path.dirname(cliEntrypoint)), { recursive: true, force: true });
    }
  });
});
