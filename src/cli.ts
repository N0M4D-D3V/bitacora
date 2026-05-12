/**
 * Builds and runs the Bitacora CLI command tree.
 */

import { Command, CommanderError } from 'commander';

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
import {
  runHistoryShowCommand,
  runLessonsAddCommand,
  runLessonsListCommand,
  runLessonsUpdateCommand,
} from './history-lessons-command.js';
import { runInitCommand } from './init-command.js';

export type CliIo = {
  writeStdout: (chunk: string) => void;
  writeStderr: (chunk: string) => void;
};

const defaultIo: CliIo = {
  writeStdout: (chunk) => {
    process.stdout.write(chunk);
  },
  writeStderr: (chunk) => {
    process.stderr.write(chunk);
  },
};

export function createCliProgram(io: CliIo = defaultIo): Command {
  const program = new Command();

  program
    .name('bitacora')
    .description('Bitacora CLI for project harness and memory management.')
    .showHelpAfterError()
    .configureOutput({
      writeOut: io.writeStdout,
      writeErr: io.writeStderr,
    })
    .exitOverride();

  program
    .command('init')
    .option('--force')
    .action(async (options: { force?: boolean }) => {
      await runInitCommand({
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.force !== undefined ? { force: options.force } : {}),
      });
    });

  const session = program.command('session');
  session
    .command('start')
    .option('--agent <name>')
    .action(async (options: { agent?: string }) => {
      await runSessionStartCommand({
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  session
    .command('end')
    .option('--close <close>')
    .option('--agent <name>')
    .action(async (options: { close?: 'done' | 'abandoned' | 'blocked'; agent?: string }) => {
      await runSessionEndCommand({
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.close !== undefined ? { close: options.close } : {}),
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });

  const current = program.command('current');
  current
    .command('log')
    .argument('<msg>')
    .option('--agent <name>')
    .action(async (msg: string, options: { agent?: string }) => {
      await runCurrentLogCommand(msg, {
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  current
    .command('status')
    .argument('<status>')
    .option('--agent <name>')
    .action(async (status: 'in_progress' | 'in_review' | 'done', options: { agent?: string }) => {
      await runCurrentStatusCommand(status, {
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  current
    .command('set')
    .argument('<keyValues...>')
    .option('--agent <name>')
    .action(async (keyValues: string[], options: { agent?: string }) => {
      await runCurrentSetCommand(keyValues, {
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  current.command('show').action(async () => {
    await runCurrentShowCommand({
      writeStdout: io.writeStdout,
      writeStderr: io.writeStderr,
    });
  });

  const history = program.command('history');
  history
    .command('append')
    .option('--from-current')
    .option('--agent <name>')
    .action(async (options: { fromCurrent?: boolean; agent?: string }) => {
      if (!options.fromCurrent) {
        throw new BitacoraError('history append currently requires --from-current', 1);
      }

      await runHistoryAppendFromCurrentCommand({
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  history
    .command('show')
    .option('--last <n>')
    .option('--feature <name>')
    .action(async (options: { last?: string; feature?: string }) => {
      await runHistoryShowCommand(options, {
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
      });
    });
  history.command('search').argument('<query>').option('--semantic').option('--feature <name>');

  const lessons = program.command('lessons');
  lessons
    .command('add')
    .argument('<knowledge>')
    .option('--feature <name>')
    .option('--agent <name>')
    .action(async (knowledge: string, options: { feature?: string; agent?: string }) => {
      await runLessonsAddCommand(knowledge, {
        env: process.env,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        ...(options.feature !== undefined ? { feature: options.feature } : {}),
        ...(options.agent !== undefined ? { agent: options.agent } : {}),
      });
    });
  lessons
    .command('update')
    .argument('<id>')
    .argument('<knowledge>')
    .action(async (id: string, knowledge: string) => {
      await runLessonsUpdateCommand(id, knowledge, {
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
      });
    });
  lessons
    .command('list')
    .option('--feature <name>')
    .action(async (options: { feature?: string }) => {
      await runLessonsListCommand(options, {
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
      });
    });
  lessons.command('search').argument('<query>').option('--semantic').option('--feature <name>');

  program.command('sync');
  program.command('doctor');

  return program;
}

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const program = createCliProgram(io);

  try {
    await program.parseAsync(argv, { from: 'node' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    if (error instanceof BitacoraError) {
      io.writeStderr(`${error.message}\n`);
      return error.exitCode;
    }

    throw error;
  }
}
