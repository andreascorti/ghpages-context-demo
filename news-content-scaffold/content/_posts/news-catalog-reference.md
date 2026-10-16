---
title: A runtime news catalog with no rebuild
date: 2026-10-10
tags: [Architecture, Pattern]
excerpt: How the portal serves editorial posts from a static manifest without ever rebuilding the SPA.
thumbnail: news-data/assets/news-catalog-reference.svg
author: Lead Architect
---

Editorial posts should not ride the application release train. A new post is a
_content_ change, not a _code_ change — so it must not require an `ng build` or
a redeploy of the SPA.

## The shape

The Angular app ships exactly one parameterized route, `news/:slug`, and never
learns about individual posts at build time. The live set of posts lives in a
static `manifest.json` that a content-only pipeline regenerates on each publish.

- The feed loads `manifest.json` once and renders preview cards.
- Each card links to `/news/:slug`, which lazily fetches `posts/<slug>.md`.
- New posts appear because the manifest changed, not because the app recompiled.

## Why this works on GitHub Pages

The content pipeline publishes only the `news-data/` folder onto the `gh-pages`
branch (keep_files semantics), leaving the application build output untouched.
One app, many content snapshots.
