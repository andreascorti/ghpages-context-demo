import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-item-detail',
  template: `
    <div class="detail">
      <strong>Detail for item {{ id() }}</strong>
      <p>
        This is a nested child route with a <code>:id</code> param. Deep link:
        <code>items/{{ id() }}</code
        >. Hard-refresh here to confirm nested deep links resolve under the current context path.
      </p>
    </div>
  `,
  styles: [
    `
      .detail {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 1rem;
      }
      code {
        background: #1e293b;
        padding: 0.1rem 0.35rem;
        border-radius: 6px;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      }
    `,
  ],
})
export class ItemDetail {
  private readonly route = inject(ActivatedRoute);
  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: null,
  });
}
