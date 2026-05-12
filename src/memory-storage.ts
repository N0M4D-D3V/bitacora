/**
 * Schema-validated persistence helpers for Bitacora memory files.
 */

import { randomUUID } from 'node:crypto';
import { appendFile, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { BitacoraError } from './bitacora-error.js';

const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const LOCK_RETRY_INTERVAL_MS = 50;

const isoTimestampSchema = z.string().datetime({ offset: true });

const bitacoraEntrySchema = z.strictObject({
  ts: isoTimestampSchema,
  agent: z.string().min(1),
  msg: z.string().min(1),
});

const currentMemoryActiveSchema = z.strictObject({
  feature: z.string().min(1),
  agent: z.string().min(1),
  start: isoTimestampSchema,
  status: z.enum(['in_progress', 'in_review', 'done']),
  plan: z.array(z.string()),
  bitacora: z.array(bitacoraEntrySchema),
  next_step: z.string(),
});

export const currentMemorySchema = z.union([z.strictObject({}), currentMemoryActiveSchema]);

const historyEntrySchema = z.strictObject({
  agent: z.string().min(1),
  feature: z.string().min(1),
  date: isoTimestampSchema,
  plan: z.array(z.string()),
  bitacora: z.array(bitacoraEntrySchema),
  verification: z.strictObject({
    process: z.string().min(1),
    result: z.string().min(1),
  }),
  close: z.enum(['done', 'interrupted', 'abandoned', 'blocked']),
});

export const historyMemorySchema = z.array(historyEntrySchema);

const lessonsEntrySchema = z.strictObject({
  id: z.string().regex(/^lsn_\d{8}_[A-Za-z0-9]{8}$/),
  feature: z.string().min(1),
  knowledge: z.string().min(1),
  agent: z.string().min(1).optional(),
  date: isoTimestampSchema,
  updated_at: isoTimestampSchema,
});

export const lessonsMemorySchema = z.array(lessonsEntrySchema);

export type CurrentMemory = z.infer<typeof currentMemorySchema>;
export type HistoryMemory = z.infer<typeof historyMemorySchema>;
export type LessonsMemory = z.infer<typeof lessonsMemorySchema>;

export type MemoryWriteOptions = {
  lockTimeoutMs?: number;
  beforeRename?: (tempPath: string) => Promise<void> | void;
};

export class MemoryValidationError extends BitacoraError {
  constructor(message: string) {
    super(message, 2);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryWriteLockError extends BitacoraError {
  constructor(message: string) {
    super(message, 4);
    this.name = 'MemoryWriteLockError';
  }
}

type MemoryLockClaim = {
  pid: number;
  token: string;
  acquiredAt: string;
};

type MemoryLockEvent = MemoryLockClaimEvent | MemoryLockReleaseEvent;

type MemoryLockClaimEvent = MemoryLockClaim & {
  type: 'claim';
};

type MemoryLockReleaseEvent = {
  type: 'release';
  token: string;
};

export function parseCurrentMemory(content: string): CurrentMemory {
  return parseJsonContent(content, currentMemorySchema, 'current.json');
}

export function validateCurrentMemory(value: unknown): CurrentMemory {
  return validateValue(value, currentMemorySchema, 'current.json');
}

export function parseHistoryMemory(content: string): HistoryMemory {
  return parseJsonLinesContent(content, historyMemorySchema, 'history.jsonl');
}

export function validateHistoryMemory(value: unknown): HistoryMemory {
  return validateValue(value, historyMemorySchema, 'history.jsonl');
}

export function parseLessonsMemory(content: string): LessonsMemory {
  return parseJsonLinesContent(content, lessonsMemorySchema, 'lessons.jsonl');
}

export function validateLessonsMemory(value: unknown): LessonsMemory {
  return validateValue(value, lessonsMemorySchema, 'lessons.jsonl');
}

export async function readCurrentMemory(filePath: string): Promise<CurrentMemory> {
  return parseCurrentMemory(await readFile(filePath, 'utf8'));
}

export async function readHistoryMemory(filePath: string): Promise<HistoryMemory> {
  return parseHistoryMemory(await readFile(filePath, 'utf8'));
}

export async function readLessonsMemory(filePath: string): Promise<LessonsMemory> {
  return parseLessonsMemory(await readFile(filePath, 'utf8'));
}

export async function writeCurrentMemory(
  filePath: string,
  value: unknown,
  options: MemoryWriteOptions = {}
): Promise<CurrentMemory> {
  return writeMemoryFile({
    filePath,
    value,
    parseExisting: parseCurrentMemory,
    validateNext: validateCurrentMemory,
    serialize: serializeJsonFile,
    options,
  });
}

export async function writeHistoryMemory(
  filePath: string,
  value: unknown,
  options: MemoryWriteOptions = {}
): Promise<HistoryMemory> {
  return writeMemoryFile({
    filePath,
    value,
    parseExisting: parseHistoryMemory,
    validateNext: validateHistoryMemory,
    serialize: serializeJsonLinesFile,
    options,
  });
}

export async function writeLessonsMemory(
  filePath: string,
  value: unknown,
  options: MemoryWriteOptions = {}
): Promise<LessonsMemory> {
  return writeMemoryFile({
    filePath,
    value,
    parseExisting: parseLessonsMemory,
    validateNext: validateLessonsMemory,
    serialize: serializeJsonLinesFile,
    options,
  });
}

type WriteMemoryFileArgs<T> = {
  filePath: string;
  value: unknown;
  parseExisting: (content: string) => T;
  validateNext: (value: unknown) => T;
  serialize: (value: T) => string;
  options: MemoryWriteOptions;
};

async function writeMemoryFile<T>({
  filePath,
  value,
  parseExisting,
  validateNext,
  serialize,
  options,
}: WriteMemoryFileArgs<T>): Promise<T> {
  const release = await acquireMemoryWriteLock(
    resolveLockFilePath(filePath),
    options.lockTimeoutMs
  );

  try {
    parseExisting(await readFile(filePath, 'utf8'));

    const nextValue = validateNext(value);
    const serialized = serialize(nextValue);
    const reparsedValue = parseExisting(serialized);

    await atomicWriteFile(filePath, serialized, options.beforeRename);

    return reparsedValue;
  } finally {
    await release();
  }
}

async function acquireMemoryWriteLock(
  lockFilePath: string,
  timeoutMs = DEFAULT_LOCK_TIMEOUT_MS
): Promise<() => Promise<void>> {
  await writeFile(lockFilePath, '', { flag: 'a' });
  const claim: MemoryLockClaim = {
    pid: process.pid,
    token: randomUUID(),
    acquiredAt: new Date().toISOString(),
  };
  await appendLockEvent(lockFilePath, formatClaimEvent(claim));

  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt <= timeoutMs) {
      const currentOwner = await readLockOwner(lockFilePath);

      if (!currentOwner || currentOwner.token === claim.token) {
        return async () => {
          await appendLockEvent(lockFilePath, formatReleaseEvent(claim.token));
        };
      }

      await delay(LOCK_RETRY_INTERVAL_MS);
    }
  } catch (error) {
    await appendLockEvent(lockFilePath, formatReleaseEvent(claim.token));
    throw error;
  }

  await appendLockEvent(lockFilePath, formatReleaseEvent(claim.token));
  throw new MemoryWriteLockError(`timed out acquiring Bitacora memory lock after ${timeoutMs}ms`);
}

function resolveLockFilePath(filePath: string): string {
  return path.join(path.dirname(path.dirname(filePath)), '.lock');
}

async function readLockOwner(lockFilePath: string): Promise<MemoryLockClaim | null> {
  const activeClaims = await readActiveLockClaims(lockFilePath);

  for (const claim of activeClaims) {
    if (isProcessAlive(claim.pid)) {
      return claim;
    }
  }

  return null;
}

async function readActiveLockClaims(lockFilePath: string): Promise<MemoryLockClaim[]> {
  const content = await readFile(lockFilePath, 'utf8');
  const releasedTokens = new Set<string>();
  const claims: MemoryLockClaim[] = [];

  for (const line of content.split('\n')) {
    const event = parseLockEvent(line);

    if (!event) {
      continue;
    }

    if (event.type === 'release') {
      releasedTokens.add(event.token);
      continue;
    }

    if (!releasedTokens.has(event.token)) {
      claims.push(event);
    }
  }

  return claims.filter((claim) => !releasedTokens.has(claim.token));
}

function parseLockEvent(line: string): MemoryLockEvent | null {
  if (line === '') {
    return null;
  }

  const parts = line.split('\t');

  if (parts[0] === 'claim' && parts.length === 4) {
    const pid = Number(parts[2]);

    if (Number.isInteger(pid) && parts[1] && parts[3]) {
      return {
        type: 'claim',
        token: parts[1],
        pid,
        acquiredAt: parts[3],
      };
    }
  }

  if (parts[0] === 'release' && parts.length === 2 && parts[1]) {
    return {
      type: 'release',
      token: parts[1],
    };
  }

  return null;
}

function formatClaimEvent(claim: MemoryLockClaim): string {
  return `claim\t${claim.token}\t${claim.pid}\t${claim.acquiredAt}`;
}

function formatReleaseEvent(token: string): string {
  return `release\t${token}`;
}

async function appendLockEvent(lockFilePath: string, eventLine: string): Promise<void> {
  await appendFile(lockFilePath, `${eventLine}\n`, 'utf8');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrorCode(error) !== 'ESRCH';
  }
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

async function delay(durationMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function atomicWriteFile(
  filePath: string,
  content: string,
  beforeRename?: (tempPath: string) => Promise<void> | void
): Promise<void> {
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );

  try {
    await writeFile(tempPath, content, 'utf8');

    if (beforeRename) {
      await beforeRename(tempPath);
    }

    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function parseJsonContent<T>(content: string, schema: z.ZodType<T>, fileLabel: string): T {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(content);
  } catch (error) {
    throw new MemoryValidationError(
      `${fileLabel} contains invalid JSON: ${getErrorMessage(error)}`
    );
  }

  return validateValue(parsedValue, schema, fileLabel);
}

function parseJsonLinesContent<T>(content: string, schema: z.ZodType<T>, fileLabel: string): T {
  const lines = content.split('\n');

  if (lines.at(-1) === '') {
    lines.pop();
  }

  const parsedLines = lines.map((line, index) => {
    if (line.trim() === '') {
      throw new MemoryValidationError(`${fileLabel} contains an empty line at ${index + 1}`);
    }

    try {
      return JSON.parse(line) as unknown;
    } catch (error) {
      throw new MemoryValidationError(
        `${fileLabel} contains invalid JSON on line ${index + 1}: ${getErrorMessage(error)}`
      );
    }
  });

  return validateValue(parsedLines, schema, fileLabel);
}

function validateValue<T>(value: unknown, schema: z.ZodType<T>, fileLabel: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new MemoryValidationError(
      `${fileLabel} failed schema validation: ${result.error.issues
        .map((issue) => {
          const issuePath = issue.path.length === 0 ? '<root>' : issue.path.join('.');
          return `${issuePath}: ${issue.message}`;
        })
        .join('; ')}`
    );
  }

  return result.data;
}

function serializeJsonFile(value: CurrentMemory): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function serializeJsonLinesFile(value: HistoryMemory | LessonsMemory): string {
  if (value.length === 0) {
    return '';
  }

  return `${value.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
