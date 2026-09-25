import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-items',
  imports: [RouterLink, RouterOutlet],
  template: `
    <section class="card">
      <h1>Items</h1>
      <p>A parent route with a nested child. Pick an item, then hard-refresh the detail page.</p>
      <ul class="items">
        @for (id of ids; track id) {
          <li>
            <a [routerLink]="[id]" routerLinkActive="active">Item {{ id }}</a>
          </li>
        }
      </ul>

      <!-- Nested child route renders here (items/:id) -->
      <div class="child">
        <router-outlet />
      </div>
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
      .items {
        display: flex;
        gap: 0.5rem;
        list-style: none;
        padding: 0;
        flex-wrap: wrap;
      }
      .items a {
        display: inline-block;
        padding: 0.35rem 0.75rem;
        border-radius: 8px;
        background: #334155;
        color: #e2e8f0;
        text-decoration: none;
      }
      .items a.active {
        background: #2563eb;
      }
      .child {
        margin-top: 1.5rem;
        min-height: 3rem;
      }
    `,
  ],
})
export class Items {
  protected readonly ids = [1, 2, 3, 42];
}
