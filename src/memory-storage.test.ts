import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  MemoryValidationError,
  parseCurrentMemory,
  parseHistoryMemory,
  parseLessonsMemory,
  readCurrentMemory,
  readHistoryMemory,
  readLessonsMemory,
  validateCurrentMemory,
  validateHistoryMemory,
  validateLessonsMemory,
  writeCurrentMemory,
  writeHistoryMemory,
  writeLessonsMemory,
} from './memory-storage.js';

const CURRENT_MEMORY_ACTIVE = {
  feature: 'memory_storage_foundation',
  agent: 'coder',
  start: '2026-05-11T12:00:00.000Z',
  status: 'in_progress' as const,
  plan: ['define schemas'],
  bitacora: [{ ts: '2026-05-11T12:05:00.000Z', agent: 'coder', msg: 'started' }],
  next_step: 'write tests',
};

const HISTORY_ENTRY = {
  agent: 'manager',
  feature: 'memory_storage_foundation',
  date: '2026-05-11T12:10:00.000Z',
  plan: ['review implementation'],
  bitacora: [{ ts: '2026-05-11T12:11:00.000Z', agent: 'manager', msg: 'reviewed' }],
  verification: {
    process: 'pnpm test:run',
    result: 'passed',
  },
  close: 'done' as const,
};

const LESSON_ENTRY = {
  id: 'lsn_20260511_ab12CD34',
  feature: 'memory_storage_foundation',
  knowledge: 'Atomic rename keeps current.json intact during interrupted writes.',
  agent: 'reviewer',
  date: '2026-05-11T12:15:00.000Z',
  updated_at: '2026-05-11T12:15:00.000Z',
};

