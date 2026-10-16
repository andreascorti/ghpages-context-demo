import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsListItem, NewsService } from './news.service';
import { allTags, filterNews, sortByDateDesc } from './news-search';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-news-feed',
  imports: [RouterLink],
  template: `
    <section class="card">
      <h1>News</h1>
      <p class="lede">
        Posts are fetched at runtime from <code>news-data/manifest.json</code>. The app is never
        rebuilt to show a new post — only the manifest changes.
      </p>

      @if (state() === 'loading') {
        <p class="muted">Loading news…</p>
      } @else if (state() === 'error') {
        <p class="error">Could not load the news manifest.</p>
      } @else {
        <div class="controls">
          <input
            type="search"
            class="search"
            placeholder="Search title, tags, body…"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            aria-label="Search news"
          />
          @if (tags().length) {
            <div class="tags" role="group" aria-label="Filter by tag">
              @for (tag of tags(); track tag) {
                <button
                  type="button"
                  class="tag"
                  [class.active]="activeTags().includes(tag)"
                  (click)="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              }
            </div>
          }
        </div>

        <p class="count">{{ results().length }} of {{ all().length }} posts</p>

        @if (results().length === 0) {
          <p class="muted">No posts match your filters.</p>
        } @else {
          <ul class="feed">
            @for (post of results(); track post.slug) {
              <li class="post">
                <a class="post-link" [routerLink]="[post.slug]">
                  @if (post.thumbnail) {
                    <img
                      class="thumb"
                      [src]="assetUrl(post.thumbnail)"
                      [alt]="''"
                      loading="lazy"
                      width="320"
                      height="180"
                    />
                  }
                  <div class="post-body">
                    <div class="post-head">
                      <h2>{{ post.title }}</h2>
                      <time [attr.datetime]="post.date">{{ post.date }}</time>
                    </div>
                    <p class="excerpt">{{ post.excerpt }}</p>
                    <div class="pills">
                      @for (tag of post.tags; track tag) {
                        <span class="pill">{{ tag }}</span>
                      }
                    </div>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
  styleUrl: './news-feed.scss',
})
export class NewsFeed {
  private readonly news = inject(NewsService);

  /** Resolve a thumbnail path (relative to base href) for the template. */
  protected readonly assetUrl = (path: string): string => this.news.assetUrl(path);

  protected readonly state = signal<LoadState>('loading');
  protected readonly all = signal<NewsListItem[]>([]);
  protected readonly query = signal('');
  protected readonly activeTags = signal<string[]>([]);

  protected readonly tags = computed(() => allTags(this.all()));

  protected readonly results = computed(() =>
    sortByDateDesc(filterNews(this.all(), { query: this.query(), tags: this.activeTags() })),
  );

  constructor() {
    this.load();
  }

  protected toggleTag(tag: string): void {
    const current = this.activeTags();
    this.activeTags.set(
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  private async load(): Promise<void> {
    try {
      this.all.set(await this.news.loadManifest());
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }
}
