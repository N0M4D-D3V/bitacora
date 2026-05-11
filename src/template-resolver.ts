/**
 * Resolves packaged template paths for both source and built artifacts.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveTemplateRoot(moduleUrl: string = import.meta.url): string {
  const templateRoot = path.resolve(path.dirname(fileURLToPath(moduleUrl)), '../templates');

  if (!existsSync(templateRoot)) {
    throw new Error(`Template root not found: ${templateRoot}`);
  }

  return templateRoot;
}

export function resolveTemplatePath(
  relativePath: string,
  moduleUrl: string = import.meta.url
): string {
  return path.resolve(resolveTemplateRoot(moduleUrl), relativePath);
}
