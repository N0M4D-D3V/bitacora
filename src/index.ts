#!/usr/bin/env node

/**
 * Public entrypoint for the Bitacora package and CLI.
 */

import { fileURLToPath } from 'node:url';

import { createCliProgram, runCli } from './cli.js';
import { resolveTemplatePath, resolveTemplateRoot } from './template-resolver.js';

function isCliEntrypoint(moduleUrl: string, argv: string | undefined): boolean {
  if (!argv) {
    return false;
  }

  return fileURLToPath(moduleUrl) === argv;
}

if (isCliEntrypoint(import.meta.url, process.argv[1])) {
  runCli(process.argv).then((exitCode) => {
    process.exitCode = exitCode;
  });
}

export type { CliIo } from './cli.js';
export { createCliProgram, resolveTemplatePath, resolveTemplateRoot, runCli };