describe('memory storage', () => {
  it('parses current memory empty and active states', () => {
    expect(parseCurrentMemory('{}\n')).toEqual({});
    expect(
      parseCurrentMemory(`{
        "feature": "memory_storage_foundation",
        "agent": "coder",
        "start": "2026-05-11T12:00:00.000Z",
        "status": "in_progress",
        "plan": ["define schemas"],
        "bitacora": [{ "ts": "2026-05-11T12:05:00.000Z", "agent": "coder", "msg": "started" }],
        "next_step": "write tests"
      }`)
    ).toEqual(CURRENT_MEMORY_ACTIVE);
  });

  it('parses and validates history and lessons collections', () => {
    expect(parseHistoryMemory(`${JSON.stringify(HISTORY_ENTRY)}\n`)).toEqual([HISTORY_ENTRY]);
    expect(parseLessonsMemory(`${JSON.stringify(LESSON_ENTRY)}\n`)).toEqual([LESSON_ENTRY]);
    expect(validateCurrentMemory(CURRENT_MEMORY_ACTIVE)).toEqual(CURRENT_MEMORY_ACTIVE);
    expect(validateHistoryMemory([HISTORY_ENTRY])).toEqual([HISTORY_ENTRY]);
    expect(validateLessonsMemory([LESSON_ENTRY])).toEqual([LESSON_ENTRY]);
  });

  it('rejects schema-invalid memory content with exit code 2', () => {
    expect(() => parseCurrentMemory('{"status":"paused"}\n')).toThrowError(MemoryValidationError);
    expect(() => validateHistoryMemory([{ agent: 'manager' }])).toThrowError(MemoryValidationError);

    try {
      parseLessonsMemory('{"feature":"x"}\n');
      throw new Error('expected parseLessonsMemory to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MemoryValidationError);
      expect((error as MemoryValidationError).exitCode).toBe(2);
    }
  });

  it('reads and writes each memory file through the exported helpers', async () => {
    const workspace = await createMemoryWorkspace('bitacora-memory-helpers-');

    try {
      expect(await writeCurrentMemory(workspace.currentPath, CURRENT_MEMORY_ACTIVE)).toEqual(
        CURRENT_MEMORY_ACTIVE
      );
      expect(await writeHistoryMemory(workspace.historyPath, [HISTORY_ENTRY])).toEqual([
        HISTORY_ENTRY,
      ]);
      expect(await writeLessonsMemory(workspace.lessonsPath, [LESSON_ENTRY])).toEqual([
        LESSON_ENTRY,
      ]);

      expect(await readCurrentMemory(workspace.currentPath)).toEqual(CURRENT_MEMORY_ACTIVE);
      expect(await readHistoryMemory(workspace.historyPath)).toEqual([HISTORY_ENTRY]);
      expect(await readLessonsMemory(workspace.lessonsPath)).toEqual([LESSON_ENTRY]);

      expect(await readFile(workspace.currentPath, 'utf8')).toContain(
        '"feature": "memory_storage_foundation"'
      );
      expect(await readFile(workspace.historyPath, 'utf8')).toBe(
        `${JSON.stringify(HISTORY_ENTRY)}\n`
      );
      expect(await readFile(workspace.lessonsPath, 'utf8')).toBe(
        `${JSON.stringify(LESSON_ENTRY)}\n`
      );
    } finally {
      await workspace.cleanup();
    }
  });

  it('does not mutate the target file when validation fails', async () => {
    const workspace = await createMemoryWorkspace('bitacora-memory-invalid-');

    try {
      await expect(
        writeCurrentMemory(workspace.currentPath, {
          status: 'done',
        })
      ).rejects.toBeInstanceOf(MemoryValidationError);

      expect(await readFile(workspace.currentPath, 'utf8')).toBe('{}\n');
    } finally {
      await workspace.cleanup();
    }
  });

  it('locks without depending on an external flock binary on PATH', async () => {
    const workspace = await createMemoryWorkspace('bitacora-memory-lock-pathless-');
    let workerRuntime: Awaited<ReturnType<typeof writeWorkerScript>> | null = null;

    try {
      workerRuntime = await writeWorkerScript();
      const readyPath = path.join(workspace.workspaceDir, 'pathless-ready');
      const pathlessEnv = { ...process.env, PATH: workspace.workspaceDir };

      const firstWriter = spawnMemoryWriter(
        workerRuntime.workerPath,
        workspace.currentPath,
        readyPath,
        200,
        5_000,
        pathlessEnv
      );

      await waitForWorkerReady(firstWriter, readyPath);

      const secondWriter = spawnMemoryWriter(
        workerRuntime.workerPath,
        workspace.currentPath,
        '-',
        0,
        5_000,
        pathlessEnv
      );

      const firstResultPromise = waitForChildResult(firstWriter);
      const secondResultPromise = waitForChildResult(secondWriter);
      const [firstResult, secondResult] = await Promise.all([
        firstResultPromise,
        secondResultPromise,
      ]);

      expect(firstResult.exitCode).toBe(0);
      expect(secondResult.exitCode).toBe(0);
    } finally {
      if (workerRuntime) {
        await workerRuntime.cleanup();
      }
      await workspace.cleanup();
    }
  }, 15_000);

  it('uses the persistent .bitacora/.lock file for multi-process contention', async () => {
    const workspace = await createMemoryWorkspace('bitacora-memory-lock-process-');
    const lockPath = path.join(workspace.bitacoraDir, '.lock');
    let workerRuntime: Awaited<ReturnType<typeof writeWorkerScript>> | null = null;

    try {
      workerRuntime = await writeWorkerScript();
      const readyPath = path.join(workspace.workspaceDir, 'writer-ready');

      const firstWriter = spawnMemoryWriter(
        workerRuntime.workerPath,
        workspace.currentPath,
        readyPath,
        400,
        5_000
      );

      await waitForWorkerReady(firstWriter, readyPath);

      const lockStats = await lstat(lockPath);

      expect(lockStats.isFile()).toBe(true);
      await expectNoSiblingLockArtifacts(workspace.bitacoraDir);

      const secondWriter = spawnMemoryWriter(
        workerRuntime.workerPath,
        workspace.currentPath,
        '-',
        0,
        100
      );
      const secondResult = await waitForChildResult(secondWriter);

      expect(secondResult.exitCode).toBe(4);
      expect(secondResult.stderr).toContain('timed out acquiring Bitacora memory lock');
      await expectNoSiblingLockArtifacts(workspace.bitacoraDir);

      const firstResult = await waitForChildResult(firstWriter);

      expect(firstResult.exitCode).toBe(0);
      expect((await lstat(lockPath)).isFile()).toBe(true);
      await expectNoSiblingLockArtifacts(workspace.bitacoraDir);
      expect(await readCurrentMemory(workspace.currentPath)).toEqual({
        ...CURRENT_MEMORY_ACTIVE,
        bitacora: [],
        plan: ['hold lock in worker'],
        next_step: 'release worker lock',
      });
    } finally {
      if (workerRuntime) {
        await workerRuntime.cleanup();
      }
      await workspace.cleanup();
    }
  }, 15_000);

  it('keeps the original file intact when a separate process is killed before rename', async () => {
    const workspace = await createMemoryWorkspace('bitacora-memory-atomic-process-');
    const originalContent = '{}\n';
    const lockPath = path.join(workspace.bitacoraDir, '.lock');
    let workerRuntime: Awaited<ReturnType<typeof writeWorkerScript>> | null = null;

    try {
      workerRuntime = await writeWorkerScript();
      const readyPath = path.join(workspace.workspaceDir, 'atomic-ready');

      const writer = spawnMemoryWriter(
        workerRuntime.workerPath,
        workspace.currentPath,
        readyPath,
        10_000,
        5_000
      );

      await waitForWorkerReady(writer, readyPath);

      expect(await readFile(workspace.currentPath, 'utf8')).toBe(originalContent);
      expect((await lstat(lockPath)).isFile()).toBe(true);
      await expectNoSiblingLockArtifacts(workspace.bitacoraDir);

      const memoryEntries = await readdir(workspace.memoryDir);

      expect(memoryEntries.some((entry) => entry !== 'current.json')).toBe(true);

      writer.kill('SIGKILL');

      const [exitCode, signal] = await once(writer, 'exit');

      expect(exitCode).toBeNull();
      expect(signal).toBe('SIGKILL');
      expect(await readFile(workspace.currentPath, 'utf8')).toBe(originalContent);
      expect((await lstat(lockPath)).isFile()).toBe(true);
      await expectNoSiblingLockArtifacts(workspace.bitacoraDir);
    } finally {
      if (workerRuntime) {
        await workerRuntime.cleanup();
      }
      await workspace.cleanup();
    }
  }, 15_000);
});

async function createMemoryWorkspace(prefix: string) {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), prefix));
  const bitacoraDir = path.join(workspaceDir, '.bitacora');
  const memoryDir = path.join(bitacoraDir, 'memory');
  const currentPath = path.join(memoryDir, 'current.json');
  const historyPath = path.join(memoryDir, 'history.jsonl');
  const lessonsPath = path.join(memoryDir, 'lessons.jsonl');

  await mkdir(memoryDir, { recursive: true });
  await writeFile(path.join(bitacoraDir, '.lock'), '');
  await writeFile(currentPath, '{}\n');
  await writeFile(historyPath, '');
  await writeFile(lessonsPath, '');

  return {
    workspaceDir,
    bitacoraDir,
    memoryDir,
    currentPath,
    historyPath,
    lessonsPath,
    cleanup: async () => {
      await rm(workspaceDir, { recursive: true, force: true });
    },
  };
}

