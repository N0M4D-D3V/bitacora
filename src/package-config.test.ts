import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('package configuration', () => {
  it('exposes the bitacora binary and a cli script', async () => {
    const packageJsonPath = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      bin?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    expect(packageJson.bin).toEqual({
      bitacora: 'dist/index.js',
    });
    expect(packageJson.scripts?.cli).toBe('node dist/index.js');
  });
});
