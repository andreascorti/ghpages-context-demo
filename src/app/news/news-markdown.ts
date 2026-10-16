import { marked } from 'marked';

/** Parsed frontmatter: flat scalars plus simple inline arrays (tags: [a, b]). */
export type Frontmatter = Record<string, string | string[]>;

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  /** The Markdown body with the frontmatter block removed. */
  body: string;
}

const FRONTMATTER_RE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Split a raw .md string into its YAML frontmatter and Markdown body.
 *
 * The parser is intentionally minimal — flat `key: value` pairs plus inline
 * arrays `key: [a, b, c]` — which covers the news frontmatter contract (title,
 * date, tags, excerpt, author) with no YAML dependency. A document with no
 * frontmatter block is returned as all-body with empty frontmatter.
 */
export function parseFrontmatter(raw: string): ParsedMarkdown {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    return { frontmatter: {}, body: raw };
  }
  return { frontmatter: parseYamlSubset(m[1]), body: m[2] };
}

function parseYamlSubset(block: string): Frontmatter {
  const out: Frontmatter = {};
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf(':');
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (!key) {
      continue;
    }

    // Inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => unquote(v.trim()))
        .filter((v) => v.length > 0);
      continue;
    }
    out[key] = unquote(value);
  }
  return out;
}

function unquote(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/** Render a Markdown body string to an HTML string (synchronous). */
export function renderMarkdown(body: string): string {
  // marked.parse is synchronous when no async extensions are registered.
  return marked.parse(body, { async: false }) as string;
}

/** Coerce a frontmatter field to a string[] (tags may be a single string or an array). */
export function asStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}
