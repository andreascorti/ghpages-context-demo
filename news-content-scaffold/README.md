# News content pipeline (orphan branch + gated publish)

This scaffold stands up the **news catalog authoring pipeline**: a PM fills a GitHub Issue
Form, a workflow turns it into Markdown and opens a **review PR into the orphan
`news-content` branch**, and merging that PR publishes the post to `gh-pages:/news-data/`
— live, with **no application rebuild**.

```
PM → "New article" issue form
     │  (issue labeled news-article)
     ▼
issue-to-article.yml   (on main)       parse issue → MD + thumbnail → PR into news-content
     │
     ▼  ← HUMAN GATE: a maintainer reviews & merges the PR (this is also the merge-policy hook)
     │
publish-news.yml       (on news-content)  build manifest.json → copy to gh-pages:/news-data/
     ▼
Live at /<repo>/news   (the Angular SPA fetches news-data/ at runtime)
```

Nothing here runs `ng build`. The app is deployed once; news is pure content.

## Files in this scaffold

| Path                                             | Goes to                        | Purpose                                                     |
| ------------------------------------------------ | ------------------------------ | ---------------------------------------------------------- |
| `../.github/ISSUE_TEMPLATE/new-article.yml`      | `main` (already placed)        | The PM-facing issue form                                   |
| `workflows-on-main/issue-to-article.yml`         | `main`: `.github/workflows/`   | Issue → MD → PR into `news-content`                        |
| `workflows-on-news-content/publish-news.yml`     | `news-content`: `.github/workflows/` | Merge → build manifest → publish to gh-pages         |
| `scripts/parse-issue.mjs`                        | `main` (used by the workflow)  | Deterministic issue-body → Markdown assembler              |
| `scripts/build-manifest.mjs`                     | `news-content`                 | Deterministic `_posts/*.md` → `manifest.json` + searchText |
| `content/_posts/*.md`, `content/assets/*`        | `news-content` (seed)          | Starter posts so the branch is non-empty                   |

> `parse-issue.mjs` is used from `main` (the issue workflow checks out main). `build-manifest.mjs`
> is used from `news-content` (the publish workflow checks out that branch). Keep a copy of
> `build-manifest.mjs` on `news-content` under `scripts/`.

## Orphan-branch layout (`news-content`)

```
news-content/                      ← orphan: NO app code, its own merge policy
  _posts/<slug>.md                 ← authored Markdown + YAML frontmatter (the real document)
  assets/<slug>.<ext>              ← thumbnails (png/jpg/webp/gif/svg — any format)
  scripts/build-manifest.mjs       ← the indexer the publish workflow runs
  .github/workflows/publish-news.yml
```

The published shape on `gh-pages` (scoped subtree, never clobbers the app):

```
gh-pages/news-data/
  manifest.json                    ← feed index + searchText corpus + thumbnail paths (CI-built)
  posts/<slug>.md                  ← posts, published verbatim (rendered client-side)
  assets/<slug>.<ext>              ← thumbnails
```

## One-time setup

### 1. Seed the orphan branch

From a clean checkout of this repo (replace `OWNER/REPO` as needed):

```bash
# Create a truly empty orphan branch
git checkout --orphan news-content
git rm -rf . >/dev/null 2>&1 || true

# Lay down the content + scripts + the publish workflow
mkdir -p _posts assets scripts .github/workflows
cp news-content-scaffold/content/_posts/*.md   _posts/
cp news-content-scaffold/content/assets/*      assets/
cp news-content-scaffold/scripts/build-manifest.mjs scripts/
cp news-content-scaffold/workflows-on-news-content/publish-news.yml .github/workflows/

git add -A
git commit -m "seed: news-content orphan branch"
git push -u origin news-content

# back to your working branch
git checkout -
```

> Note: these `cp` commands assume you still have the scaffold files from `main` in your
> working tree. If the orphan checkout wiped them, copy from a second clone or from `main`
> via `git show main:news-content-scaffold/...`.

### 2. Place the `main`-side pieces

On `main` (via your normal PR flow — these are the files that trigger generation):

```
.github/ISSUE_TEMPLATE/new-article.yml                 (already added by this change)
.github/workflows/issue-to-article.yml                 ← cp from workflows-on-main/
news-content-scaffold/scripts/parse-issue.mjs          (already added; the workflow calls it)
```

### 3. Branch protection = the merge policy / human gate

On **Settings → Branches → Add rule** for `news-content`:

- **Require a pull request before merging** (so the auto-generated article is always a PR).
- **Require approvals: 1** (the maintainer review — this is the human gate).
- Optionally restrict who can merge.

Because the generator opens a PR (never pushes to `news-content` directly), the merge is both
the review gate and the trigger for `publish-news.yml`. The orphan branch's distinct policy is
exactly the "different merge policy" the design called for.

### 4. Repo permissions

**Settings → Actions → General → Workflow permissions → Read and write**, so the workflows can
push the article branch, open the PR, and push to `gh-pages`.

## The authoring flow (what the PM sees)

1. **New issue → "📰 New article"**, fill title / date / tags / excerpt / body (Markdown) /
   drag-drop a thumbnail / author. Submit.
2. The automation comments on the issue with a link to a generated **PR into `news-content`**.
3. A maintainer reviews the Markdown in the PR and **merges** it.
4. `publish-news.yml` rebuilds `manifest.json` and publishes `/news-data/` to `gh-pages`.
5. The post is live at `/<repo>/news` within a minute — no app rebuild, no redeploy.

## Local dry-runs

```bash
# Issue → MD (feed a saved issue body)
node news-content-scaffold/scripts/parse-issue.mjs issue-body.md /tmp/out

# _posts → manifest.json (the exact file the app consumes)
node news-content-scaffold/scripts/build-manifest.mjs public/news-data/posts /tmp/manifest.json
```

## Notes & future refinements

- **Image compression:** PM uploads are published as-is. A later refinement is a downscale/
  WebP step in `issue-to-article.yml` so an 8 MB phone photo doesn't become a slow card.
- **"Translate into well-formatted MD"** is deterministic assembly (no LLM) so a post is
  reproducible from its issue and no model/secret sits in the publish path. An optional LLM
  polishing step could be added to `issue-to-article.yml` if desired.
- **Edits/unpublish:** editing the issue re-runs generation (updates the same PR branch).
  Unpublishing = delete the `_posts/<slug>.md` on `news-content` (a normal PR); the next
  publish drops it from the manifest.
