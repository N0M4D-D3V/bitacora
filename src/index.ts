#!/usr/bin/env node

/**
 * Public entrypoint for the Bitacora package and CLI.
 */

import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCliProgram, runCli } from './cli.js';
import { resolveTemplatePath, resolveTemplateRoot } from './template-resolver.js';

function isCliEntrypoint(moduleUrl: string, argv: string | undefined): boolean {
  if (!argv) {
    return false;
  }

  return resolveExistingPath(fileURLToPath(moduleUrl)) === resolveExistingPath(path.resolve(argv));
}

function resolveExistingPath(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return filePath;
  }
}

if (isCliEntrypoint(import.meta.url, process.argv[1])) {
  process.exitCode = await runCli(process.argv);
}

export type { CliIo } from './cli.js';
export { createCliProgram, resolveTemplatePath, resolveTemplateRoot, runCli };