async function writeWorkerScript(): Promise<{ workerPath: string; cleanup: () => Promise<void> }> {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(sourceDir, '..');
  const workerRuntimeDir = await mkdtemp(path.join(tmpdir(), 'bitacora-memory-worker-'));
  const workerPath = path.join(workerRuntimeDir, 'memory-writer.mjs');

  await symlink(path.join(repoRoot, 'node_modules'), path.join(workerRuntimeDir, 'node_modules'));

  await transpileRuntimeModule(
    path.join(sourceDir, 'bitacora-error.ts'),
    path.join(workerRuntimeDir, 'bitacora-error.js')
  );
  await transpileRuntimeModule(
    path.join(sourceDir, 'memory-storage.ts'),
    path.join(workerRuntimeDir, 'memory-storage.js')
  );

  await writeFile(
    workerPath,
    `import { writeFile } from 'node:fs/promises';
import { writeCurrentMemory } from './memory-storage.js';

const [, , filePath, readyPath, holdMsArg, timeoutMsArg] = process.argv;
const holdMs = Number(holdMsArg);
const timeoutMs = Number(timeoutMsArg);

try {
  await writeCurrentMemory(
    filePath,
    {
      feature: 'memory_storage_foundation',
      agent: 'coder',
      start: '2026-05-11T12:00:00.000Z',
      status: 'in_progress',
      plan: ['hold lock in worker'],
      bitacora: [],
      next_step: 'release worker lock',
    },
    {
      lockTimeoutMs: timeoutMs,
      beforeRename: async () => {
        if (readyPath !== '-') {
          await writeFile(readyPath, 'ready');
        }

        if (holdMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, holdMs));
        }
      },
    }
  );
} catch (error) {
  if (error instanceof Error) {
    process.stderr.write(error.name + ': ' + error.message + '\\n');
  }

  process.exitCode = typeof error === 'object' && error !== null && 'exitCode' in error
    ? Number(error.exitCode)
    : 1;
}
`
  );

  return {
    workerPath,
    cleanup: async () => {
      await rm(workerRuntimeDir, { recursive: true, force: true });
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

  await writeFile(outputPath, transpiled.outputText);
}

function spawnMemoryWriter(
  workerPath: string,
  currentPath: string,
  readyPath: string,
  holdMs: number,
  timeoutMs: number,
  env: NodeJS.ProcessEnv = process.env
) {
  return spawn(
    process.execPath,
    [workerPath, currentPath, readyPath, String(holdMs), String(timeoutMs)],
    {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

async function waitForChildResult(child: ReturnType<typeof spawnMemoryWriter>) {
  let stdout = '';
  let stderr = '';

  if (!child.stdout || !child.stderr) {
    throw new Error('worker process streams were not piped');
  }

  child.stdout.on('data', (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  const [exitCode, signal] = await once(child, 'exit');

  return {
    exitCode,
    signal,
    stdout,
    stderr,
  };
}

async function waitForWorkerReady(
  child: ReturnType<typeof spawnMemoryWriter>,
  targetPath: string
): Promise<void> {
  const startedAt = Date.now();

  while (!(await pathExists(targetPath))) {
    if (child.exitCode !== null) {
      const childResult = await waitForChildResult(child);
      throw new Error(
        `worker exited before signaling readiness: ${childResult.stderr || childResult.stdout}`
      );
    }

    if (Date.now() - startedAt > 5_000) {
      throw new Error(`timed out waiting for ${targetPath}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function expectNoSiblingLockArtifacts(bitacoraDir: string): Promise<void> {
  const siblingLockArtifacts = (await readdir(bitacoraDir)).filter(
    (entry) => entry.startsWith('.lock') && entry !== '.lock'
  );

  expect(siblingLockArtifacts).toEqual([]);
}
