import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

describe('package configuration', () => {
  it('exposes publish metadata while keeping the bitacora binary name', async () => {
    const packageJsonPath = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      bin?: Record<string, string>;
      bugs?: { url?: string };
      description?: string;
      engines?: { node?: string };
      exports?: Record<string, { default?: string; import?: string; types?: string }>;
      files?: string[];
      homepage?: string;
      keywords?: string[];
      name?: string;
      repository?: { type?: string; url?: string };
      scripts?: Record<string, string>;
    };

    expect(packageJson.name).toBe('bitacora-cli');
    expect(packageJson.description).toBeTruthy();
    expect(packageJson.bin).toEqual({
      bitacora: 'dist/index.js',
    });
    expect(packageJson.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    });
    expect(packageJson.files).toEqual(['dist', 'README.md', 'README_dev.md']);
    expect(packageJson.scripts?.cli).toBe('node dist/index.js');
    expect(packageJson.keywords).toContain('cli');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/N0M4D-D3V/bitacora.git',
    });
    expect(packageJson.homepage).toBe('https://github.com/N0M4D-D3V/bitacora#readme');
    expect(packageJson.bugs).toEqual({
      url: 'https://github.com/N0M4D-D3V/bitacora/issues',
    });
    expect(packageJson.engines).toEqual({
      node: '>=22',
    });
  });

  it('keeps the published tarball limited to the expected runtime files', async () => {
    const packageDir = await mkdtemp(path.join(tmpdir(), 'bitacora-pack-'));

    try {
      await execFileAsync(
        'pnpm',
        [
          'exec',
          'tsup',
          path.join(workspaceRoot, 'src/index.ts'),
          '--format',
          'esm',
          '--target',
          'node22',
          '--sourcemap',
          '--clean',
          '--dts',
          '--out-dir',
          path.join(packageDir, 'dist'),
        ],
        {
          cwd: workspaceRoot,
        }
      );
      await cp(path.join(workspaceRoot, 'templates'), path.join(packageDir, 'dist/templates'), {
        recursive: true,
      });
      await cp(path.join(workspaceRoot, 'README.md'), path.join(packageDir, 'README.md'));
      await cp(path.join(workspaceRoot, 'README_dev.md'), path.join(packageDir, 'README_dev.md'));
      await writeFile(
        path.join(packageDir, 'package.json'),
        await readFile(path.join(workspaceRoot, 'package.json'), 'utf8')
      );

      const { stdout, stderr } = await execFileAsync('pnpm', ['pack', '--dry-run'], {
        cwd: packageDir,
      });
      const packOutput = `${stdout}${stderr}`;

      expect(packOutput).toContain('README.md');
      expect(packOutput).toContain('README_dev.md');
      expect(packOutput).toContain('dist/index.js');
      expect(packOutput).toContain('dist/index.d.ts');
      expect(packOutput).toContain('dist/templates/AGENTS.md');
      expect(packOutput).toContain('dist/templates/skills/bitacora-cli/SKILL.md');
      expect(packOutput).not.toContain('src/index.ts');
      expect(packOutput).not.toContain('docs/architecture.md');
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('aligns the workspace local-link override with the published package name', async () => {
    const workspaceConfig = await readFile(
      new URL('../pnpm-workspace.yaml', import.meta.url),
      'utf8'
    );

    expect(workspaceConfig).toContain("bitacora-cli: 'link:'");
    expect(workspaceConfig).not.toContain("bitacora: 'link:'");
  });
});
