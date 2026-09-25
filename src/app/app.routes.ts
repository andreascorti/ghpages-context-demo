import { Routes } from '@angular/router';
import { Home } from './home/home';
import { About } from './about/about';
import { Items } from './items/items';
import { ItemDetail } from './items/item-detail';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'about', component: About },
  {
    path: 'items',
    component: Items,
    children: [{ path: ':id', component: ItemDetail }],
  },
  // Unknown routes fall back to home (client-side; the 404.html handles hard refreshes).
  { path: '**', redirectTo: '' },
];
