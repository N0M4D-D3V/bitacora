import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { BitacoraError } from './bitacora-error.js';
import { runDoctorCommand } from './doctor-command.js';
import { runInitCommand } from './init-command.js';

const silentIo = {
  writeStdout: () => {},
  writeStderr: () => {},
};

describe('runDoctorCommand', () => {
  it('reports healthy workspaces with memory sizes and exit-0 behavior', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-ok-'));
    let stdout = '';

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });

      await expect(
        runDoctorCommand({
          cwd: workspaceDir,
          now: new Date('2026-05-12T14:00:00.000Z'),
          writeStdout: (chunk) => {
            stdout += chunk;
          },
        })
      ).resolves.toBeUndefined();

      expect(stdout).toContain('doctor: ok');
      expect(stdout).toContain('history.jsonl: 0 bytes');
      expect(stdout).toContain('lessons.jsonl: 0 bytes');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('fails when required structure paths are missing', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-structure-'));
    let stdout = '';

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await unlink(path.join(workspaceDir, '.bitacora/version'));

      await expect(
        runDoctorCommand({
          cwd: workspaceDir,
          writeStdout: (chunk) => {
            stdout += chunk;
          },
        })
      ).rejects.toMatchObject({
        exitCode: 1,
        message: 'doctor checks failed',
      });

      expect(stdout).toContain('missing required path: .bitacora/version');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('detects schema-invalid memory files and orphan current sessions', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-memory-'));
    let stdout = '';

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await writeFile(
        path.join(workspaceDir, '.bitacora/memory/current.json'),
        JSON.stringify({
          feature: 'F11',
          agent: 'coder',
          start: '2026-05-10T12:00:00.000Z',
          status: 'in_progress',
          plan: ['Investigate doctor output'],
          bitacora: [],
          next_step: 'Review diagnostics',
        })
      );
      await writeFile(path.join(workspaceDir, '.bitacora/memory/history.jsonl'), '{bad json}\n');

      await expect(
        runDoctorCommand({
          cwd: workspaceDir,
          now: new Date('2026-05-12T14:00:00.000Z'),
          writeStdout: (chunk) => {
            stdout += chunk;
          },
        })
      ).rejects.toMatchObject({ exitCode: 1 } satisfies Partial<BitacoraError>);

      expect(stdout).toContain('history.jsonl schema invalid');
      expect(stdout).toContain('current.json appears orphaned');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('detects broken root symlinks and adapter drift', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-drift-'));
    let stdout = '';

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await writeFile(
        path.join(workspaceDir, '.claude/agents/manager.md'),
        'stale adapter output\n'
      );
      await unlink(path.join(workspaceDir, 'AGENTS.md'));

      await expect(
        runDoctorCommand({
          cwd: workspaceDir,
          writeStdout: (chunk) => {
            stdout += chunk;
          },
        })
      ).rejects.toMatchObject({ exitCode: 1 } satisfies Partial<BitacoraError>);

      expect(stdout).toContain('CLAUDE.md does not resolve to AGENTS.md');
      expect(stdout).toContain('GEMINI.md does not resolve to AGENTS.md');
      expect(stdout).toContain('adapter drift detected: .claude/agents/manager.md');
      expect(stdout).toContain('run `bitacora sync`');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('detects missing Claude deny rules', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-permissions-'));
    let stdout = '';

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await writeFile(
        path.join(workspaceDir, '.claude/settings.json'),
        `${JSON.stringify(
          {
            permissions: {
              deny: [
                { tool: 'Edit', pattern: '.bitacora/harness/**' },
                { tool: 'Write', pattern: '.bitacora/harness/**' },
                { tool: 'Edit', pattern: '.bitacora/memory/**' },
              ],
            },
          },
          null,
          2
        )}\n`
      );

      await expect(
        runDoctorCommand({
          cwd: workspaceDir,
          writeStdout: (chunk) => {
            stdout += chunk;
          },
        })
      ).rejects.toMatchObject({ exitCode: 1 } satisfies Partial<BitacoraError>);

      expect(stdout).toContain('missing Claude deny rule: Write .bitacora/memory/**');
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('runs through the real CLI and returns exit 1 on failures', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-cli-'));

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await writeFile(path.join(workspaceDir, '.bitacora/memory/lessons.jsonl'), '{bad json}\n');

      const originalCwd = process.cwd();
      let stdout = '';
      let stderr = '';

      process.chdir(workspaceDir);

      try {
        const exitCode = await import('./index.js').then(({ runCli }) =>
          runCli(['node', 'bitacora', 'doctor'], {
            writeStdout: (chunk) => {
              stdout += chunk;
            },
            writeStderr: (chunk) => {
              stderr += chunk;
            },
          })
        );

        expect(exitCode).toBe(1);
        expect(stdout).toContain('lessons.jsonl schema invalid');
        expect(stderr).toContain('doctor checks failed');
      } finally {
        process.chdir(originalCwd);
      }
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('prints a structured failure when a generated adapter artifact is missing', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-doctor-missing-adapter-'));

    try {
      await runInitCommand({ cwd: workspaceDir, ...silentIo });
      await unlink(path.join(workspaceDir, '.opencode/agents/reviewer.md'));

      const originalCwd = process.cwd();
      let stdout = '';
      let stderr = '';

      process.chdir(workspaceDir);

      try {
        const exitCode = await import('./index.js').then(({ runCli }) =>
          runCli(['node', 'bitacora', 'doctor'], {
            writeStdout: (chunk) => {
              stdout += chunk;
            },
            writeStderr: (chunk) => {
              stderr += chunk;
            },
          })
        );

        expect(exitCode).toBe(1);
        expect(stdout).toContain('doctor: fail');
        expect(stdout).toContain('[fail] adapter-drift');
        expect(stdout).toContain('.opencode/agents/reviewer.md');
        expect(stderr).toBe('doctor checks failed\n');
        expect(`${stdout}${stderr}`).not.toContain('ENOENT');
        expect(`${stdout}${stderr}`).not.toContain('Error:');
      } finally {
        process.chdir(originalCwd);
      }
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
