/**
 * Renders canonical Bitacora templates with platform-specific frontmatter headers.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { resolveTemplatePath } from './template-resolver.js';

export type Platform = 'codex' | 'claude-code' | 'opencode';

export type TemplateKind = 'skill' | 'agent' | 'subagent';

export type PermissionValue = 'allow' | 'ask' | 'deny';

export type CanonicalTemplate = {
  id: string;
  description: string;
  body: string;
  metadata?: {
    model?: string;
    tools?: string[];
    permissions?: {
      edit?: PermissionValue;
      bash?: PermissionValue;
    };
    codex?: {
      exposeAsSkill?: boolean;
    };
  };
};

type ScalarValue = boolean | string;
type ParsedYamlValue = ScalarValue | ScalarValue[] | ParsedYamlObject;
type ParsedYamlObject = {
  [key: string]: ParsedYamlValue;
};
type CanonicalPermissions = NonNullable<CanonicalTemplate['metadata']>['permissions'];
type CanonicalCodex = NonNullable<CanonicalTemplate['metadata']>['codex'];

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PERMISSION_VALUES = new Set(['allow', 'ask', 'deny']);
const SUPPORTED_CANONICAL_FIELDS = new Set([
  'id',
  'description',
  'tools',
  'model',
  'permissions',
  'codex',
]);
const SUPPORTED_RENDERED_FIELDS: Record<Platform, Record<TemplateKind, Set<string>>> = {
  codex: {
    skill: new Set(['name', 'description']),
    agent: new Set(),
    subagent: new Set(),
  },
  'claude-code': {
    skill: new Set(['name', 'description']),
    agent: new Set(['name', 'description', 'tools', 'model']),
    subagent: new Set(['name', 'description', 'tools', 'model']),
  },
  opencode: {
    skill: new Set(['name', 'description']),
    agent: new Set(['description', 'mode', 'permission']),
    subagent: new Set(['description', 'mode', 'permission']),
  },
};

export function parseCanonicalTemplateMarkdown(markdown: string): CanonicalTemplate {
  if (!markdown.startsWith('---\n')) {
    throw new Error('Canonical template markdown must start with YAML frontmatter');
  }

  const frontmatterEnd = markdown.indexOf('\n---\n', 4);

  if (frontmatterEnd === -1) {
    throw new Error('Canonical template markdown frontmatter is not terminated');
  }

  const frontmatter = parseYamlObject(markdown.slice(4, frontmatterEnd));
  const bodyStart = frontmatterEnd + '\n---\n'.length;
  const body = markdown.slice(bodyStart).replace(/^\n/, '');

  const template = canonicalTemplateFromFrontmatter(frontmatter, body);

  validateCanonicalTemplate(template);

  return template;
}

export function renderPlatformTemplate(
  platform: Platform,
  kind: TemplateKind,
  template: CanonicalTemplate
): string {
  validateCanonicalTemplate(template);

  if (platform === 'codex' && kind !== 'skill' && !template.metadata?.codex?.exposeAsSkill) {
    throw new Error(`Codex ${kind} rendering requires codex.exposeAsSkill`);
  }

  const headerTemplate = readFileSync(resolveHeaderTemplatePath(platform, kind), 'utf8');
  const context = buildRenderContext(platform, kind, template);
  const header = renderHeaderTemplate(headerTemplate, context);

  validateRenderedHeader(platform, kind, header);

  return `${header}\n\n${template.body}`;
}

export function resolvePlatformTemplatePath(
  platform: Platform,
  kind: TemplateKind,
  id: string
): string | undefined {
  validateId(id);

  if (platform === 'codex' && kind !== 'skill') {
    return undefined;
  }

  if (platform === 'codex') {
    return `.agents/skills/${id}/SKILL.md`;
  }

  if (platform === 'claude-code') {
    return kind === 'skill' ? `.claude/skills/${id}/SKILL.md` : `.claude/agents/${id}.md`;
  }

  return kind === 'skill' ? `.opencode/skills/${id}/SKILL.md` : `.opencode/agents/${id}.md`;
}

export function assertNoDuplicateOutputPaths(paths: readonly string[]): void {
  const seen = new Set<string>();

  for (const outputPath of paths) {
    if (seen.has(outputPath)) {
      throw new Error(`Duplicate output path: ${outputPath}`);
    }

    seen.add(outputPath);
  }
}

function resolveHeaderTemplatePath(platform: Platform, kind: TemplateKind): string {
  const headerKind = kind === 'agent' ? 'subagent' : kind;

  return resolveTemplatePath(path.join('headers', platform, `${headerKind}.yml`));
}

function canonicalTemplateFromFrontmatter(
  frontmatter: ParsedYamlObject,
  body: string
): CanonicalTemplate {
  for (const field of Object.keys(frontmatter)) {
    if (!SUPPORTED_CANONICAL_FIELDS.has(field)) {
      throw new Error(`Unsupported canonical field "${field}"`);
    }
  }

  const id = readRequiredString(frontmatter, 'id');
  const description = readRequiredString(frontmatter, 'description');
  const tools = readOptionalStringArray(frontmatter.tools, 'tools');
  const model = readOptionalString(frontmatter.model, 'model');
  const permissions = readOptionalPermissions(frontmatter.permissions);
  const codex = readOptionalCodex(frontmatter.codex);
  const metadata: CanonicalTemplate['metadata'] = {};

  if (tools !== undefined) {
    metadata.tools = tools;
  }

  if (model !== undefined) {
    metadata.model = model;
  }

  if (permissions !== undefined) {
    metadata.permissions = permissions;
  }

  if (codex !== undefined) {
    metadata.codex = codex;
  }

  return {
    id,
    description,
    body,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

function validateCanonicalTemplate(template: CanonicalTemplate): void {
  validateId(template.id);

  if (template.description.length < 1 || template.description.length > 1024) {
    throw new Error('Canonical template description must be between 1 and 1024 characters');
  }

  if (template.description.includes('\n') || template.description.includes('\r')) {
    throw new Error('Canonical template description must not be multiline');
  }

  if (typeof template.body !== 'string') {
    throw new Error('Canonical template body is required');
  }
}

function validateId(id: string): void {
  if (id.length < 1 || id.length > 64 || !ID_PATTERN.test(id)) {
    throw new Error(`Invalid canonical template id: ${id}`);
  }
}

function buildRenderContext(
  platform: Platform,
  kind: TemplateKind,
  template: CanonicalTemplate
): ParsedYamlObject {
  const context: ParsedYamlObject = {
    id: template.id,
    description: template.description,
  };

  if (platform === 'claude-code' && kind !== 'skill') {
    if (template.metadata?.tools !== undefined) {
      context.tools = template.metadata.tools.join(', ');
    }

    if (template.metadata?.model !== undefined) {
      context.model = template.metadata.model;
    }
  }

  if (platform === 'opencode' && kind !== 'skill' && template.metadata?.permissions) {
    context.permission = template.metadata.permissions;
  }

  return context;
}

function renderHeaderTemplate(template: string, context: ParsedYamlObject): string {
  let rendered = template;

  const conditionalPattern = /{{#if ([a-zA-Z0-9_.]+)}}\n?((?:(?!{{#if ).)*?){{\/if}}\n?/gs;

  for (;;) {
    const next = rendered.replace(conditionalPattern, (_match, key: string, block: string) =>
      isTruthy(readPath(context, key)) ? block : ''
    );

    if (next === rendered) {
      break;
    }

    rendered = next;
  }

  rendered = rendered.replace(/{{([a-zA-Z0-9_.]+)}}/g, (_match, key: string) => {
    const value = readPath(context, key);

    return typeof value === 'string' || typeof value === 'boolean' ? String(value) : `{{${key}}}`;
  });

  if (rendered.includes('{{')) {
    const placeholder = rendered.match(/{{[^}]+}}/)?.[0] ?? '{{unknown}}';
    throw new Error(`Unresolved placeholder "${placeholder}"`);
  }

  return rendered.trimEnd();
}

function validateRenderedHeader(platform: Platform, kind: TemplateKind, header: string): void {
  const headerContent = parseHeaderYaml(header);
  const supportedFields = SUPPORTED_RENDERED_FIELDS[platform][kind];

  for (const field of Object.keys(headerContent)) {
    if (!supportedFields.has(field)) {
      throw new Error(`Unsupported field "${field}" for platform "${platform}"`);
    }
  }

  if (platform === 'opencode' && kind !== 'skill') {
    const mode = headerContent.mode;

    if (mode !== 'subagent') {
      throw new Error('OpenCode subagent header must include mode: subagent');
    }
  }
}

function parseHeaderYaml(header: string): ParsedYamlObject {
  if (!header.startsWith('---\n') || !header.endsWith('\n---')) {
    throw new Error('Rendered YAML header must be delimited by frontmatter markers');
  }

  return parseYamlObject(header.slice(4, -4));
}

function parseYamlObject(source: string): ParsedYamlObject {
  const lines = source.split('\n');
  const result: ParsedYamlObject = {};
  let activeKey: string | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex] ?? '';
    if (rawLine.trim() === '') {
      continue;
    }

    const arrayMatch = rawLine.match(/^ {2}- (.*)$/);

    if (arrayMatch && activeKey !== undefined) {
      const existing = result[activeKey];

      if (!Array.isArray(existing)) {
        throw new Error(`YAML field "${activeKey}" mixes scalar and array values`);
      }

      existing.push(parseScalar(arrayMatch[1] ?? ''));
      continue;
    }

    const nestedMatch = rawLine.match(/^ {2}([A-Za-z0-9_-]+):(?: (.*))?$/);

    if (nestedMatch && activeKey !== undefined) {
      const existing = result[activeKey];

      if (!isParsedYamlObject(existing)) {
        throw new Error(`YAML field "${activeKey}" mixes scalar and object values`);
      }

      const nestedKey = nestedMatch[1] ?? '';

      existing[nestedKey] =
        nestedMatch[2] === undefined || nestedMatch[2] === '' ? {} : parseScalar(nestedMatch[2]);
      continue;
    }

    const keyValueMatch = rawLine.match(/^([A-Za-z0-9_-]+):(?: (.*))?$/);

    if (!keyValueMatch) {
      throw new Error(`Unsupported YAML line: ${rawLine}`);
    }

    const [, key, rawValue] = keyValueMatch;
    const fieldKey = key ?? '';

    if (Object.hasOwn(result, fieldKey)) {
      throw new Error(`Duplicate YAML field "${fieldKey}"`);
    }

    if (rawValue === undefined || rawValue === '') {
      const nextLine = lines[lineIndex + 1] ?? '';
      result[fieldKey] = nextLine.startsWith('  - ') ? [] : {};
      activeKey = fieldKey;
      continue;
    }

    result[fieldKey] = parseScalar(rawValue);
    activeKey = undefined;
  }

  return result;
}

function parseScalar(rawValue: string): ScalarValue {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  return trimmed;
}

function readRequiredString(frontmatter: ParsedYamlObject, field: string): string {
  const value = frontmatter[field];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Canonical template must include ${field} frontmatter`);
  }

  return value;
}

function readOptionalString(value: ParsedYamlValue | undefined, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Canonical ${field} must be a non-empty string`);
  }

  return value;
}

function readOptionalStringArray(
  value: ParsedYamlValue | undefined,
  field: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    throw new Error(`Canonical ${field} must be a string array`);
  }

  return value;
}

function readOptionalPermissions(value: ParsedYamlValue | undefined): CanonicalPermissions {
  if (value === undefined) {
    return undefined;
  }

  if (!isParsedYamlObject(value)) {
    throw new Error('Canonical permissions must be an object');
  }

  const permissions: { edit?: PermissionValue; bash?: PermissionValue } = {};

  for (const [key, permission] of Object.entries(value)) {
    if (key !== 'edit' && key !== 'bash') {
      throw new Error(`Unsupported canonical permissions field "${key}"`);
    }

    if (typeof permission !== 'string' || !PERMISSION_VALUES.has(permission)) {
      throw new Error(`Invalid canonical permissions.${key}: ${String(permission)}`);
    }

    permissions[key] = permission as PermissionValue;
  }

  return Object.keys(permissions).length > 0 ? permissions : undefined;
}

function readOptionalCodex(value: ParsedYamlValue | undefined): CanonicalCodex {
  if (value === undefined) {
    return undefined;
  }

  if (!isParsedYamlObject(value)) {
    throw new Error('Canonical codex must be an object');
  }

  const codex: { exposeAsSkill?: boolean } = {};

  for (const [key, codexValue] of Object.entries(value)) {
    if (key !== 'exposeAsSkill') {
      throw new Error(`Unsupported canonical codex field "${key}"`);
    }

    if (typeof codexValue !== 'boolean') {
      throw new Error(`Canonical codex.${key} must be boolean`);
    }

    codex.exposeAsSkill = codexValue;
  }

  return Object.keys(codex).length > 0 ? codex : undefined;
}

function readPath(source: ParsedYamlObject, keyPath: string): ParsedYamlValue | undefined {
  return keyPath.split('.').reduce<ParsedYamlValue | undefined>((currentValue, key) => {
    if (!isParsedYamlObject(currentValue)) {
      return undefined;
    }

    return currentValue[key];
  }, source);
}

function isTruthy(value: ParsedYamlValue | undefined): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isParsedYamlObject(value)) {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}

function isParsedYamlObject(value: ParsedYamlValue | undefined): value is ParsedYamlObject {
  return value !== undefined && typeof value === 'object' && !Array.isArray(value);
}
