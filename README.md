# news-content (orphan branch)

Source of truth for portal news articles. This branch holds authored content ONLY —
no application code — and has its own merge policy (PR + review required).

- `_posts/<slug>.md`   authored Markdown + YAML frontmatter (the real document)
- `assets/<slug>.<ext>` thumbnails (png/jpg/webp/gif/svg)
- `scripts/build-manifest.mjs` deterministic indexer (builds manifest.json + searchText)
- `.github/workflows/publish-news.yml` on merge here → publishes /news-data/ to gh-pages

Articles are authored via the "📰 New article" issue form on the default branch, which
opens a PR into this branch. Merging that PR publishes the post live (no app rebuild).
