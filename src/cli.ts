/**
 * Builds and runs the Bitacora CLI command tree.
 */

import { Command, CommanderError } from 'commander';

import { BitacoraError } from './bitacora-error.js';
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
  session.command('start');
  session.command('end').option('--close <close>');

  const current = program.command('current');
  current.command('log').argument('<msg>');
  current.command('status').argument('<status>');
  current.command('set').argument('<keyValues...>');
  current.command('show');

  const history = program.command('history');
  history.command('append').option('--from-current');
  history.command('show').option('--last <n>').option('--feature <name>');
  history.command('search').argument('<query>').option('--semantic').option('--feature <name>');

  const lessons = program.command('lessons');
  lessons
    .command('add')
    .argument('<knowledge>')
    .option('--feature <name>')
    .option('--agent <name>');
  lessons.command('update').argument('<id>').argument('<knowledge>');
  lessons.command('list').option('--feature <name>');
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
