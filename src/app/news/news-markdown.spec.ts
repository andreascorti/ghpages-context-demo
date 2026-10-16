import { describe, expect, it } from 'vitest';
import { asStringArray, parseFrontmatter, renderMarkdown } from './news-markdown';

describe('parseFrontmatter', () => {
  it('splits a YAML frontmatter block from the body', () => {
    const raw = ['---', 'title: Hello World', 'date: 2026-10-14', '---', '', 'Body line.'].join(
      '\n',
    );
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter['title']).toBe('Hello World');
    expect(frontmatter['date']).toBe('2026-10-14');
    expect(body.trim()).toBe('Body line.');
  });

  it('parses inline arrays (tags)', () => {
    const { frontmatter } = parseFrontmatter('---\ntags: [Release, Dependency]\n---\nx');
    expect(frontmatter['tags']).toEqual(['Release', 'Dependency']);
  });

  it('strips surrounding quotes from scalar values', () => {
    const { frontmatter } = parseFrontmatter("---\nexcerpt: 'A: colon inside'\n---\nx");
    expect(frontmatter['excerpt']).toBe('A: colon inside');
  });

  it('treats a document with no frontmatter as all body', () => {
    const { frontmatter, body } = parseFrontmatter('# Just markdown\n\ntext');
    expect(frontmatter).toEqual({});
    expect(body).toBe('# Just markdown\n\ntext');
  });
});

describe('renderMarkdown', () => {
  it('renders headings, emphasis, and code', () => {
    const html = renderMarkdown('## Title\n\nSome **bold** and `code`.');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
  });

  it('renders lists', () => {
    const html = renderMarkdown('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
  });
});

describe('asStringArray', () => {
  it('passes arrays through', () => {
    expect(asStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });
  it('wraps a single string', () => {
    expect(asStringArray('a')).toEqual(['a']);
  });
  it('returns [] for undefined/empty', () => {
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray('')).toEqual([]);
  });
});
