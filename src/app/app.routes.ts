import { Routes } from '@angular/router';
import { Home } from './home/home';
import { About } from './about/about';
import { Items } from './items/items';
import { ItemDetail } from './items/item-detail';
import { NewsFeed } from './news/news-feed';
import { NewsPost } from './news/news-post';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'about', component: About },
  {
    path: 'items',
    component: Items,
    children: [{ path: ':id', component: ItemDetail }],
  },
  // News: the feed and the per-post page are DEDICATED sibling pages, not a
  // nested child. The app ships exactly ONE parameterized post route — new posts appear
  // because news-data/manifest.json changed, never because the app recompiled.
  { path: 'news', component: NewsFeed },
  { path: 'news/:slug', component: NewsPost },
  // Unknown routes fall back to home (client-side; the 404.html handles hard refreshes).
  { path: '**', redirectTo: '' },
];
