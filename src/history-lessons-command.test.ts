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
  runHistoryShowCommand,
  runLessonsAddCommand,
  runLessonsListCommand,
  runLessonsUpdateCommand,
} from './history-lessons-command.js';

const execFileAsync = promisify(execFile);

describe('history and lessons commands', () => {
  it('shows history filtered by feature and last entries', async () => {
    const workspace = await createCommandWorkspace('bitacora-history-show-');
    const stdout: string[] = [];

    try {
      await writeFile(
        workspace.historyPath,
        `${[
          {
            agent: 'manager',
            feature: 'F07',
            date: '2026-05-12T11:00:00.000Z',
            plan: ['first'],
            bitacora: [],
            verification: { process: 'pnpm test:run', result: 'passed' },
            close: 'done',
          },
          {
            agent: 'manager',
            feature: 'F08',
            date: '2026-05-12T12:00:00.000Z',
            plan: ['second'],
            bitacora: [],
            verification: { process: 'pnpm lint', result: 'passed' },
            close: 'blocked',
          },
          {
            agent: 'manager',
            feature: 'F08',
            date: '2026-05-12T13:00:00.000Z',
            plan: ['third'],
            bitacora: [],
            verification: { process: 'pnpm build', result: 'passed' },
            close: 'done',
          },
        ]
          .map((entry) => JSON.stringify(entry))
          .join('\n')}\n`
      );

      await runHistoryShowCommand(
        {
          feature: 'F08',
          last: '1',
        },
        {
          cwd: workspace.workspaceDir,
          writeStdout: (chunk) => {
            stdout.push(chunk);
          },
        }
      );

      expect(JSON.parse(stdout.join(''))).toEqual([
        {
          agent: 'manager',
          feature: 'F08',
          date: '2026-05-12T13:00:00.000Z',
          plan: ['third'],
          bitacora: [],
          verification: { process: 'pnpm build', result: 'passed' },
          close: 'done',
        },
      ]);
    } finally {
      await workspace.cleanup();
    }
  });

  it('adds lessons with generated metadata, lists them, and updates knowledge in place', async () => {
    const workspace = await createCommandWorkspace('bitacora-lessons-flow-');
    const listStdout: string[] = [];

    try {
      await writeFile(
        workspace.currentPath,
        `${JSON.stringify(
          {
            feature: 'F08',
            agent: 'manager',
            start: '2026-05-12T11:00:00.000Z',
            status: 'in_progress',
            plan: ['implement lessons'],
            bitacora: [],
            next_step: 'persist knowledge',
          },
          null,
          2
        )}\n`
      );

      await runLessonsAddCommand('Prefer shared archival helpers.', {
        cwd: workspace.workspaceDir,
        agent: 'coder',
        now: () => new Date('2026-05-12T11:15:00.000Z'),
        writeStdout: () => {},
      });

      const addedEntries = readJsonLines(await readFile(workspace.lessonsPath, 'utf8'));
      const addedEntry = addedEntries[0];

      expect(addedEntry).toBeDefined();

      if (!addedEntry) {
        throw new Error('expected lessons add to persist an entry');
      }

      expect(addedEntries).toHaveLength(1);
      expect(addedEntry).toMatchObject({
        feature: 'F08',
        knowledge: 'Prefer shared archival helpers.',
        agent: 'coder',
        date: '2026-05-12T11:15:00.000Z',
        updated_at: '2026-05-12T11:15:00.000Z',
      });
      expect(String(addedEntry.id)).toMatch(/^lsn_20260512_[A-Za-z0-9]{8}$/);

      await runLessonsUpdateCommand(String(addedEntry.id), 'Preserve id/date on updates.', {
        cwd: workspace.workspaceDir,
        now: () => new Date('2026-05-12T11:30:00.000Z'),
        writeStdout: () => {},
      });

      await runLessonsListCommand(
        { feature: 'F08' },
        {
          cwd: workspace.workspaceDir,
          writeStdout: (chunk) => {
            listStdout.push(chunk);
          },
        }
      );

      expect(JSON.parse(listStdout.join(''))).toEqual([
        {
          id: addedEntry.id,
          feature: 'F08',
          knowledge: 'Preserve id/date on updates.',
          agent: 'coder',
          date: '2026-05-12T11:15:00.000Z',
          updated_at: '2026-05-12T11:30:00.000Z',
        },
      ]);
    } finally {
      await workspace.cleanup();
    }
  });

  it('adds lessons with an explicit feature when current.json is empty', async () => {
    const workspace = await createCommandWorkspace('bitacora-lessons-explicit-feature-');

    try {
      await runLessonsAddCommand('Explicit feature works without current state.', {
        cwd: workspace.workspaceDir,
        feature: 'F08',
        now: () => new Date('2026-05-12T12:00:00.000Z'),
        writeStdout: () => {},
      });

      expect(readJsonLines(await readFile(workspace.lessonsPath, 'utf8'))).toEqual([
        expect.objectContaining({
          feature: 'F08',
          knowledge: 'Explicit feature works without current state.',
          date: '2026-05-12T12:00:00.000Z',
          updated_at: '2026-05-12T12:00:00.000Z',
        }),
      ]);
    } finally {
      await workspace.cleanup();
    }
  });

  it('rejects updates for unknown lessons without mutating lessons.jsonl', async () => {
    const workspace = await createCommandWorkspace('bitacora-lessons-missing-');

    try {
      await writeFile(
        workspace.lessonsPath,
        `${JSON.stringify({
          id: 'lsn_20260512_ab12CD34',
          feature: 'F08',
          knowledge: 'Original knowledge',
          date: '2026-05-12T11:15:00.000Z',
          updated_at: '2026-05-12T11:15:00.000Z',
        })}\n`
      );
      const before = await readFile(workspace.lessonsPath, 'utf8');

      await expect(
        runLessonsUpdateCommand('lsn_20260512_zz99YY88', 'Missing lesson', {
          cwd: workspace.workspaceDir,
        })
      ).rejects.toBeInstanceOf(BitacoraError);

      expect(await readFile(workspace.lessonsPath, 'utf8')).toBe(before);
    } finally {
      await workspace.cleanup();
    }
  });

  it('runs the real CLI for history show and lessons CRUD commands', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-history-lessons-cli-'));
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
          'feature=F08',
          'plan=["write tests"]',
          'next_step=add lesson',
          '--agent',
          'manager',
        ],
        { cwd: workspaceDir }
      );

      await execFileAsync(
        'node',
        [
          runtime.entryPath,
          'lessons',
          'add',
          'Reuse current feature when omitted.',
          '--agent',
          'coder',
        ],
        { cwd: workspaceDir }
      );

      const addedLessons = readJsonLines(
        await readFile(path.join(workspaceDir, '.bitacora/memory/lessons.jsonl'), 'utf8')
      );
      const addedLesson = addedLessons[0];

      expect(addedLesson).toBeDefined();

      if (!addedLesson) {
        throw new Error('expected CLI lessons add to persist an entry');
      }

      expect(addedLessons).toHaveLength(1);

      await execFileAsync(
        'node',
        [runtime.entryPath, 'lessons', 'update', String(addedLesson.id), 'Updated through CLI'],
        { cwd: workspaceDir }
      );

      const lessonsList = await execFileAsync(
        'node',
        [runtime.entryPath, 'lessons', 'list', '--feature', 'F08'],
        { cwd: workspaceDir }
      );

      expect(JSON.parse(lessonsList.stdout)).toEqual([
        expect.objectContaining({
          id: addedLesson.id,
          knowledge: 'Updated through CLI',
          feature: 'F08',
        }),
      ]);

      await execFileAsync(
        'node',
        [runtime.entryPath, 'history', 'append', '--from-current', '--agent', 'manager'],
        { cwd: workspaceDir }
      );

      const historyShow = await execFileAsync(
        'node',
        [runtime.entryPath, 'history', 'show', '--feature', 'F08', '--last', '1'],
        { cwd: workspaceDir }
      );

      expect(JSON.parse(historyShow.stdout)).toEqual([
        expect.objectContaining({
          feature: 'F08',
          verification: {
            process: 'bitacora history append --from-current',
            result: 'current session archived by manager command',
          },
        }),
      ]);
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
    lessonsPath,
    cleanup: async () => {
      await rm(workspaceDir, { recursive: true, force: true });
    },
  };
}

async function createCliRuntime(): Promise<{ entryPath: string; cleanup: () => Promise<void> }> {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(sourceDir, '..');
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'bitacora-history-lessons-runtime-'));
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

function readJsonLines(content: string): Array<Record<string, unknown>> {
  return content
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}
