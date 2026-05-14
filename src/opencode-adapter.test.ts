import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  mergeBitacoraOpenCodeAgents,
  OpenCodeConfigError,
  renderOpenCodeConfig,
  syncOpenCodeAdapter,
} from './opencode-adapter.js';

describe('renderOpenCodeConfig', () => {
  it('creates strict JSON when opencode.json does not exist', () => {
    const rendered = renderOpenCodeConfig(undefined, {
      manager: {
        description: 'Manager runtime config.',
        mode: 'primary',
      },
    });

    expect(rendered).toBe(
      `${JSON.stringify(
        {
          $schema: 'https://opencode.ai/config.json',
          agent: {
            manager: {
              description: 'Manager runtime config.',
              mode: 'primary',
            },
          },
        },
        null,
        2
      )}\n`
    );
  });

  it('deep merges Bitacora-owned agent entries without clobbering unrelated config', () => {
    const rendered = renderOpenCodeConfig(
      JSON.stringify(
        {
          theme: 'midnight',
          provider: {
            anthropic: {
              defaultModel: 'claude-sonnet',
            },
          },
          agent: {
            helper: {
              description: 'User-owned helper.',
            },
            manager: {
              color: 'blue',
              permission: {
                read: 'allow',
              },
            },
          },
        },
        null,
        2
      ),
      {
        manager: {
          description: 'Bitacora manager.',
          mode: 'primary',
        },
        reviewer: {
          description: 'Bitacora reviewer.',
          mode: 'subagent',
        },
      }
    );

    expect(JSON.parse(rendered)).toEqual({
      $schema: 'https://opencode.ai/config.json',
      theme: 'midnight',
      provider: {
        anthropic: {
          defaultModel: 'claude-sonnet',
        },
      },
      agent: {
        helper: {
          description: 'User-owned helper.',
        },
        manager: {
          description: 'Bitacora manager.',
          mode: 'primary',
        },
        reviewer: {
          description: 'Bitacora reviewer.',
          mode: 'subagent',
        },
      },
    });
  });

  it('rejects invalid strict JSON input', () => {
    expect(() => renderOpenCodeConfig('{"agent":', {})).toThrowError(OpenCodeConfigError);
    expect(() => renderOpenCodeConfig('[1,2,3]', {})).toThrowError(OpenCodeConfigError);
  });

  it('rejects a non-object existing agent key instead of overwriting it', () => {
    expect(() =>
      renderOpenCodeConfig(
        JSON.stringify({
          agent: 'user-owned-invalid-shape',
        }),
        {
          manager: {
            description: 'Bitacora manager.',
            mode: 'primary',
          },
        }
      )
    ).toThrowError(OpenCodeConfigError);
  });

  it('normalizes an existing incorrect schema value to the adapter-owned schema', () => {
    const rendered = renderOpenCodeConfig(
      JSON.stringify({
        $schema: 'https://example.com/not-opencode.json',
      }),
      {
        manager: {
          description: 'Bitacora manager.',
          mode: 'primary',
        },
      }
    );

    expect(JSON.parse(rendered)).toEqual({
      $schema: 'https://opencode.ai/config.json',
      agent: {
        manager: {
          description: 'Bitacora manager.',
          mode: 'primary',
        },
      },
    });
  });
});

describe('mergeBitacoraOpenCodeAgents', () => {
  it('rejects unknown managed agent ids from the overlay', () => {
    const overlay = {
      manager: {
        description: 'Bitacora manager.',
        mode: 'primary',
      },
      helper: {
        description: 'Should not be written.',
      },
    };

    expect(() =>
      mergeBitacoraOpenCodeAgents(
        {
          agent: {
            helper: {
              description: 'User-owned helper.',
            },
          },
        },
        overlay
      )
    ).toThrowError(new OpenCodeConfigError('Unsupported OpenCode managed agent id: helper'));
  });
});

