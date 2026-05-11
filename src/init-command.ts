/**
 * Implements the core `bitacora init` filesystem layout flow.
 */

import { access, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BitacoraError } from './bitacora-error.js';
import { resolveTemplatePath } from './template-resolver.js';

const BITACORA_VERSION = '1\n';

type InitOptions = {
  cwd?: string;
  force?: boolean;
  writeStdout?: (chunk: string) => void;
  writeStderr?: (chunk: string) => void;
};

export async function runInitCommand(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const force = options.force ?? false;
  const writeStdout = options.writeStdout ?? ((chunk: string) => process.stdout.write(chunk));
  const writeStderr = options.writeStderr ?? ((chunk: string) => process.stderr.write(chunk));
  const createdPaths: string[] = [];
  const bitacoraRoot = path.join(cwd, '.bitacora');

  if (await pathExists(bitacoraRoot)) {
    if (!force) {
      throw new BitacoraError('init aborted: .bitacora already exists; rerun with --force', 6);
    }

    await rm(bitacoraRoot, { recursive: true, force: true });
  }

  await mkdir(path.join(cwd, '.bitacora/harness'), { recursive: true });
  await mkdir(path.join(cwd, '.bitacora/memory'), { recursive: true });
  await mkdir(path.join(cwd, '.bitacora/agents'), { recursive: true });
  await mkdir(path.join(cwd, '.bitacora/skills/bitacora-cli'), { recursive: true });
  await mkdir(path.join(cwd, '.agents/skills/bitacora-cli'), { recursive: true });

  await writeFile(path.join(cwd, '.bitacora/version'), BITACORA_VERSION);
  createdPaths.push('.bitacora/version');

  await writeFile(path.join(cwd, '.bitacora/.lock'), '');
  createdPaths.push('.bitacora/.lock');

  await copyTemplate(
    cwd,
    'harness/architecture.md',
    '.bitacora/harness/architecture.md',
    createdPaths
  );
  await copyTemplate(cwd, 'harness/convention.md', '.bitacora/harness/convention.md', createdPaths);
  await copyTemplate(
    cwd,
    'harness/verification.md',
    '.bitacora/harness/verification.md',
    createdPaths
  );
  await copyTemplate(
    cwd,
    'harness/checkpoints.md',
    '.bitacora/harness/checkpoints.md',
    createdPaths
  );

  await writeFile(path.join(cwd, '.bitacora/memory/current.json'), '{}\n');
  await writeFile(path.join(cwd, '.bitacora/memory/history.jsonl'), '');
  await writeFile(path.join(cwd, '.bitacora/memory/lessons.jsonl'), '');
  createdPaths.push('.bitacora/memory/current.json');
  createdPaths.push('.bitacora/memory/history.jsonl');
  createdPaths.push('.bitacora/memory/lessons.jsonl');

  await copyTemplate(cwd, 'agents/manager.md', '.bitacora/agents/manager.md', createdPaths);
  await copyTemplate(cwd, 'agents/coder.md', '.bitacora/agents/coder.md', createdPaths);
  await copyTemplate(cwd, 'agents/reviewer.md', '.bitacora/agents/reviewer.md', createdPaths);
  await copyTemplate(
    cwd,
    'skills/bitacora-cli/SKILL.md',
    '.bitacora/skills/bitacora-cli/SKILL.md',
    createdPaths
  );

  const agentsPath = path.join(cwd, 'AGENTS.md');

  try {
    await readFile(agentsPath, 'utf8');
    writeStderr('warning: preserving existing AGENTS.md\n');
  } catch {
    await copyTemplate(cwd, 'AGENTS.md', 'AGENTS.md', createdPaths);
  }

  await createPreservedRelativeSymlink(cwd, 'AGENTS.md', 'CLAUDE.md', createdPaths, writeStderr);
  await createPreservedRelativeSymlink(cwd, 'AGENTS.md', 'GEMINI.md', createdPaths, writeStderr);
  await createGeneratedRelativeSymlink(
    cwd,
    '.bitacora/skills/bitacora-cli/SKILL.md',
    '.agents/skills/bitacora-cli/SKILL.md',
    createdPaths
  );

  writeStdout(`${['.bitacora', ...createdPaths].join('\n')}\n`);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyTemplate(
  cwd: string,
  templateRelativePath: string,
  outputRelativePath: string,
  createdPaths: string[]
): Promise<void> {
  const templatePath = resolveTemplatePath(templateRelativePath);
  const outputPath = path.join(cwd, outputRelativePath);
  const content = await readFile(templatePath, 'utf8');

  await writeFile(outputPath, content);
  createdPaths.push(outputRelativePath);
}

async function createPreservedRelativeSymlink(
  cwd: string,
  targetRelativePath: string,
  linkRelativePath: string,
  createdPaths: string[],
  writeStderr: (chunk: string) => void
): Promise<void> {
  const targetPath = path.join(cwd, targetRelativePath);
  const linkPath = path.join(cwd, linkRelativePath);
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  try {
    await symlink(relativeTarget, linkPath);
    createdPaths.push(linkRelativePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }

    writeStderr(`warning: preserving existing ${linkRelativePath}\n`);
  }
}

async function createGeneratedRelativeSymlink(
  cwd: string,
  targetRelativePath: string,
  linkRelativePath: string,
  createdPaths: string[]
): Promise<void> {
  const targetPath = path.join(cwd, targetRelativePath);
  const linkPath = path.join(cwd, linkRelativePath);
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  await rm(linkPath, { force: true });
  await symlink(relativeTarget, linkPath);
  createdPaths.push(linkRelativePath);
}
