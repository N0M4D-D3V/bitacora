import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertNoDuplicateOutputPaths,
  parseCanonicalTemplateMarkdown,
  renderPlatformTemplate,
  resolvePlatformTemplatePath,
} from './platform-template-renderer.js';

const canonicalSkill = [
  '---',
  'id: bitacora-cli',
  'description: Use the Bitacora CLI.',
  'codex:',
  '  exposeAsSkill: true',
  '---',
  '',
  '# Bitacora CLI',
  '',
  'Use the CLI.',
  '',
].join('\n');

const canonicalSubagent = [
  '---',
  'id: verifier',
  'description: Verify completed implementation work.',
  'tools:',
  '  - Read',
  '  - Grep',
  'model: sonnet',
  '---',
  '',
  '# Verifier',
  '',
  'Line 1.',
  '  Indented line.',
  '',
].join('\n');

describe('platform template renderer', () => {
  it('removes canonical frontmatter and preserves the semantic body exactly', () => {
    const template = parseCanonicalTemplateMarkdown(canonicalSubagent);

    expect(template.body).toBe('# Verifier\n\nLine 1.\n  Indented line.\n');
    expect(renderPlatformTemplate('claude-code', 'subagent', template)).toContain(
      '\n\n# Verifier\n\nLine 1.\n  Indented line.\n'
    );
    expect(renderPlatformTemplate('claude-code', 'subagent', template)).not.toContain(
      'id: verifier'
    );
  });

  it('rejects missing required fields, invalid ids, and multiline descriptions', () => {
    expect(() =>
      parseCanonicalTemplateMarkdown(
        ['---', 'description: Missing id', '---', '', 'Body'].join('\n')
      )
    ).toThrow('Canonical template must include id frontmatter');
    expect(() =>
      parseCanonicalTemplateMarkdown(
        ['---', 'id: QA_Tester', 'description: QA', '---', '', 'Body'].join('\n')
      )
    ).toThrow('Invalid canonical template id: QA_Tester');
    expect(() =>
      renderPlatformTemplate('codex', 'skill', {
        id: 'valid-id',
        description: 'line 1\nline 2',
        body: 'Body',
      })
    ).toThrow('Canonical template description must not be multiline');
  });

  it('rejects OpenCode-only runtime metadata in canonical frontmatter', () => {
    expect(() =>
      parseCanonicalTemplateMarkdown(
        ['---', 'id: coder', 'description: Coder', 'temperature: low', '---', '', 'Body'].join('\n')
      )
    ).toThrow('Unsupported canonical field "temperature"');
    expect(() =>
      parseCanonicalTemplateMarkdown(
        ['---', 'id: coder', 'description: Coder', 'mode: subagent', '---', '', 'Body'].join('\n')
      )
    ).toThrow('Unsupported canonical field "mode"');
    expect(() =>
      parseCanonicalTemplateMarkdown(
        [
          '---',
          'id: coder',
          'description: Coder',
          'permissions:',
          '  edit: deny',
          '---',
          '',
          'Body',
        ].join('\n')
      )
    ).toThrow('Unsupported canonical field "permissions"');
  });

  it('rejects unresolved placeholders', () => {
    expect(() =>
      renderPlatformTemplate('codex', 'skill', {
        id: 'coder',
        description: 'Use {{model}}.',
        body: 'Body',
      })
    ).toThrow('Unresolved placeholder "{{model}}"');
  });

  it('escapes placeholder values before validating rendered YAML headers', () => {
    expect(
      renderPlatformTemplate('claude-code', 'skill', {
        id: 'quote-test',
        description: 'Use the "quoted" workflow.',
        body: '# Body',
      })
    ).toContain('description: "Use the \\"quoted\\" workflow."\n');

    expect(() =>
      renderPlatformTemplate('claude-code', 'subagent', {
        id: 'bad-model',
        description: 'Bad model',
        body: '# Body',
        metadata: {
          model: 'sonnet\nopus',
        },
      })
    ).toThrow('Header placeholder "model" must be single-line');
  });

  it('rejects codex subagents unless they are explicitly exposed as skills', () => {
    expect(() =>
      renderPlatformTemplate('codex', 'subagent', parseCanonicalTemplateMarkdown(canonicalSubagent))
    ).toThrow('Codex subagent rendering requires codex.exposeAsSkill');
  });

  it('resolves expected output paths and rejects duplicate output paths', () => {
    expect(resolvePlatformTemplatePath('codex', 'skill', 'verifier')).toBe(
      '.agents/skills/verifier/SKILL.md'
    );
    expect(resolvePlatformTemplatePath('claude-code', 'subagent', 'verifier')).toBe(
      '.claude/agents/verifier.md'
    );
    expect(resolvePlatformTemplatePath('opencode', 'subagent', 'verifier')).toBe(
      '.opencode/agents/verifier.md'
    );
    expect(() => assertNoDuplicateOutputPaths(['a/b.md', 'a/b.md'])).toThrow(
      'Duplicate output path: a/b.md'
    );
  });

  it('matches platform header snapshots', async () => {
    const skill = parseCanonicalTemplateMarkdown(canonicalSkill);
    const subagent = parseCanonicalTemplateMarkdown(canonicalSubagent);
    const snapshotDir = path.resolve(__dirname, '__snapshots__/platform-template-renderer');

    expect(renderPlatformTemplate('codex', 'skill', skill)).toBe(
      await readFile(path.join(snapshotDir, 'codex.skill.snap'), 'utf8')
    );
    expect(renderPlatformTemplate('claude-code', 'skill', skill)).toBe(
      await readFile(path.join(snapshotDir, 'claude.skill.snap'), 'utf8')
    );
    expect(renderPlatformTemplate('claude-code', 'subagent', subagent)).toBe(
      await readFile(path.join(snapshotDir, 'claude.subagent.snap'), 'utf8')
    );
    expect(renderPlatformTemplate('opencode', 'skill', skill)).toBe(
      await readFile(path.join(snapshotDir, 'opencode.skill.snap'), 'utf8')
    );
    expect(renderPlatformTemplate('opencode', 'subagent', subagent)).toBe(
      await readFile(path.join(snapshotDir, 'opencode.subagent.snap'), 'utf8')
    );
  });

  it('renders OpenCode subagents with only the minimal agent header metadata', () => {
    const rendered = renderPlatformTemplate(
      'opencode',
      'subagent',
      parseCanonicalTemplateMarkdown(canonicalSubagent)
    );

    expect(rendered).toContain('---\nmode: subagent\n---\n\n# Verifier');
    expect(rendered).not.toContain('description:');
    expect(rendered).not.toContain('permission:');
  });

  it('parses bundled canonical agent templates with the portable frontmatter contract', async () => {
    const templateDir = path.resolve(__dirname, '../templates/agents');
    const templateNames = ['coder', 'manager', 'reviewer'];

    await expect(
      Promise.all(
        templateNames.map(async (templateName) => {
          const markdown = await readFile(path.join(templateDir, `${templateName}.md`), 'utf8');

          return parseCanonicalTemplateMarkdown(markdown);
        })
      )
    ).resolves.toHaveLength(3);
  });

  it('keeps bundled canonical agent templates free of OpenCode-only runtime metadata', async () => {
    const templateDir = path.resolve(__dirname, '../templates/agents');
    const templateNames = ['coder', 'manager', 'reviewer'];

    await Promise.all(
      templateNames.map(async (templateName) => {
        const markdown = await readFile(path.join(templateDir, `${templateName}.md`), 'utf8');

        expect(markdown).not.toContain('\nmode:');
        expect(markdown).not.toContain('\ntemperature:');
        expect(markdown).not.toContain('\ncolor:');
        expect(markdown).not.toContain('\npermission:');
        expect(markdown).not.toContain('\npermissions:');
      })
    );
  });
});
