import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { BitacoraError } from './bitacora-error.js';
import {
  runCurrentLogCommand,
  runCurrentSetCommand,
  runCurrentShowCommand,
  runCurrentStatusCommand,
  runHistoryAppendFromCurrentCommand,
  runSessionEndCommand,
  runSessionStartCommand,
} from './current-session-command.js';

const execFileAsync = promisify(execFile);

describe('current and session commands', () => {
  it('initializes current state from empty via current set and appends current log entries', async () => {
    const workspace = await createCommandWorkspace('bitacora-current-set-');
    const stdout: string[] = [];

    try {
      await runCurrentSetCommand(['feature=F07', 'plan=["write tests"]', 'next_step=implement'], {
        cwd: workspace.workspaceDir,
        agent: 'manager',
        now: () => new Date('2026-05-12T11:00:00.000Z'),
        writeStdout: (chunk) => {
          stdout.push(chunk);
        },
      });

      await runCurrentLogCommand('added tests', {
        cwd: workspace.workspaceDir,
        agent: 'coder',
        now: () => new Date('2026-05-12T11:01:00.000Z'),
      });

      expect(JSON.parse(await readFile(workspace.currentPath, 'utf8'))).toEqual({
        feature: 'F07',
        agent: 'manager',
        start: '2026-05-12T11:00:00.000Z',
        status: 'in_progress',
        plan: ['write tests'],
        bitacora: [
          {
            ts: '2026-05-12T11:01:00.000Z',
            agent: 'coder',
            msg: 'added tests',
          },
        ],
        next_step: 'implement',
      });
      expect(stdout.join('')).toContain('F07');
    } finally {
      await workspace.cleanup();
    }
  });

  it('rejects manager-only current mutations for non-manager agents without mutating current.json', async () => {
    const workspace = await createCommandWorkspace('bitacora-current-permissions-');

    try {
      await writeFile(
        workspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F07',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_progress',
            plan: ['write tests'],
            bitacora: [],
            next_step: 'implement',
          },
          null,
          2
        )}\n`
      );

      const before = await readFile(workspace.currentPath, 'utf8');

      await expect(
        runCurrentStatusCommand('in_review', {
          cwd: workspace.workspaceDir,
          agent: 'coder',
        })
      ).rejects.toMatchObject({ exitCode: 3 });
      await expect(
        runCurrentSetCommand(['next_step=review'], {
          cwd: workspace.workspaceDir,
          agent: 'reviewer',
        })
      ).rejects.toMatchObject({ exitCode: 3 });

      expect(await readFile(workspace.currentPath, 'utf8')).toBe(before);
    } finally {
      await workspace.cleanup();
    }
  });

  it('shows current state and supports manager status changes via BITACORA_AGENT', async () => {
    const workspace = await createCommandWorkspace('bitacora-current-show-');
    const stdout: string[] = [];

    try {
      await writeFile(
        workspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F07',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_progress',
            plan: ['write tests'],
            bitacora: [],
            next_step: 'implement',
          },
          null,
          2
        )}\n`
      );

      await runCurrentStatusCommand('in_review', {
        cwd: workspace.workspaceDir,
        env: { BITACORA_AGENT: 'manager' },
      });
      await runCurrentShowCommand({
        cwd: workspace.workspaceDir,
        writeStdout: (chunk) => {
          stdout.push(chunk);
        },
      });

      expect(JSON.parse(stdout.join(''))).toMatchObject({
        feature: 'F07',
        status: 'in_review',
      });
    } finally {
      await workspace.cleanup();
    }
  });

  it('keeps session start as a no-op for empty current and archives interrupted sessions otherwise', async () => {
    const emptyWorkspace = await createCommandWorkspace('bitacora-session-start-empty-');
    const activeWorkspace = await createCommandWorkspace('bitacora-session-start-active-');

    try {
      const emptyStdout: string[] = [];

      await runSessionStartCommand({
        cwd: emptyWorkspace.workspaceDir,
        agent: 'manager',
        writeStdout: (chunk) => {
          emptyStdout.push(chunk);
        },
      });

      expect(await readFile(emptyWorkspace.currentPath, 'utf8')).toBe('{}\n');
      expect(await readFile(emptyWorkspace.historyPath, 'utf8')).toBe('');
      expect(emptyStdout.join('')).toContain('no active session');

      await writeFile(
        activeWorkspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F07',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_progress',
            plan: ['write tests'],
            bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'coder', msg: 'started' }],
            next_step: 'implement',
          },
          null,
          2
        )}\n`
      );

      await runSessionStartCommand({
        cwd: activeWorkspace.workspaceDir,
        agent: 'manager',
        now: () => new Date('2026-05-12T11:10:00.000Z'),
      });

      expect(await readFile(activeWorkspace.currentPath, 'utf8')).toBe('{}\n');
      expect(readJsonLines(await readFile(activeWorkspace.historyPath, 'utf8'))).toEqual([
        {
          agent: 'manager',
          feature: 'F07',
          date: '2026-05-12T11:10:00.000Z',
          plan: ['write tests'],
          bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'coder', msg: 'started' }],
          verification: {
            process: 'bitacora session start',
            result: 'previous session archived as interrupted during recovery',
          },
          close: 'interrupted',
        },
      ]);
    } finally {
      await emptyWorkspace.cleanup();
      await activeWorkspace.cleanup();
    }
  });

  it('requires an active session for session end and archives it with the requested close state', async () => {
    const emptyWorkspace = await createCommandWorkspace('bitacora-session-end-empty-');
    const activeWorkspace = await createCommandWorkspace('bitacora-session-end-active-');

    try {
      await expect(
        runSessionEndCommand({
          cwd: emptyWorkspace.workspaceDir,
          agent: 'manager',
        })
      ).rejects.toBeInstanceOf(BitacoraError);

      await writeFile(
        activeWorkspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F07',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_review',
            plan: ['write tests'],
            bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'reviewer', msg: 'reviewing' }],
            next_step: 'close feature',
          },
          null,
          2
        )}\n`
      );

      await runSessionEndCommand({
        cwd: activeWorkspace.workspaceDir,
        agent: 'manager',
        close: 'blocked',
        now: () => new Date('2026-05-12T11:20:00.000Z'),
      });

      expect(await readFile(activeWorkspace.currentPath, 'utf8')).toBe('{}\n');
      expect(readJsonLines(await readFile(activeWorkspace.historyPath, 'utf8'))).toEqual([
        {
          agent: 'manager',
          feature: 'F07',
          date: '2026-05-12T11:20:00.000Z',
          plan: ['write tests'],
          bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'reviewer', msg: 'reviewing' }],
          verification: {
            process: 'bitacora session end',
            result: 'session archived by manager',
          },
          close: 'blocked',
        },
      ]);
    } finally {
      await emptyWorkspace.cleanup();
      await activeWorkspace.cleanup();
    }
  });

  it('enforces manager-only history append from current and archives through storage on success', async () => {
    const workspace = await createCommandWorkspace('bitacora-history-append-');

    try {
      await writeFile(
        workspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F07',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_review',
            plan: ['write tests'],
            bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'coder', msg: 'ready' }],
            next_step: 'archive',
          },
          null,
          2
        )}\n`
      );

      const currentBeforeDenied = await readFile(workspace.currentPath, 'utf8');
      const historyBeforeDenied = await readFile(workspace.historyPath, 'utf8');

      await expect(
        runHistoryAppendFromCurrentCommand({
          cwd: workspace.workspaceDir,
          agent: 'coder',
        })
      ).rejects.toMatchObject({ exitCode: 3 });

      expect(await readFile(workspace.currentPath, 'utf8')).toBe(currentBeforeDenied);
      expect(await readFile(workspace.historyPath, 'utf8')).toBe(historyBeforeDenied);

      await runHistoryAppendFromCurrentCommand({
        cwd: workspace.workspaceDir,
        agent: 'manager',
        now: () => new Date('2026-05-12T11:30:00.000Z'),
      });

      expect(await readFile(workspace.currentPath, 'utf8')).toBe('{}\n');
      expect(readJsonLines(await readFile(workspace.historyPath, 'utf8'))).toEqual([
        {
          agent: 'manager',
          feature: 'F07',
          date: '2026-05-12T11:30:00.000Z',
          plan: ['write tests'],
          bitacora: [{ ts: '2026-05-12T11:05:00.000Z', agent: 'coder', msg: 'ready' }],
          verification: {
            process: 'bitacora history append --from-current',
            result: 'current session archived by manager command',
          },
          close: 'done',
        },
      ]);
    } finally {
      await workspace.cleanup();
    }
  });

  it('runs the real CLI for current/session flows and permission checks', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-session-cli-'));
    const runtime = await createCliRuntime();

    try {
      await execFileAsync('node', [runtime.entryPath, 'init'], {
        cwd: workspaceDir,
      });

      await execFileAsync(
        'node',
        [
          runtime.entryPath,
          'current',
          'set',
          'feature=F07',
          'plan=["write tests"]',
          'next_step=implement',
          '--agent',
          'manager',
        ],
        { cwd: workspaceDir }
      );

      await execFileAsync(
        'node',
        [runtime.entryPath, 'current', 'log', 'implemented tests', '--agent', 'coder'],
        { cwd: workspaceDir }
      );

      const beforeDenied = await readFile(
        path.join(workspaceDir, '.bitacora/memory/current.json'),
        'utf8'
      );

      await expect(
        execFileAsync(
          'node',
          [runtime.entryPath, 'current', 'status', 'done', '--agent', 'coder'],
          { cwd: workspaceDir }
        )
      ).rejects.toMatchObject({ code: 3 });

      expect(await readFile(path.join(workspaceDir, '.bitacora/memory/current.json'), 'utf8')).toBe(
        beforeDenied
      );

      const showResult = await execFileAsync('node', [runtime.entryPath, 'current', 'show'], {
        cwd: workspaceDir,
        env: { ...process.env, BITACORA_AGENT: 'manager' },
      });

      expect(JSON.parse(showResult.stdout)).toMatchObject({
        feature: 'F07',
        bitacora: [{ agent: 'coder', msg: 'implemented tests' }],
      });

      await execFileAsync(
        'node',
        [runtime.entryPath, 'session', 'end', '--close', 'done', '--agent', 'manager'],
        { cwd: workspaceDir }
      );

      expect(await readFile(path.join(workspaceDir, '.bitacora/memory/current.json'), 'utf8')).toBe(
        '{}\n'
      );
      expect(
        readJsonLines(
          await readFile(path.join(workspaceDir, '.bitacora/memory/history.jsonl'), 'utf8')
        )
      ).toHaveLength(1);
    } finally {
      await runtime.cleanup();
      await rm(workspaceDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('runs the real CLI for manager-only history append from current', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-history-cli-'));
    const runtime = await createCliRuntime();

    try {
      await execFileAsync('node', [runtime.entryPath, 'init'], {
        cwd: workspaceDir,
      });

      await execFileAsync(
        'node',
        [
          runtime.entryPath,
          'current',
          'set',
          'feature=F07',
          'plan=["write tests"]',
          'next_step=archive',
          '--agent',
          'manager',
        ],
        { cwd: workspaceDir }
      );

      await expect(
        execFileAsync(
          'node',
          [runtime.entryPath, 'history', 'append', '--from-current', '--agent', 'coder'],
          { cwd: workspaceDir }
        )
      ).rejects.toMatchObject({ code: 3 });

      await execFileAsync(
        'node',
        [runtime.entryPath, 'history', 'append', '--from-current', '--agent', 'manager'],
        { cwd: workspaceDir }
      );

      expect(await readFile(path.join(workspaceDir, '.bitacora/memory/current.json'), 'utf8')).toBe(
        '{}\n'
      );
      expect(
        readJsonLines(
          await readFile(path.join(workspaceDir, '.bitacora/memory/history.jsonl'), 'utf8')
        )
      ).toHaveLength(1);

      await execFileAsync(
        'node',
        [
          runtime.entryPath,
          'current',
          'set',
          'feature=F07',
          'plan=["rewrite state"]',
          'next_step=archive again',
          '--agent',
          'manager',
        ],
        { cwd: workspaceDir }
      );

      await expect(
        execFileAsync('node', [runtime.entryPath, 'history', 'append', '--from-current'], {
          cwd: workspaceDir,
          env: { ...process.env },
        })
      ).rejects.toMatchObject({ code: 3 });
    } finally {
      await runtime.cleanup();
      await rm(workspaceDir, { recursive: true, force: true });
    }
  }, 30_000);
});

async function createCommandWorkspace(prefix: string) {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), prefix));
  const memoryDir = path.join(workspaceDir, '.bitacora', 'memory');
  const currentPath = path.join(memoryDir, 'current.json');
  const historyPath = path.join(memoryDir, 'history.jsonl');
  const lessonsPath = path.join(memoryDir, 'lessons.jsonl');

  await mkdir(memoryDir, { recursive: true });
  await writeFile(path.join(workspaceDir, '.bitacora', '.lock'), '');
  await writeFile(currentPath, '{}\n');
  await writeFile(historyPath, '');
  await writeFile(lessonsPath, '');

  return {
    workspaceDir,
    currentPath,
    historyPath,
    cleanup: async () => {
      await rm(workspaceDir, { recursive: true, force: true });
    },
  };
}

async function createCliRuntime(): Promise<{ entryPath: string; cleanup: () => Promise<void> }> {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(sourceDir, '..');
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'bitacora-cli-runtime-'));
  const runtimeSrcDir = path.join(runtimeDir, 'src');
  const runtimeTemplatesDir = path.join(runtimeDir, 'templates');
  const sourceFiles = [
    'bitacora-error.ts',
    'canonical-agent-markdown.ts',
    'claude-adapter.ts',
    'cli.ts',
    'current-session-command.ts',
    'history-lessons-command.ts',
    'index.ts',
    'init-command.ts',
    'memory-storage.ts',
    'opencode-adapter.ts',
    'template-resolver.ts',
    'adapters/index.ts',
    'adapters/opencode.ts',
  ];

  await mkdir(path.join(runtimeSrcDir, 'adapters'), { recursive: true });
  await symlink(path.join(repoRoot, 'node_modules'), path.join(runtimeDir, 'node_modules'));
  await cp(path.join(repoRoot, 'templates'), runtimeTemplatesDir, { recursive: true });

  for (const relativePath of sourceFiles) {
    await transpileRuntimeModule(
      path.join(sourceDir, relativePath),
      path.join(runtimeSrcDir, relativePath.replace(/\.ts$/, '.js'))
    );
  }

  return {
    entryPath: path.join(runtimeSrcDir, 'index.js'),
    cleanup: async () => {
      await rm(runtimeDir, { recursive: true, force: true });
    },
  };
}

async function transpileRuntimeModule(sourcePath: string, outputPath: string): Promise<void> {
  const sourceText = await readFile(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, transpiled.outputText);
}

function readJsonLines(content: string): unknown[] {
  return content
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line));
}
