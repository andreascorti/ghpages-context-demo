import { describe, expect, it } from 'vitest';
import { allTags, filterNews, sortByDateDesc } from './news-search';
import { NewsListItem } from './news.service';

const items: NewsListItem[] = [
  {
    slug: 'a',
    title: 'Upgrading to Angular 22',
    date: '2026-10-14',
    tags: ['Release', 'Dependency'],
    excerpt: 'A dependency bump.',
    searchText: 'standalone components control flow zoneless',
  },
  {
    slug: 'b',
    title: 'Runtime news catalog',
    date: '2026-10-10',
    tags: ['Architecture'],
    excerpt: 'No rebuild on publish.',
    searchText: 'manifest slug orphan branch keep_files',
  },
  {
    slug: 'c',
    title: 'Search without a server',
    date: '2026-10-02',
    tags: ['Architecture', 'Search'],
    excerpt: 'The build step is the index step.',
    searchText: 'substring fuse minisearch corpus',
  },
];

describe('filterNews', () => {
  it('returns everything with an empty filter', () => {
    expect(filterNews(items, { query: '', tags: [] })).toHaveLength(3);
  });

  it('matches on the title (case-insensitive)', () => {
    const r = filterNews(items, { query: 'angular', tags: [] });
    expect(r.map((i) => i.slug)).toEqual(['a']);
  });

  it('matches on the CI searchText body, not just the title/excerpt', () => {
    const r = filterNews(items, { query: 'minisearch', tags: [] });
    expect(r.map((i) => i.slug)).toEqual(['c']);
  });

  it('matches on tags', () => {
    const r = filterNews(items, { query: 'release', tags: [] });
    expect(r.map((i) => i.slug)).toEqual(['a']);
  });

  it('AND-combines multiple selected tags', () => {
    expect(filterNews(items, { query: '', tags: ['Architecture', 'Search'] }).map((i) => i.slug)).toEqual([
      'c',
    ]);
    expect(filterNews(items, { query: '', tags: ['Architecture'] }).map((i) => i.slug)).toEqual([
      'b',
      'c',
    ]);
  });

  it('AND-combines query and tags', () => {
    const r = filterNews(items, { query: 'catalog', tags: ['Architecture'] });
    expect(r.map((i) => i.slug)).toEqual(['b']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterNews(items, { query: 'nonexistent-term-xyz', tags: [] })).toHaveLength(0);
  });
});

describe('allTags', () => {
  it('returns distinct tags sorted alphabetically', () => {
    expect(allTags(items)).toEqual(['Architecture', 'Dependency', 'Release', 'Search']);
  });
});

describe('sortByDateDesc', () => {
  it('orders newest first and does not mutate the input', () => {
    const sorted = sortByDateDesc(items);
    expect(sorted.map((i) => i.slug)).toEqual(['a', 'b', 'c']);
    expect(items[0].slug).toBe('a'); // original untouched
  });
});
