# News content pipeline

How a news article goes from a GitHub issue to live on the portal — **without ever
rebuilding the Angular app**. This pipeline is live; this doc describes how it works and
how to operate it.

```
PM → "📰 New article" issue form
     │  (issue opened/labeled)
     ▼
.github/workflows/issue-to-article.yml   (on main)
     │  parse issue → Markdown + thumbnail → push an article/* branch →
     │  open (or hand off) a PR into the news-content orphan branch
     ▼  ← HUMAN GATE: a maintainer reviews & merges the PR (= the merge policy)
     │
.github/workflows/publish-news.yml       (on the news-content branch)
     │  build manifest.json → copy posts + assets to gh-pages:/news-data/ (keep_files)
     ▼
Live at /<repo>/news   (the Angular SPA fetches /news-data/ at runtime — no ng build)
```

## Where everything lives

| File | Branch | Role |
| --- | --- | --- |
| `.github/ISSUE_TEMPLATE/new-article.yml` | `main` | The author-facing issue form |
| `.github/workflows/issue-to-article.yml` | `main` | Issue → Markdown → PR into `news-content` |
| `.github/scripts/parse-issue.mjs` | `main` | Deterministic issue-body → Markdown assembler (called by the workflow) |
| `.github/workflows/publish-news.yml` | `news-content` | On merge → build manifest → publish to gh-pages |
| `scripts/build-manifest.mjs` | `news-content` | Deterministic `_posts/*.md` → `manifest.json` + `searchText` |
| `_posts/<slug>.md`, `assets/<slug>.<ext>` | `news-content` | The authored content (source of truth) |

> The `news-content` branch is an **orphan** branch: no application code, its own merge
> policy. It holds only content + the publish workflow + the manifest builder.

Published shape on `gh-pages` (scoped subtree — never clobbers the app):

```
gh-pages/news-data/
  manifest.json          feed index + searchText corpus + thumbnail paths (CI-built)
  posts/<slug>.md        posts, verbatim (rendered client-side at runtime)
  assets/<slug>.<ext>    thumbnails (png/jpg/webp/gif/svg)
```

## The authoring flow (what the PM sees)

1. **New issue → "📰 New article"**, fill title / date / tags / excerpt / body (Markdown) /
   drag-drop a thumbnail / author. Submit.
2. The automation generates the Markdown, downloads the image, pushes an `article/*` branch,
   and opens a review **PR into `news-content`** (and comments the link on the issue).
3. A maintainer reviews the Markdown in the PR and **merges** it.
4. `publish-news.yml` rebuilds `manifest.json` and publishes `/news-data/` to `gh-pages`.
5. The post is live at `/<repo>/news` within a minute — no app rebuild, no redeploy.

## Operational notes

### Required repo settings

- **Settings → Actions → General → Workflow permissions → Read and write.**
- **Allow GitHub Actions to create and approve pull requests** (separate checkbox; off by
  default). Without it the generator can push the article branch but cannot open the PR —
  you'll see `GitHub Actions is not permitted to create or approve pull requests`. If org
  policy forbids this, change the workflow to comment the compare link instead of calling
  `gh pr create`, and open the PR by hand.
- **Create the `news-article` label** (`gh label create news-article`) so the form's
  auto-label sticks. The workflow also accepts the form's `### Body (Markdown)` section as a
  fallback signal, so a missing label degrades gracefully.
- **Branch protection on `news-content`:** require a PR + 1 approval. This is the human gate
  and the "different merge policy" for content.

### Editing / unpublishing

- Editing the issue re-runs generation and updates the same `article/*` branch.
- Unpublish = delete `_posts/<slug>.md` on `news-content` via a normal PR; the next publish
  drops it from the manifest.

### Local dry-runs

```bash
# Issue body → Markdown (feed a saved issue body)
node .github/scripts/parse-issue.mjs issue-body.md /tmp/out

# _posts → manifest.json (the exact file the app consumes) — run on a news-content checkout
node scripts/build-manifest.mjs <postsDir> /tmp/manifest.json news-data/assets
```

## Design notes

- **No rebuild on publish.** A new post is a content change, not a code change. The app
  ships one parameterized `news/:slug` route; new posts appear because the manifest changed.
- **Search with no server.** The same build step that assembles a post flattens it into a
  `searchText` field, so the browser searches the manifest in memory — no index service.
- **Deterministic assembly, no LLM** in the publish path — a post is reproducible from its issue.
- **Image compression** (future): PM uploads are published as-is; a downscale/WebP step in
  `issue-to-article.yml` is a sensible later refinement.
