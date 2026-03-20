#!/usr/bin/env node

import { Command, CommanderError } from "commander";

import { runInitCommand } from "./commands/init";
import { runCompactCommand } from "./commands/compact";
import { runHistoryCommand } from "./commands/history";
import { runLogCommand } from "./commands/log";
import { runNewTrackCommand } from "./commands/new-track";
import { runRebuildStateCommand } from "./commands/rebuild-state";
import { runSkillCommand } from "./commands/skill";
import { runValidateCommand } from "./commands/validate";
import type { TrackPriority, TrackStatus } from "./types";

export interface CliRuntime {
  now?: () => string;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
  cwd?: () => string;
}

const COMMAND_HELP_OVERVIEW = `
Command details:
  init
    Creates the bitacora memory structure in the selected project root.
    Options:
      --force        Recreate bitacora memory if it already exists.
      --root <path>  Project root path (default: current directory).

  skill
    Installs or updates only the bitacora agent skill and skills lock entry.
    Options:
      --root <path>  Project root path (default: current directory).

  new-track [trackId]
    Creates a new track file, automatically picking the next track id when omitted.
    Options:
      --status <status>      Initial status for the track.
      --priority <priority>  Initial priority for the track.
      --root <path>          Project root path (default: current directory).

  validate
    Validates bitacora files and folders against the expected deterministic format.
    Options:
      --json         Prints validation output as JSON.
      --root <path>  Project root path (default: current directory).

  rebuild-state
    Revalidates track memory and confirms deterministic state can be rebuilt.
    Options:
      --root <path>  Project root path (default: current directory).

  log
    Appends a timestamped log entry to an existing track.
    Options:
      --track-id <trackId>  Track identifier.
      --message <text>      Log entry message.
      --root <path>         Project root path (default: current directory).

  compact
    Compacts tracks by summarizing and archiving redundant details.
    Options:
      --track-id <trackId>  Compact a specific track.
      --all                 Compact all eligible tracks.
      --complete            Mark target tracks as completed (requires completion gates).
      --dry-run             Show savings without modifying files.
      --root <path>         Project root path (default: current directory).
    Completion gates (--complete):
      - # Tasks has no unchecked item (- [ ]).
      - # Log includes at least one line containing TEST:.
    Output model:
      - Full source moves to bitacora/history/TRACK-###.md.
      - Active track.md is rewritten into compact summary form.
      - tracks/tracks.md is regenerated; previous snapshot is archived in history/.

  history
    Reads archived history for a compacted track.
    Options:
      --track-id <trackId>  Track identifier.
      --show                Print full archived content.
      --root <path>         Project root path (default: current directory).
    Notes:
      - Without --show, prints metadata/path only.
      - Use --show only when compact summary is insufficient.
`;

function writeLine(writer: (message: string) => void, message: string): void {
  writer(message.endsWith("\n") ? message : `${message}\n`);
}

