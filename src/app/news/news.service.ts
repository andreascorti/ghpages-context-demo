import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Frontmatter, parseFrontmatter } from './news-markdown';

/** One entry in news-data/manifest.json — powers the feed, the filters, and search. */
export interface NewsListItem {
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  tags: string[];
  excerpt: string;
  /** Optional path (relative to base href) to a preview image. */
  thumbnail?: string;
  /**
   * CI-flattened plaintext of the full post body (headings + prose, markup stripped).
   * This field is what makes search work with no index service: the manifest IS the
   * search corpus, generated once at publish time, searched entirely in the browser.
   */
  searchText?: string;
}

/** One news-data/posts/<slug>.md document — the real Markdown source, loaded lazily. */
export interface NewsPostData {
  slug: string;
  /** Parsed YAML frontmatter (title, date, tags, excerpt, author, …). */
  frontmatter: Frontmatter;
  /** The Markdown body (frontmatter stripped), to be rendered at runtime. */
  body: string;
}

/**
 * Fetches the news manifest and per-post payloads at RUNTIME, relative to <base href>.
 *
 * All data lives under news-data/ which the content-only CI publishes onto the gh-pages
 * branch (scoped folder, keep_files). The app itself is never rebuilt to show a new post —
 * only the manifest changes. Fetching relative to base href means the same build resolves
 * correctly under /, /int/, /pr-N/, or a custom domain (same approach as the Home panel).
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly doc = inject(DOCUMENT);

  /** The deployed <base href>, e.g. "/ghpages-context-demo/int/" or "/". */
  private baseHref(): string {
    const el = this.doc.querySelector('base');
    return el?.getAttribute('href') ?? '/';
  }

  private url(path: string): string {
    return `${this.baseHref()}news-data/${path}`;
  }

  /**
   * Resolve a manifest-relative asset path (e.g. a thumbnail) against the base href.
   * Thumbnails are stored as paths like "news-data/assets/<slug>.svg" so they resolve
   * under /, /int/, /pr-N/, or a custom domain the same way the data files do.
   */
  assetUrl(path: string): string {
    return `${this.baseHref()}${path.replace(/^\//, '')}`;
  }

  /** Load the feed index (also the search corpus). Returns [] on any failure. */
  async loadManifest(): Promise<NewsListItem[]> {
    const res = await fetch(this.url('manifest.json'), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`manifest fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as NewsListItem[];
    return Array.isArray(data) ? data : [];
  }

  /**
   * Load one post as raw Markdown lazily and parse its frontmatter. The .md IS the
   * document — it is rendered to HTML at runtime in the browser (not pre-rendered at
   * build time). Returns null when the slug has no file (data-404).
   */
  async loadPost(slug: string): Promise<NewsPostData | null> {
    const res = await fetch(this.url(`posts/${encodeURIComponent(slug)}.md`), {
      cache: 'no-store',
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`post fetch failed: ${res.status}`);
    }
    const raw = await res.text();
    const { frontmatter, body } = parseFrontmatter(raw);
    return { slug, frontmatter, body };
  }
}
