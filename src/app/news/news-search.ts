import { NewsListItem } from './news.service';

/** The active feed filters. All are AND-combined. */
export interface NewsFilter {
  /** Free-text query, matched against title + tags + searchText (case-insensitive substring). */
  query: string;
  /** Selected tags; an item must carry ALL of them to match. Empty = no tag filter. */
  tags: string[];
}

/**
 * Pure, in-memory search over the manifest. This is the whole "search without an index
 * service": the corpus is the manifest array the feed already holds, and matching is a
 * substring scan over CI-prepared text. No network, no index build, O(posts) per query.
 *
 * Isolated as a pure function so it is trivially unit-testable and so a fuzzy/ranked
 * backend (Fuse.js, MiniSearch) can replace the body without touching the components.
 */
export function filterNews(items: NewsListItem[], filter: NewsFilter): NewsListItem[] {
  const q = filter.query.trim().toLowerCase();
  const wantTags = filter.tags;

  return items.filter((item) => {
    if (wantTags.length > 0) {
      const has = new Set(item.tags.map((t) => t.toLowerCase()));
      if (!wantTags.every((t) => has.has(t.toLowerCase()))) {
        return false;
      }
    }
    if (q.length === 0) {
      return true;
    }
    return haystack(item).includes(q);
  });
}

/** Flatten an item into a single lowercase string to scan. */
function haystack(item: NewsListItem): string {
  return [item.title, item.excerpt ?? '', item.tags.join(' '), item.searchText ?? '']
    .join(' ')
    .toLowerCase();
}

/** All distinct tags present in the corpus, sorted — used to render the tag filter rail. */
export function allTags(items: NewsListItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      set.add(tag);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Newest first, by ISO date string (lexicographic order is chronological for YYYY-MM-DD). */
export function sortByDateDesc(items: NewsListItem[]): NewsListItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}