export function createCliProgram(
  runtime: CliRuntime = {},
  onCommandExitCode?: (exitCode: number) => void
): Command {
  const now = runtime.now ?? (() => new Date().toISOString());
  const cwd = runtime.cwd ?? (() => process.cwd());
  const stdout = runtime.stdout ?? ((message: string) => process.stdout.write(message));
  const stderr = runtime.stderr ?? ((message: string) => process.stderr.write(message));

  const program = new Command();
  program
    .name("bitacora")
    .description("Deterministic agent-oriented project memory system")
    .configureOutput({
      writeOut: (message) => writeLine(stdout, message),
      writeErr: (message) => writeLine(stderr, message)
    });

  program
    .command("init")
    .description("Create bitacora memory files and folders.")
    .option("--force", "delete and recreate bitacora memory")
    .option("--root <path>", "project root path")
    .action((options: { force?: boolean; root?: string }) => {
      const exitCode = runInitCommand(
        {
          rootDir: options.root ?? cwd(),
          force: Boolean(options.force)
        },
        {
          now,
          onError: (message) => writeLine(stderr, message)
        }
      );
      onCommandExitCode?.(exitCode);
    });

  program
    .command("skill")
    .description("Install or update only the bitacora agent skill.")
    .option("--root <path>", "project root path")
    .action((options: { root?: string }) => {
      const exitCode = runSkillCommand(
        {
          rootDir: options.root ?? cwd()
        },
        {
          onError: (message) => writeLine(stderr, message)
        }
      );
      onCommandExitCode?.(exitCode);
    });

  program
    .command("new-track [trackId]")
    .description("Create a new track with optional id, status, and priority.")
    .option("--status <status>", "track status")
    .option("--priority <priority>", "track priority")
    .option("--root <path>", "project root path")
    .action(
      (
        trackId: string | undefined,
        options: { status?: string; priority?: string; root?: string }
      ) => {
        const newTrackOptions: Parameters<typeof runNewTrackCommand>[0] = {
          rootDir: options.root ?? cwd()
        };
        if (trackId !== undefined) {
          newTrackOptions.trackId = trackId;
        }
        if (options.status !== undefined) {
          newTrackOptions.status = options.status as TrackStatus;
        }
        if (options.priority !== undefined) {
          newTrackOptions.priority = options.priority as TrackPriority;
        }

        const exitCode = runNewTrackCommand(
          newTrackOptions,
          {
            now,
            onError: (message) => writeLine(stderr, message)
          }
        );
        onCommandExitCode?.(exitCode);
      }
    );

  program
    .command("validate")
    .description("Validate bitacora structure and report errors.")
    .option("--json", "output JSON validation result")
    .option("--root <path>", "project root path")
    .action((options: { json?: boolean; root?: string }) => {
      const exitCode = runValidateCommand(
        {
          rootDir: options.root ?? cwd(),
          json: Boolean(options.json)
        },
        {
          onOutput: (message) => writeLine(stdout, message)
        }
      );
      onCommandExitCode?.(exitCode);
    });

  program
    .command("rebuild-state")
    .description("Revalidate memory and rebuild in-memory state from tracks.")
    .option("--root <path>", "project root path")
    .action((options: { root?: string }) => {
      const exitCode = runRebuildStateCommand(
        {
          rootDir: options.root ?? cwd()
        },
        {
          onOutput: (message) => writeLine(stdout, message),
          onError: (message) => writeLine(stderr, message)
        }
      );
      onCommandExitCode?.(exitCode);
    });

  program
    .command("log")
    .description("Append a log entry to a track.")
    .requiredOption("--track-id <trackId>", "track identifier")
    .requiredOption("--message <text>", "log message")
    .option("--root <path>", "project root path")
    .action((options: { trackId: string; message: string; root?: string }) => {
      const exitCode = runLogCommand(
        {
          rootDir: options.root ?? cwd(),
          trackId: options.trackId,
          message: options.message
        },
        {
          now,
          onError: (message) => writeLine(stderr, message)
        }
      );
      onCommandExitCode?.(exitCode);
      });

  program
    .command("compact")
    .description("Compact tracks and archive redundant details.")
    .option("--track-id <trackId>", "track identifier")
    .option("--all", "compact all eligible tracks")
    .option("--complete", "mark track(s) as completed before compaction")
    .option("--dry-run", "report savings without writing files")
    .option("--root <path>", "project root path")
    .action(
      (options: {
        trackId?: string;
        all?: boolean;
        complete?: boolean;
        dryRun?: boolean;
        root?: string;
      }) => {
        const compactOptions: Parameters<typeof runCompactCommand>[0] = {
          rootDir: options.root ?? cwd(),
          all: Boolean(options.all),
          complete: Boolean(options.complete),
          dryRun: Boolean(options.dryRun)
        };
        if (options.trackId !== undefined) {
          compactOptions.trackId = options.trackId;
        }

        const exitCode = runCompactCommand(
          compactOptions,
          {
            now,
            onOutput: (message) => writeLine(stdout, message),
            onError: (message) => writeLine(stderr, message)
          }
        );
        onCommandExitCode?.(exitCode);
      }
    );

  program
    .command("history")
    .description("Read archived history for a compacted track.")
    .requiredOption("--track-id <trackId>", "track identifier")
    .option("--show", "print full archived content")
    .option("--root <path>", "project root path")
    .action((options: { trackId: string; show?: boolean; root?: string }) => {
      const exitCode = runHistoryCommand(
        {
          rootDir: options.root ?? cwd(),
          trackId: options.trackId,
          show: Boolean(options.show)
        },
        {
          onOutput: (message) => writeLine(stdout, message),
          onError: (message) => writeLine(stderr, message)
        }
      );
      onCommandExitCode?.(exitCode);
    });

  program.addHelpText("after", COMMAND_HELP_OVERVIEW);

  return program;
}

export async function runCli(argv: string[], runtime: CliRuntime = {}): Promise<number> {
  let commandExitCode = 0;
  const program = createCliProgram(runtime, (exitCode) => {
    commandExitCode = exitCode;
  });
  program.exitOverride();

  try {
    await program.parseAsync(argv, { from: "node" });
    return commandExitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed") {
        return 0;
      }
      return commandExitCode !== 0 ? commandExitCode : 1;
    }
    throw error;
  }
}

if (require.main === module) {
  runCli(process.argv)
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
    });
}
