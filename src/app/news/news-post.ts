import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { map } from 'rxjs';
import { NewsPostData, NewsService } from './news.service';
import { asStringArray, renderMarkdown } from './news-markdown';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

@Component({
  selector: 'app-news-post',
  imports: [RouterLink],
  template: `
    <section class="card">
      <a class="back" routerLink="/news">← All news</a>

      @switch (state()) {
        @case ('loading') {
          <p class="muted">Loading post…</p>
        }
        @case ('notfound') {
          <h1>Post not found</h1>
          <p class="muted">
            No post exists for the slug <code>{{ slug() }}</code
            >. It may have been unpublished, or the link is wrong.
          </p>
        }
        @case ('error') {
          <p class="error">Could not load this post.</p>
        }
        @case ('ready') {
          <article>
            @if (thumbnail()) {
              <img class="banner" [src]="thumbnail()" [alt]="''" width="320" height="180" />
            }
            <div class="post-head">
              <h1>{{ title() }}</h1>
              @if (date()) {
                <time [attr.datetime]="date()">{{ date() }}</time>
              }
            </div>
            <div class="pills">
              @for (tag of tags(); track tag) {
                <span class="pill">{{ tag }}</span>
              }
            </div>
            <!-- Markdown is rendered to HTML at RUNTIME (marked) and bound through
                 Angular's sanitizer. The .md file is the source of truth. -->
            <div class="body" [innerHTML]="body()"></div>
          </article>
        }
      }
    </section>
  `,
  styleUrl: './news-post.scss',
})
export class NewsPost {
  private readonly route = inject(ActivatedRoute);
  private readonly news = inject(NewsService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), {
    initialValue: null,
  });

  protected readonly state = signal<LoadState>('loading');
  protected readonly title = signal('');
  protected readonly date = signal('');
  protected readonly tags = signal<string[]>([]);
  protected readonly thumbnail = signal('');
  protected readonly body = signal<SafeHtml>('');

  constructor() {
    this.load(this.slug());
  }

  private async load(slug: string | null): Promise<void> {
    if (!slug) {
      this.state.set('notfound');
      return;
    }
    try {
      const data = await this.news.loadPost(slug);
      if (!data) {
        this.state.set('notfound');
        return;
      }
      this.applyPost(data);
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  private applyPost(data: NewsPostData): void {
    const fm = data.frontmatter;
    this.title.set((fm['title'] as string) || data.slug);
    this.date.set((fm['date'] as string) || '');
    this.tags.set(asStringArray(fm['tags']));
    const thumb = fm['thumbnail'] as string | undefined;
    this.thumbnail.set(thumb ? this.news.assetUrl(thumb) : '');
    const html = renderMarkdown(data.body);
    this.body.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }
}
