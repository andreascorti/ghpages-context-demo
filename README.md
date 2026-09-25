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

### SPA deep links

`public/404.html` + a restore snippet in `index.html` (rafgraph technique) let client-side routes survive a hard refresh under any context path.

## Local development

```bash
npm install
npm start          # http://localhost:4200 — shows "production" (root base href)
npm run build      # production build to dist/ghpages-context-demo/browser
npm test -- --run  # unit tests
```

## One-time repo setup

1. Enable GitHub Pages: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
2. **Settings → Actions → General → Workflow permissions → Read and write**.
3. First production deploy: create a `release/x.y` branch (or push a `vX.Y.Z` tag).
4. Push to `main` for the `/int/` build; open a PR for a `/pr-<n>/` preview.
