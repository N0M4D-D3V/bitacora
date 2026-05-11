import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('index entrypoint', () => {
  it('prints CLI help when executed as the entrypoint', async () => {
    const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

    await execFileAsync('npm', ['run', 'build'], {
      cwd: workspaceRoot,
    });

    const { stdout, stderr } = await execFileAsync('node', ['dist/index.js', '--help'], {
      cwd: workspaceRoot,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: bitacora');
    expect(stdout).toContain('Commands:');
  });
});
