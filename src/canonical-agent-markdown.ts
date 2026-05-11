/**
 * Parses canonical Bitacora agent markdown into frontmatter and body sections.
 */

export type CanonicalAgentFrontmatter = {
  name: string;
  description: string;
};

export function parseCanonicalAgentMarkdown(markdown: string): {
  frontmatter: CanonicalAgentFrontmatter;
  body: string;
} {
  const normalized = markdown.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    throw new Error('Canonical agent markdown must start with YAML frontmatter');
  }

  const frontmatterEnd = normalized.indexOf('\n---\n', 4);

  if (frontmatterEnd === -1) {
    throw new Error('Canonical agent markdown frontmatter is not terminated');
  }

  const frontmatterLines = normalized.slice(4, frontmatterEnd).split('\n');
  const frontmatterEntries = new Map<string, string>();

  for (const line of frontmatterLines) {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    frontmatterEntries.set(key, value);
  }

  const name = frontmatterEntries.get('name');
  const description = frontmatterEntries.get('description');

  if (!name || !description) {
    throw new Error('Canonical agent markdown must include name and description frontmatter');
  }

  const body = normalized.slice(frontmatterEnd + '\n---\n'.length).replace(/^\n/, '');

  return {
    frontmatter: { name, description },
    body,
  };
}
