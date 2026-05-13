import { describe, expect, it } from 'vitest';

import { parseCanonicalAgentMarkdown } from './canonical-agent-markdown.js';

describe('parseCanonicalAgentMarkdown', () => {
  it('returns canonical frontmatter and markdown body', () => {
    const markdown = [
      '---',
      'id: manager',
      'description: Orchestrates Bitacora sessions and delivery flow.',
      '---',
      '',
      'Line 1.',
      'Line 2.',
    ].join('\n');

    expect(parseCanonicalAgentMarkdown(markdown)).toEqual({
      frontmatter: {
        id: 'manager',
        description: 'Orchestrates Bitacora sessions and delivery flow.',
      },
      body: 'Line 1.\nLine 2.',
    });
  });

  it('throws when required canonical frontmatter fields are missing', () => {
    const markdown = ['---', 'id: manager', '---', '', 'Body.'].join('\n');

    expect(() => parseCanonicalAgentMarkdown(markdown)).toThrow(
      'Canonical agent markdown must include id and description frontmatter'
    );
  });
});
