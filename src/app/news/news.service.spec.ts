import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NewsService } from './news.service';

function mockFetch(impl: (url: string) => Response | Promise<Response>) {
  const fn = vi.fn((input: RequestInfo | URL) => Promise.resolve(impl(String(input))));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('NewsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    // jsdom default base href is "/".
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads the manifest relative to the base href', async () => {
    const fetchFn = mockFetch(
      () => new Response(JSON.stringify([{ slug: 'x', title: 'X', date: '2026-01-01', tags: [], excerpt: '' }]), { status: 200 }),
    );
    const svc = TestBed.inject(NewsService);
    const out = await svc.loadManifest();

    expect(fetchFn).toHaveBeenCalledWith('/news-data/manifest.json', expect.anything());
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('x');
  });

  it('throws when the manifest fetch is not ok', async () => {
    mockFetch(() => new Response('nope', { status: 500 }));
    const svc = TestBed.inject(NewsService);
    await expect(svc.loadManifest()).rejects.toThrow(/manifest fetch failed: 500/);
  });

  it('loads a post by slug as .md relative to the base href and parses frontmatter', async () => {
    const md = ['---', 'title: Hello', 'tags: [A, B]', '---', '', '# Hi', '', 'Body text.'].join(
      '\n',
    );
    const fetchFn = mockFetch(() => new Response(md, { status: 200 }));
    const svc = TestBed.inject(NewsService);
    const post = await svc.loadPost('hello');

    expect(fetchFn).toHaveBeenCalledWith('/news-data/posts/hello.md', expect.anything());
    expect(post?.frontmatter['title']).toBe('Hello');
    expect(post?.frontmatter['tags']).toEqual(['A', 'B']);
    expect(post?.body.trim()).toBe('# Hi\n\nBody text.');
  });

  it('returns null for an unknown slug (data-404)', async () => {
    mockFetch(() => new Response('not found', { status: 404 }));
    const svc = TestBed.inject(NewsService);
    expect(await svc.loadPost('missing')).toBeNull();
  });

  it('url-encodes the slug', async () => {
    const fetchFn = mockFetch(() => new Response('---\ntitle: X\n---\nbody', { status: 200 }));
    const svc = TestBed.inject(NewsService);
    await svc.loadPost('a b');
    expect(fetchFn).toHaveBeenCalledWith('/news-data/posts/a%20b.md', expect.anything());
  });
});
