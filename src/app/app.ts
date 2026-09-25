import { Component, computed, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';

interface BuildInfo {
  environment: string;
  contextPath: string;
  gitRef: string;
  gitSha: string;
  builtAt: string;
  prNumber: string;
}

@Component({
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly doc = inject(DOCUMENT);

  // The <base href> the app was deployed with is the ground truth for its context path.
  protected readonly baseHref = signal(this.readBaseHref());

  // Build metadata injected at build time (see public/build-info.json, replaced by CI).
  protected readonly build = signal<BuildInfo | null>(null);

  protected readonly environmentLabel = computed(() => {
    const b = this.build();
    if (b?.environment) return b.environment;
    const href = this.baseHref();
    if (/\/pr-\d+\//.test(href)) return 'pr-preview';
    if (/\/int\//.test(href)) return 'integration';
    return 'production';
  });

  constructor() {
    this.loadBuildInfo();
  }

  private readBaseHref(): string {
    const el = this.doc.querySelector('base');
    return el?.getAttribute('href') ?? '/';
  }

  private async loadBuildInfo(): Promise<void> {
    try {
      // Fetch relative to base href so it resolves correctly under /int/, /pr-N/, etc.
      const res = await fetch(`${this.baseHref()}build-info.json`, { cache: 'no-store' });
      if (res.ok) {
        this.build.set((await res.json()) as BuildInfo);
      }
    } catch {
      // Local dev or missing file: fall back to base-href-derived label.
    }
  }
}
