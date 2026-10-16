---
title: Client-side search without an index service
date: 2026-10-02
tags: [Architecture, Search]
excerpt: 'The CI build step is the index step: a flattened searchText field turns the manifest into the search corpus.'
thumbnail: news-data/assets/search-without-a-server.svg
author: Lead Architect
---

There is no backend here — no Elasticsearch, no Algolia, no database doing a
`LIKE`. Everything is static files on `gh-pages`. So how do you search?

## The build step is the index step

The content pipeline already parses every Markdown post to render its HTML body.
In the same pass it flattens the post to plain text — headings plus prose,
stripped of markup — and writes it into a `searchText` field on each manifest
entry.

That turns the manifest into the search corpus. The browser fetches it once for
the feed and searches it entirely in memory. The "index with no index service"
is just a static JSON artifact the CI emits.

## Scaling up later

- Baseline: substring match over `title`, `tags`, and `searchText`.
- Drop-in upgrade: hand the same array to a tiny client lib (Fuse.js /
  MiniSearch) for typo-tolerant ranked results.
- At thousands of docs: emit a prebuilt serialized index as a second artifact.

Search never touches the per-post payloads — it only reads the manifest, so it
costs zero network per keystroke.
