/**
 * Implements the current/session command workflows on top of memory storage.
 */

import path from 'node:path';

import { BitacoraError } from './bitacora-error.js';
import {
  type CurrentMemory,
  readCurrentMemory,
  readHistoryMemory,
  writeCurrentMemory,
  writeHistoryMemory,
} from './memory-storage.js';

const MANAGER_ROLE = 'manager';
const VALID_ROLES = new Set(['manager', 'coder', 'reviewer']);

type WritableIo = {
  writeStdout?: (chunk: string) => void;
  writeStderr?: (chunk: string) => void;
};

type CommandContext = WritableIo & {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
};

type AgentCommandContext = CommandContext & {
  agent?: string;
};

type SessionClose = 'done' | 'abandoned' | 'blocked';
type CurrentStatus = 'in_progress' | 'in_review' | 'done';

type SessionEndOptions = AgentCommandContext & {
  close?: SessionClose;
};

export async function runSessionStartCommand(options: AgentCommandContext = {}): Promise<void> {
  const agent = requireManagerAgent(options);
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const historyPath = resolveMemoryPath(options.cwd, 'history.jsonl');
  const current = await readCurrentMemory(currentPath);

  if (isEmptyCurrent(current)) {
    writeStdout(options, 'session start: no active session to recover\n');
    return;
  }

  await appendCurrentToHistory(historyPath, current, {
    close: 'interrupted',
    date: getTimestamp(options),
    process: 'bitacora session start',
    result: 'previous session archived as interrupted during recovery',
  });
  await writeCurrentMemory(currentPath, {});
  writeStdout(options, `session start: archived interrupted session for ${current.feature}\n`);
  void agent;
}

export async function runSessionEndCommand(options: SessionEndOptions = {}): Promise<void> {
  requireManagerAgent(options);
  const archivedCurrent = await archiveCurrentState(options, {
    close: options.close ?? 'done',
    process: 'bitacora session end',
    result: 'session archived by manager',
    emptyCurrentMessage: 'session end requires a non-empty current.json',
  });

  writeStdout(
    options,
    `session end: archived ${archivedCurrent.feature} with close=${options.close ?? 'done'}\n`
  );
}

export async function runHistoryAppendFromCurrentCommand(
  options: AgentCommandContext = {}
): Promise<void> {
  requireManagerAgent(options);
  const archivedCurrent = await archiveCurrentState(options, {
    close: 'done',
    process: 'bitacora history append --from-current',
    result: 'current session archived by manager command',
    emptyCurrentMessage: 'history append --from-current requires a non-empty current.json',
  });

  writeStdout(options, `history append: archived ${archivedCurrent.feature} from current\n`);
}

export async function runCurrentLogCommand(
  message: string,
  options: AgentCommandContext = {}
): Promise<void> {
  const agent = requireAgent(options);
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const current = await readCurrentMemory(currentPath);

  if (isEmptyCurrent(current)) {
    throw new BitacoraError('current log requires an active current session', 1);
  }

  await writeCurrentMemory(currentPath, {
    ...current,
    bitacora: [...current.bitacora, { ts: getTimestamp(options), agent, msg: message }],
  });
  writeStdout(options, `current log: appended entry for ${agent}\n`);
}

export async function runCurrentStatusCommand(
  status: CurrentStatus,
  options: AgentCommandContext = {}
): Promise<void> {
  requireManagerAgent(options);
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const current = await readCurrentMemory(currentPath);

  if (isEmptyCurrent(current)) {
    throw new BitacoraError('current status requires an active current session', 1);
  }

  await writeCurrentMemory(currentPath, {
    ...current,
    status,
  });
  writeStdout(options, `current status: ${status}\n`);
}

export async function runCurrentSetCommand(
  keyValues: string[],
  options: AgentCommandContext = {}
): Promise<void> {
  const agent = requireManagerAgent(options);
  const updates = parseCurrentSetArguments(keyValues);
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const current = await readCurrentMemory(currentPath);
  const nextCurrent = createNextCurrentState(current, updates, getTimestamp(options), agent);

  await writeCurrentMemory(currentPath, nextCurrent);
  writeStdout(options, `${JSON.stringify(nextCurrent, null, 2)}\n`);
}

export async function runCurrentShowCommand(options: CommandContext = {}): Promise<void> {
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const current = await readCurrentMemory(currentPath);

  writeStdout(options, `${JSON.stringify(current, null, 2)}\n`);
}

