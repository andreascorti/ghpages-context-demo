import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <section class="card">
      <h1>About</h1>
      <p>
        A top-level route. If you can hard-refresh this page under a context path (e.g.
        <code>/int/about</code> or <code>/pr-5/about</code>) and still land here, the base href +
        404 SPA fallback are working.
      </p>
    </section>
  `,
  styles: [
    `
      .card {
        width: min(640px, 100%);
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 2rem;
      }
      h1 {
        margin-top: 0;
      }
      code {
        background: #0f172a;
        padding: 0.1rem 0.35rem;
        border-radius: 6px;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      }
    `,
  ],
})
export class About {}
