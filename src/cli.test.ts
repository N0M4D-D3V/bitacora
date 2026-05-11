import { describe, expect, it } from 'vitest';

import { runCli } from './index.js';

describe('runCli', () => {
  it('shows the root command help with the expected top-level commands', async () => {
    let stdout = '';
    let stderr = '';

    const exitCode = await runCli(['node', 'bitacora', '--help'], {
      writeStdout: (chunk) => {
        stdout += chunk;
      },
      writeStderr: (chunk) => {
        stderr += chunk;
      },
    });

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: bitacora');
    expect(stdout).toContain('init');
    expect(stdout).toContain('session');
    expect(stdout).toContain('current');
    expect(stdout).toContain('history');
    expect(stdout).toContain('lessons');
    expect(stdout).toContain('sync');
    expect(stdout).toContain('doctor');
  });
});
