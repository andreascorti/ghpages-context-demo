# ghpages-context-demo

A minimal Angular app for testing **GitHub Pages multi-context-path deployment** from a single `gh-pages` branch. One build, deployed to several context paths, each reading its own `<base href>` to prove which context served it.

## Deployment model

All targets coexist on the same `gh-pages` branch. Every deploy uses `keep_files: true` (or a scoped `destination_dir`) so no target ever clobbers another.

| Target          | Trigger                             | Path on Pages         | `--base-href` | Workflow                              |
| --------------- | ----------------------------------- | --------------------- | ------------- | ------------------------------------- |
| **Production**  | push to `release/**` or tag `v*`    | `/` (root, no folder) | `/`           | `deploy-prod.yml`                     |
| **Integration** | every commit on `main`              | `/int/`               | `/int/`       | `deploy-int.yml`                      |
| **PR preview**  | PR opened / synchronized / reopened | `/pr-<n>/`            | `/pr-<n>/`    | `pr-ci.yml` + `pr-preview-deploy.yml` |
| **PR cleanup**  | PR closed                           | removes `/pr-<n>/`    | —             | `pr-cleanup.yml`                      |

### Why two workflows for PR previews

`pr-ci.yml` runs on `pull_request` with **read-only** permissions (safe for fork PRs) and only builds + uploads the app as an artifact. `pr-preview-deploy.yml` runs on `workflow_run` in the **base repo** context with write permissions, downloads that artifact, publishes it, and comments on the PR. This is the standard secure pattern for deploying untrusted-fork PR builds.

### base-href is the key

An Angular SPA needs `<base href>` to match its serving path. Rather than hard-coding it, each workflow passes `--base-href` at build time, so the same source deploys to any context. The app reads the deployed base href (and a CI-generated `build-info.json`) at runtime and shows the environment, context path, git ref, commit, and PR number.

### SPA deep links (single root 404 router)

GitHub Pages honours only ONE custom 404 — the one at the **site root** — for every miss on the
site, including misses under `/int/...` and `/pr-N/...`. A nested `int/404.html` is not used. So a
single context-aware router lives at the branch root (`404.html`, built from
`.github/pages/root-404.html` with the base prefix injected). On a hard refresh of e.g.
`/<repo>/int/items`, GitHub serves that root 404, which inspects the path, finds the context folder
(`int` / `pr-<n>` / none = production), and redirects to that context's `index.html` with the
remaining route encoded. `index.html`'s restore snippet (rafgraph technique) turns it back into the
real URL for the Angular router. The root 404 is (re)published by the production and integration
deploys, and written-if-missing by the PR preview deploy so previews resolve standalone.

## Local development

```bash
npm install
npm start          # http://localhost:4200 — shows "production" (root base href)
npm run build      # production build to dist/ghpages-context-demo/browser
npx ng test        # unit tests (Vitest builder, runs once)
```

## Routes (to test Angular routing under a context path)

| Route        | Purpose                                   |
| ------------ | ----------------------------------------- |
| `/`          | Home — the context/build-info panel       |
| `/about`     | A top-level route                         |
| `/items`     | Parent route with a list                  |
| `/items/:id` | **Nested child route** with a route param |

The point of the routes is to prove deep links survive under any context path. Because each build
sets `<base href>` to its context and `public/404.html` restores the URL on a hard refresh, a deep
link resolves correctly even on a cold reload — no server-side redirects needed. `RouterLink`
bindings are relative to the base href, so navigation stays inside the correct context automatically.

## Base prefix: project page vs custom domain

GitHub Pages serves this repo as a **project page** at `https://<owner>.github.io/<repo>/`, so the
site root is `/<repo>/`, not the domain root. Every context path is therefore prefixed with the repo
segment:

| Target      | Served at         |
| ----------- | ----------------- |
| Production  | `/<repo>/`        |
| Integration | `/<repo>/int/`    |
| PR preview  | `/<repo>/pr-<n>/` |

The workflows compute this prefix from `${{ github.event.repository.name }}` (so a repo **rename**
is handled automatically) and inject it into both the Angular `--base-href` and the `__SPA_BASE__`
token in `public/404.html`.

**This repo-segment prefix is only needed until you use a custom domain.** With a custom domain (or
if the repo is renamed to `<owner>.github.io`, a user page), the site is served from the domain
**root** and the prefix becomes `/`. To switch:

- Set repo variable **`PAGES_BASE_PREFIX`** to `/` (**Settings → Secrets and variables → Actions →
  Variables**). The build steps fall back to `/<repo>/` when it is unset.
- Optionally set **`PAGES_HOST`** (e.g. `https://demo.example.com`) so the PR-preview comment links
  point at the custom domain instead of `github.io`.
- Add the domain under **Settings → Pages → Custom domain** (this writes a `CNAME` to `gh-pages`).

## One-time repo setup

1. Enable GitHub Pages: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
2. **Settings → Actions → General → Workflow permissions → Read and write**.
3. **Maintainer approval gate for PR deploys**: **Settings → Environments → New environment →
   `pr-preview`**, then add **Required reviewers** (the maintainers). The `deploy-preview` job is
   bound to this environment, so it pauses for manual approval before publishing any PR preview —
   including fork PRs. Approve from the Actions run page.
4. First production deploy: create a `release/x.y` branch (or push a `vX.Y.Z` tag).
5. Push to `main` for the `/int/` build; open a PR for a preview (approve the gate to deploy).
6. **(Custom domain, optional)** set `PAGES_BASE_PREFIX=/` and `PAGES_HOST` as above.
