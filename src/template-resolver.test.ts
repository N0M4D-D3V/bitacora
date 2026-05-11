import { describe, expect, it } from 'vitest';

import { resolveTemplatePath, resolveTemplateRoot } from './index.js';

describe('template resolution', () => {
  it('resolves packaged templates from the repository template root', () => {
    const templateRoot = resolveTemplateRoot(import.meta.url);
    const templatePath = resolveTemplatePath('bootstrap.txt', import.meta.url);

    expect(templateRoot.endsWith('/templates')).toBe(true);
    expect(templatePath.endsWith('/templates/bootstrap.txt')).toBe(true);
  });
});
