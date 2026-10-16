---
title: Upgrading the portal to Angular 22
date: 2026-10-14
tags: [Release, Dependency]
excerpt: What changed in the Angular 22 bump and why the migration stayed low-risk for downstream apps.
thumbnail: news-data/assets/angular-22-upgrade.png
author: Platform Team
---

The portal moved to **Angular 22** this cycle. This post walks through what
changed and why the migration stayed low-risk for the apps that depend on us.

## What changed

- Standalone components are now the default; the last few `NgModule` shells were removed.
- The new control-flow blocks (`@if`, `@for`) replaced the structural directives across the catalog.
- Peer dependency ranges were widened so downstream apps can adopt on their own cadence.

## Why it was low-risk

The public API surface did not change. Every component kept its selector and
inputs, so consuming apps recompile without code edits. The one thing to watch
is the peer-dependency _overrides_ block if you pin a snapshot build.

> Tip: run `npx ng update` and let the schematics handle the control-flow
> migration for you.
