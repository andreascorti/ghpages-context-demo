#!/usr/bin/env node
// Build news-data/manifest.json from the authored Markdown posts.
//
// Deterministic, dependency-free. Scans a posts directory for *.md, parses the YAML
// frontmatter (title/date/tags/excerpt/thumbnail/author), and flattens the Markdown
// body into a plain-text `searchText` field. The manifest IS the feed index and the
// search corpus — the SAME build step that assembles a post also indexes it, which is
// how search works with no server and no index service.
//
// Usage: node build-manifest.mjs <postsDir> <outManifestPath> [thumbnailBasePath]
//   postsDir           directory of <slug>.md files
//   outManifestPath    where to write manifest.json
//   thumbnailBasePath  prefix for thumbnail paths in the manifest
//                      (default "news-data/assets") — relative to the app base href.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const [, , postsDir, outPath, thumbBase = 'news-data/assets'] = process.argv;

if (!postsDir || !outPath) {
  console.error('usage: build-manifest.mjs <postsDir> <outManifestPath> [thumbnailBasePath]');
  process.exit(2);
}

const FRONTMATTER_RE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(raw) {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) return { frontmatter: {}, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf(':');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (!key) continue;
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val
        .slice(1, -1)
        .split(',')
        .map((v) => unquote(v.trim()))
        .filter(Boolean);
    } else {
      fm[key] = unquote(val);
    }
  }
  return { frontmatter: fm, body: m[2] };
}

function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Flatten a Markdown body to lowercase plain text for the search corpus.
function flatten(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/[>*_~#-]/g, ' ') // residual markdown punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v) return [v];
  return [];
}

// Find the thumbnail asset that belongs to a slug (any supported extension), or honour
// an explicit frontmatter path. Returns a manifest-relative path or undefined.
function resolveThumb(frontmatter, slug, assetsDir) {
  if (frontmatter.thumbnail) return frontmatter.thumbnail; // author-specified, trusted as-is
  if (!assetsDir || !existsSync(assetsDir)) return undefined;
  const exts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'];
  for (const ext of exts) {
    if (existsSync(join(assetsDir, `${slug}.${ext}`))) {
      return `${thumbBase}/${slug}.${ext}`;
    }
  }
  return undefined;
}

const assetsDir = join(postsDir, '..', 'assets');
const files = readdirSync(postsDir).filter((f) => f.endsWith('.md'));
const entries = [];

for (const file of files.sort()) {
  const slug = basename(file, extname(file));
  const raw = readFileSync(join(postsDir, file), 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);

  if (!frontmatter.title) {
    console.warn(`skip ${file}: missing frontmatter title`);
    continue;
  }

  const entry = {
    slug,
    title: frontmatter.title,
    date: frontmatter.date || '',
    tags: toArray(frontmatter.tags),
    excerpt: frontmatter.excerpt || '',
    searchText: [frontmatter.title, frontmatter.excerpt || '', flatten(body)]
      .join(' ')
      .toLowerCase(),
  };
  const thumb = resolveThumb(frontmatter, slug, assetsDir);
  if (thumb) entry.thumbnail = thumb;

  entries.push(entry);
}

// Newest first (ISO dates sort lexicographically).
entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n');
console.log(`wrote ${entries.length} entries to ${outPath}`);