describe('syncOpenCodeAdapter', () => {
  it('generates OpenCode agent files with translated frontmatter and preserved canonical bodies', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-adapter-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      const canonicalManager = [
        '---',
        'id: manager',
        'description: Orchestrates Bitacora sessions and delivery flow.',
        'permissions:',
        '  edit: deny',
        '---',
        '',
        'Manager body line 1.',
        'Manager body line 2.',
      ].join('\n');
      const canonicalCoder = [
        '---',
        'id: coder',
        'description: Implements scoped changes and records delivery progress.',
        '---',
        '',
        'Coder body.',
      ].join('\n');
      const canonicalReviewer = [
        '---',
        'id: reviewer',
        'description: Verifies completed work against Bitacora quality gates.',
        'permissions:',
        '  edit: deny',
        '---',
        '',
        'Reviewer body.',
      ].join('\n');

      await writeFile(path.join(workspaceDir, '.bitacora/agents/manager.md'), canonicalManager);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/coder.md'), canonicalCoder);
      await writeFile(path.join(workspaceDir, '.bitacora/agents/reviewer.md'), canonicalReviewer);
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        ['---', 'id: bitacora-cli', 'description: Skill', '---', '', '# Bitacora CLI'].join('\n')
      );

      await syncOpenCodeAdapter({ cwd: workspaceDir });

      const managerOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/manager.md'),
        'utf8'
      );
      const coderOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/coder.md'),
        'utf8'
      );
      const reviewerOutput = await readFile(
        path.join(workspaceDir, '.opencode/agents/reviewer.md'),
        'utf8'
      );
      const skillOutput = await readFile(
        path.join(workspaceDir, '.opencode/skills/bitacora-cli/SKILL.md'),
        'utf8'
      );
      const configOutput = JSON.parse(
        await readFile(path.join(workspaceDir, 'opencode.json'), 'utf8')
      );

      expect(managerOutput).toContain(
        'description: "Orchestrates Bitacora sessions and delivery flow."\n'
      );
      expect(managerOutput).toContain('mode: subagent\n');
      expect(managerOutput).toContain('permission:\n  edit: "deny"\n');
      expect(managerOutput).not.toContain('name:');
      expect(managerOutput.endsWith('\n\nManager body line 1.\nManager body line 2.')).toBe(true);

      expect(coderOutput).toContain(
        'description: "Implements scoped changes and records delivery progress."\n'
      );
      expect(coderOutput).toContain('mode: subagent\n');
      expect(coderOutput).not.toContain('permission:');
      expect(coderOutput).not.toContain('name:');
      expect(coderOutput.endsWith('\n\nCoder body.')).toBe(true);

      expect(reviewerOutput).toContain(
        'description: "Verifies completed work against Bitacora quality gates."\n'
      );
      expect(reviewerOutput).toContain('mode: subagent\n');
      expect(reviewerOutput).toContain('permission:\n  edit: "deny"\n');
      expect(reviewerOutput).not.toContain('name:');
      expect(reviewerOutput.endsWith('\n\nReviewer body.')).toBe(true);
      expect(skillOutput).toContain('name: "bitacora-cli"\n');
      expect(skillOutput).toContain('description: "Skill"\n');
      expect(configOutput).toEqual({
        $schema: 'https://opencode.ai/config.json',
        agent: {
          manager: {
            description: 'Orchestrates Bitacora sessions and delivery flow.',
            mode: 'primary',
          },
          coder: {
            description: 'Implements scoped changes and records delivery progress.',
            mode: 'subagent',
          },
          reviewer: {
            description: 'Verifies completed work against Bitacora quality gates.',
            mode: 'subagent',
          },
        },
      });
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('preserves user-owned opencode.json fields while replacing Bitacora-managed agent entries', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-merge-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'id: manager', 'description: Updated manager', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'id: coder', 'description: Updated coder', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'id: reviewer', 'description: Updated reviewer', '---', '', 'reviewer'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        ['---', 'id: bitacora-cli', 'description: Skill', '---', '', '# Bitacora CLI'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, 'opencode.json'),
        JSON.stringify(
          {
            theme: 'midnight',
            agent: {
              helper: {
                description: 'User-owned helper.',
              },
              manager: {
                color: 'blue',
                model: 'legacy-model',
                permission: {
                  read: 'allow',
                },
                temperature: 0.9,
              },
            },
          },
          null,
          2
        )
      );

      await syncOpenCodeAdapter({ cwd: workspaceDir });

      const mergedConfig = JSON.parse(
        await readFile(path.join(workspaceDir, 'opencode.json'), 'utf8')
      );

      expect(mergedConfig).toEqual({
        $schema: 'https://opencode.ai/config.json',
        theme: 'midnight',
        agent: {
          helper: {
            description: 'User-owned helper.',
          },
          manager: {
            description: 'Updated manager',
            mode: 'primary',
          },
          coder: {
            description: 'Updated coder',
            mode: 'subagent',
          },
          reviewer: {
            description: 'Updated reviewer',
            mode: 'subagent',
          },
        },
      });
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('rejects canonical agent ids outside the Bitacora-managed OpenCode set', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-unknown-id-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'id: helper', 'description: Unknown helper', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'id: coder', 'description: Coder', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'id: reviewer', 'description: Reviewer', '---', '', 'reviewer'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        ['---', 'id: bitacora-cli', 'description: Skill', '---', '', '# Bitacora CLI'].join('\n')
      );

      await expect(syncOpenCodeAdapter({ cwd: workspaceDir })).rejects.toThrowError(
        new OpenCodeConfigError('Unsupported OpenCode managed agent id: helper')
      );
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate canonical agent ids for Bitacora-managed OpenCode entries', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-duplicate-id-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/manager.md'),
        ['---', 'id: manager', 'description: Manager', '---', '', 'manager'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/coder.md'),
        ['---', 'id: manager', 'description: Duplicate manager', '---', '', 'coder'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/agents/reviewer.md'),
        ['---', 'id: reviewer', 'description: Reviewer', '---', '', 'reviewer'].join('\n')
      );
      await writeFile(
        path.join(workspaceDir, '.bitacora/skills/bitacora-cli/SKILL.md'),
        ['---', 'id: bitacora-cli', 'description: Skill', '---', '', '# Bitacora CLI'].join('\n')
      );

      await expect(syncOpenCodeAdapter({ cwd: workspaceDir })).rejects.toThrowError(
        new OpenCodeConfigError('Duplicate OpenCode managed agent id: manager')
      );
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
