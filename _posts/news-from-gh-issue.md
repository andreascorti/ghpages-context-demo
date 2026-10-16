---
title: Trying out new way to author articles via github issues
date: 2026-10-16
tags: [Architecture]
thumbnail: news-data/assets/news-from-gh-issue.png
excerpt: How a news post goes from a GitHub issue to live on the portal — a form, an auto-generated Markdown PR, a review gate, and a content-only deploy that never rebuilds the app.
author: Andrea Scorti
---

Publishing a post to the portal takes four steps, and none of them rebuild the application.

## 1. Fill the form

An author opens a **📰 New article** issue and fills in the title, date, tags, excerpt,
body, and an optional thumbnail. No Markdown files, no git, no local setup.

## 2. Automation generates the Markdown

On submit, a workflow turns the issue into a well-formatted `.md` file with YAML
frontmatter, downloads the uploaded image, and opens a **pull request into the
`news-content` branch**. The author gets a comment linking to that PR.

## 3. A maintainer reviews and merges

The PR is the human gate. A maintainer reads the generated Markdown, tweaks if needed,
and merges. The `news-content` branch has its own merge policy, kept separate from the
application's.

## 4. The post goes live — no app rebuild

Merging triggers a content-only pipeline that rebuilds a static `manifest.json` (the feed
index _and_ the search corpus) and publishes the posts into the site's `news-data/` folder.
The Angular app, deployed once, simply fetches that folder at runtime.

## Why it works this way

- **No rebuild on publish.** A new post is a content change, not a code change. The app
  ships one parameterized `news/:slug` route; new posts appear because the manifest
  changed, not because the app recompiled.
- **Search with no server.** The same build step that assembles a post also flattens it
  into a `searchText` field, so the browser searches the manifest entirely in memory —
  no index service, no backend.
- **Any image format.** PNG, JPG, WebP, GIF, or SVG all work; the card and banner crop
  them to fit.