type CurrentSetUpdates = {
  feature?: string;
  plan?: string[];
  next_step?: string;
};

function createNextCurrentState(
  current: CurrentMemory,
  updates: CurrentSetUpdates,
  timestamp: string,
  agent: string
): CurrentMemory {
  const base = isEmptyCurrent(current)
    ? {
        feature: updates.feature ?? '',
        agent,
        start: timestamp,
        status: 'in_progress' as const,
        plan: [],
        bitacora: [],
        next_step: '',
      }
    : current;

  const nextCurrent = {
    ...base,
    ...updates,
  };

  if (nextCurrent.feature === '') {
    throw new BitacoraError('current set requires feature=<name> when current.json is empty', 1);
  }

  return nextCurrent;
}

function parseCurrentSetArguments(keyValues: string[]): CurrentSetUpdates {
  const updates: CurrentSetUpdates = {};

  for (const keyValue of keyValues) {
    const separatorIndex = keyValue.indexOf('=');

    if (separatorIndex <= 0) {
      throw new BitacoraError(`invalid current set assignment: ${keyValue}`, 1);
    }

    const key = keyValue.slice(0, separatorIndex);
    const rawValue = keyValue.slice(separatorIndex + 1);

    if (key === 'feature') {
      updates.feature = rawValue;
      continue;
    }

    if (key === 'next_step') {
      updates.next_step = rawValue;
      continue;
    }

    if (key === 'plan') {
      updates.plan = parsePlanValue(rawValue);
      continue;
    }

    throw new BitacoraError(`current set does not support key "${key}"`, 1);
  }

  return updates;
}

function parsePlanValue(rawValue: string): string[] {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    throw new BitacoraError('current set plan must be a JSON array of strings', 1);
  }

  if (!Array.isArray(parsedValue) || !parsedValue.every((entry) => typeof entry === 'string')) {
    throw new BitacoraError('current set plan must be a JSON array of strings', 1);
  }

  return parsedValue;
}

async function appendCurrentToHistory(
  historyPath: string,
  current: Exclude<CurrentMemory, Record<string, never>>,
  options: {
    close: 'done' | 'abandoned' | 'blocked' | 'interrupted';
    date: string;
    process: string;
    result: string;
  }
): Promise<void> {
  const history = await readHistoryMemory(historyPath);

  await writeHistoryMemory(historyPath, [
    ...history,
    {
      agent: current.agent,
      feature: current.feature,
      date: options.date,
      plan: current.plan,
      bitacora: current.bitacora,
      verification: {
        process: options.process,
        result: options.result,
      },
      close: options.close,
    },
  ]);
}

async function archiveCurrentState(
  options: AgentCommandContext,
  archive: {
    close: 'done' | 'abandoned' | 'blocked' | 'interrupted';
    process: string;
    result: string;
    emptyCurrentMessage: string;
  }
): Promise<Exclude<CurrentMemory, Record<string, never>>> {
  const currentPath = resolveMemoryPath(options.cwd, 'current.json');
  const historyPath = resolveMemoryPath(options.cwd, 'history.jsonl');
  const current = await readCurrentMemory(currentPath);

  if (isEmptyCurrent(current)) {
    throw new BitacoraError(archive.emptyCurrentMessage, 1);
  }

  await appendCurrentToHistory(historyPath, current, {
    close: archive.close,
    date: getTimestamp(options),
    process: archive.process,
    result: archive.result,
  });
  await writeCurrentMemory(currentPath, {});

  return current;
}

function requireManagerAgent(options: AgentCommandContext): string {
  const agent = requireAgent(options);

  if (agent !== MANAGER_ROLE) {
    throw new BitacoraError(`permission denied: ${agent} cannot perform manager-only action`, 3);
  }

  return agent;
}

function requireAgent(options: AgentCommandContext): string {
  const agent = options.agent ?? options.env?.BITACORA_AGENT;

  if (!agent || !VALID_ROLES.has(agent)) {
    throw new BitacoraError(
      'permission denied: pass --agent <manager|coder|reviewer> or set BITACORA_AGENT',
      3
    );
  }

  return agent;
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

function isEmptyCurrent(current: CurrentMemory): current is Record<string, never> {
  return Object.keys(current).length === 0;
}
