/**
 * Implements the history/lessons command workflows on top of memory storage.
 */

import { randomBytes } from 'node:crypto';
import path from 'node:path';

import { BitacoraError } from './bitacora-error.js';
import {
  readCurrentMemory,
  readHistoryMemory,
  readLessonsMemory,
  writeLessonsMemory,
} from './memory-storage.js';

const VALID_ROLES = new Set(['manager', 'coder', 'reviewer']);
const LESSON_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

type WritableIo = {
  writeStdout?: (chunk: string) => void;
  writeStderr?: (chunk: string) => void;
};

type CommandContext = WritableIo & {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
};

type HistoryShowOptions = {
  last?: string;
  feature?: string;
};

type SearchOptions = {
  query: string;
  semantic?: boolean;
  feature?: string;
};

type LessonsAddOptions = CommandContext & {
  feature?: string;
  agent?: string;
};

type LessonsListOptions = {
  feature?: string;
};

export async function runHistoryShowCommand(
  command: HistoryShowOptions = {},
  context: CommandContext = {}
): Promise<void> {
  const historyPath = resolveMemoryPath(context.cwd, 'history.jsonl');
  const history = await readHistoryMemory(historyPath);
  const featureFiltered = command.feature
    ? history.filter((entry) => entry.feature === command.feature)
    : history;
  const limited = command.last
    ? featureFiltered.slice(-parseLastOption(command.last))
    : featureFiltered;

  writeStdout(context, `${JSON.stringify(limited, null, 2)}\n`);
}

export async function runHistorySearchCommand(
  command: SearchOptions,
  context: CommandContext = {}
): Promise<void> {
  rejectSemanticSearch(command.semantic);

  const historyPath = resolveMemoryPath(context.cwd, 'history.jsonl');
  const history = await readHistoryMemory(historyPath);
  const normalizedQuery = normalizeSearchText(command.query);
  const filtered = history.filter((entry) => {
    if (command.feature && entry.feature !== command.feature) {
      return false;
    }

    return normalizeSearchText(buildHistorySearchText(entry)).includes(normalizedQuery);
  });

  writeStdout(context, `${JSON.stringify(filtered, null, 2)}\n`);
}

export async function runLessonsAddCommand(
  knowledge: string,
  options: LessonsAddOptions = {}
): Promise<void> {
  const lessonsPath = resolveMemoryPath(options.cwd, 'lessons.jsonl');
  const lessons = await readLessonsMemory(lessonsPath);
  const timestamp = getTimestamp(options);
  const agent = resolveOptionalAgent(options);
  const feature = await resolveLessonFeature(options);

  const nextEntry = {
    id: createLessonId(timestamp),
    feature,
    knowledge,
    ...(agent ? { agent } : {}),
    date: timestamp,
    updated_at: timestamp,
  };

  await writeLessonsMemory(lessonsPath, [...lessons, nextEntry]);
  writeStdout(options, `${JSON.stringify(nextEntry, null, 2)}\n`);
}

export async function runLessonsUpdateCommand(
  id: string,
  knowledge: string,
  context: CommandContext = {}
): Promise<void> {
  const lessonsPath = resolveMemoryPath(context.cwd, 'lessons.jsonl');
  const lessons = await readLessonsMemory(lessonsPath);
  const existingLesson = lessons.find((lesson) => lesson.id === id);

  if (!existingLesson) {
    throw new BitacoraError(`lesson not found: ${id}`, 1);
  }

  const updatedLesson = {
    ...existingLesson,
    knowledge,
    updated_at: getTimestamp(context),
  };

  await writeLessonsMemory(
    lessonsPath,
    lessons.map((lesson) => (lesson.id === id ? updatedLesson : lesson))
  );
  writeStdout(context, `${JSON.stringify(updatedLesson, null, 2)}\n`);
}

export async function runLessonsListCommand(
  command: LessonsListOptions = {},
  context: CommandContext = {}
): Promise<void> {
  const lessonsPath = resolveMemoryPath(context.cwd, 'lessons.jsonl');
  const lessons = await readLessonsMemory(lessonsPath);
  const filtered = command.feature
    ? lessons.filter((lesson) => lesson.feature === command.feature)
    : lessons;

  writeStdout(context, `${JSON.stringify(filtered, null, 2)}\n`);
}

export async function runLessonsSearchCommand(
  command: SearchOptions,
  context: CommandContext = {}
): Promise<void> {
  rejectSemanticSearch(command.semantic);

  const lessonsPath = resolveMemoryPath(context.cwd, 'lessons.jsonl');
  const lessons = await readLessonsMemory(lessonsPath);
  const normalizedQuery = normalizeSearchText(command.query);
  const filtered = lessons.filter((lesson) => {
    if (command.feature && lesson.feature !== command.feature) {
      return false;
    }

    return normalizeSearchText(lesson.knowledge).includes(normalizedQuery);
  });

  writeStdout(context, `${JSON.stringify(filtered, null, 2)}\n`);
}

function parseLastOption(rawValue: string): number {
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new BitacoraError('history show --last must be a positive integer', 1);
  }

  return value;
}

function rejectSemanticSearch(semantic: boolean | undefined): void {
  if (semantic) {
    throw new BitacoraError(
      'semantic search not implemented in v1; use lexical (omit --semantic)',
      5
    );
  }
}

function buildHistorySearchText(
  entry: Awaited<ReturnType<typeof readHistoryMemory>>[number]
): string {
  return [
    ...entry.plan,
    ...entry.bitacora.map((item) => item.msg),
    entry.verification.process,
  ].join(' ');
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase();
}

async function resolveLessonFeature(options: LessonsAddOptions): Promise<string> {
  if (options.feature) {
    return options.feature;
  }

  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const current = await readCurrentMemory(currentPath);

  if ('feature' in current && current.feature) {
    return current.feature;
  }

  throw new BitacoraError('lessons add requires --feature or an active current feature', 1);
}

function resolveOptionalAgent(options: LessonsAddOptions): string | undefined {
  const agent = options.agent ?? options.env?.BITACORA_AGENT;

  if (agent === undefined) {
    return undefined;
  }

  if (!VALID_ROLES.has(agent)) {
    throw new BitacoraError(
      'permission denied: pass --agent <manager|coder|reviewer> or set BITACORA_AGENT',
      3
    );
  }

  return agent;
}

function createLessonId(timestamp: string): string {
  return `lsn_${timestamp.slice(0, 10).replaceAll('-', '')}_${randomToken(8)}`;
}

function randomToken(length: number): string {
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => LESSON_ID_ALPHABET[byte % LESSON_ID_ALPHABET.length]).join('');
}

function resolveMemoryPath(cwd = process.cwd(), fileName: string): string {
  return path.join(cwd, '.bitacora', 'memory', fileName);
}

function getTimestamp(options: CommandContext): string {
  return (options.now ?? (() => new Date()))().toISOString();
}

function writeStdout(options: WritableIo, chunk: string): void {
  (options.writeStdout ?? ((value: string) => process.stdout.write(value)))(chunk);
}
