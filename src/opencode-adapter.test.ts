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
          _bitacora: {
            managedOpenCodeAgents: {
              manager: true,
            },
          },
        },
        null,
        2
      )}\n`
    );
  });

  it('deep merges new Bitacora-owned agent entries without clobbering unrelated config', () => {
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
      _bitacora: {
        managedOpenCodeAgents: {
          manager: true,
          reviewer: true,
        },
      },
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

  it('rejects user-managed collisions for Bitacora-owned agent names', () => {
    expect(() =>
      renderOpenCodeConfig(
        JSON.stringify({
          agent: {
            manager: {
              description: 'User manager.',
              mode: 'primary',
              color: 'blue',
              permission: {
                read: 'allow',
              },
            },
          },
        }),
        {
          manager: {
            description: 'Bitacora manager.',
            mode: 'primary',
          },
        }
      )
    ).toThrowError(
      new OpenCodeConfigError(
        'OpenCode agent name conflict at opencode.json#agent.manager: existing entry contains user-managed keys: color, permission'
      )
    );
  });

  it('rejects pre-existing managed-name collisions even when the entry only contains description and mode', () => {
    expect(() =>
      renderOpenCodeConfig(
        JSON.stringify({
          agent: {
            manager: {
              description: 'User manager.',
              mode: 'primary',
            },
          },
        }),
        {
          manager: {
            description: 'Bitacora manager.',
            mode: 'primary',
          },
        }
      )
    ).toThrowError(
      new OpenCodeConfigError(
        'OpenCode agent name conflict at opencode.json#agent.manager: existing entry is user-managed and Bitacora cannot prove ownership'
      )
    );
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
      _bitacora: {
        managedOpenCodeAgents: {
          manager: true,
        },
      },
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

  it('allows overwrite when a Bitacora ownership proof exists for the managed agent name', () => {
    expect(
      mergeBitacoraOpenCodeAgents(
        {
          _bitacora: {
            managedOpenCodeAgents: {
              manager: true,
            },
          },
          agent: {
            manager: {
              description: 'Previous Bitacora manager.',
              mode: 'primary',
            },
          },
        },
        {
          manager: {
            description: 'Updated Bitacora manager.',
            mode: 'primary',
          },
        }
      )
    ).toEqual({
      _bitacora: {
        managedOpenCodeAgents: {
          manager: true,
        },
      },
      agent: {
        manager: {
          description: 'Updated Bitacora manager.',
          mode: 'primary',
        },
      },
    });
  });
});

describe('syncOpenCodeAdapter', () => {
  it('generates OpenCode agent files with minimal headers and preserved canonical bodies', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-adapter-'));

    try {
      await mkdir(path.join(workspaceDir, '.bitacora/agents'), { recursive: true });
      await mkdir(path.join(workspaceDir, '.bitacora/skills/bitacora-cli'), { recursive: true });

      const canonicalManager = [
        '---',
        'id: manager',
        'description: Orchestrates Bitacora sessions and delivery flow.',
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

      expect(managerOutput).toContain('---\nmode: subagent\n---\n');
      expect(managerOutput).not.toContain('description:');
      expect(managerOutput).not.toContain('permission:');
      expect(managerOutput).not.toContain('name:');
      expect(managerOutput.endsWith('\n\nManager body line 1.\nManager body line 2.')).toBe(true);

      expect(coderOutput).toContain('---\nmode: subagent\n---\n');
      expect(coderOutput).not.toContain('description:');
      expect(coderOutput).not.toContain('permission:');
      expect(coderOutput).not.toContain('name:');
      expect(coderOutput.endsWith('\n\nCoder body.')).toBe(true);

      expect(reviewerOutput).toContain('---\nmode: subagent\n---\n');
      expect(reviewerOutput).not.toContain('description:');
      expect(reviewerOutput).not.toContain('permission:');
      expect(reviewerOutput).not.toContain('name:');
      expect(reviewerOutput.endsWith('\n\nReviewer body.')).toBe(true);
      expect(skillOutput).toContain('name: "bitacora-cli"\n');
      expect(skillOutput).toContain('description: "Skill"\n');
      expect(configOutput).toEqual({
        $schema: 'https://opencode.ai/config.json',
        _bitacora: {
          managedOpenCodeAgents: {
            manager: true,
            coder: true,
            reviewer: true,
          },
        },
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

  for (const agentName of ['manager', 'coder', 'reviewer'] as const) {
    it(`rejects existing user-managed ${agentName} OpenCode entries instead of overwriting them`, async () => {
      const workspaceDir = await mkdtemp(
        path.join(tmpdir(), `bitacora-opencode-conflict-${agentName}-`)
      );

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
              agent: {
                [agentName]: {
                  description: `User-managed ${agentName}`,
                  mode: agentName === 'manager' ? 'primary' : 'subagent',
                  color: 'blue',
                },
              },
            },
            null,
            2
          )
        );

        await expect(syncOpenCodeAdapter({ cwd: workspaceDir })).rejects.toThrowError(
          new OpenCodeConfigError(
            `OpenCode agent name conflict at opencode.json#agent.${agentName}: existing entry contains user-managed keys: color`
          )
        );
      } finally {
        await rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it(`rejects existing ${agentName} entries even when they only contain description and mode`, async () => {
      const workspaceDir = await mkdtemp(
        path.join(tmpdir(), `bitacora-opencode-shape-conflict-${agentName}-`)
      );

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
              agent: {
                [agentName]: {
                  description: `User-managed ${agentName}`,
                  mode: agentName === 'manager' ? 'primary' : 'subagent',
                },
              },
            },
            null,
            2
          )
        );

        await expect(syncOpenCodeAdapter({ cwd: workspaceDir })).rejects.toThrowError(
          new OpenCodeConfigError(
            `OpenCode agent name conflict at opencode.json#agent.${agentName}: existing entry is user-managed and Bitacora cannot prove ownership`
          )
        );
      } finally {
        await rm(workspaceDir, { recursive: true, force: true });
      }
    });
  }

  it('preserves Bitacora-owned managed agent entries when ownership proof exists', async () => {
    const workspaceDir = await mkdtemp(path.join(tmpdir(), 'bitacora-opencode-owned-overwrite-'));

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
            _bitacora: {
              managedOpenCodeAgents: {
                manager: true,
                coder: true,
                reviewer: true,
              },
            },
            agent: {
              helper: {
                description: 'User-owned helper.',
              },
              manager: {
                description: 'Previous manager',
                mode: 'primary',
              },
              coder: {
                description: 'Previous coder',
                mode: 'subagent',
              },
              reviewer: {
                description: 'Previous reviewer',
                mode: 'subagent',
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
        _bitacora: {
          managedOpenCodeAgents: {
            manager: true,
            coder: true,
            reviewer: true,
          },
        },
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
