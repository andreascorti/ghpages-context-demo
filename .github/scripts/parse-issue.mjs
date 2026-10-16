#!/usr/bin/env node
// Turn a "New article" issue-form body into a well-formatted Markdown post.
//
// GitHub Issue Forms render each field into the issue body as:
//   ### <Label>
//   <value>
// (with "_No response_" for empty optional fields). This script extracts the fields,
// derives a slug, assembles YAML frontmatter + the Markdown body, LOCALIZES body-embedded
// image links to news-data/assets, and prints a JSON result describing what to write —
// including the thumbnail URL and the body images to download.
//
// Deterministic and dependency-free, NO network I/O: it only detects and rewrites links;
// the workflow owns downloading (with content-type sniffing). This keeps assembly, not
// language translation, so a post is reproducible from its issue and no model/secret is in
// the publish path.
//
// Usage: node parse-issue.mjs <issueBodyFile> <outDir>
//   issueBodyFile  path to a file containing the raw issue body
//   outDir         directory to write <slug>.md into
// Prints JSON: { slug, mdPath, imageUrl|null, imageExtHint|null, bodyImages:[{url,file}] }

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , bodyFile, outDir] = process.argv;
if (!bodyFile || !outDir) {
  console.error('usage: parse-issue.mjs <issueBodyFile> <outDir>');
  process.exit(2);
}

const raw = readFileSync(bodyFile, 'utf8').replace(/\r\n/g, '\n');

// Split "### Label\n\nvalue" blocks produced by Issue Forms.
function fields(body) {
  const out = {};
  const parts = body.split(/^### +/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = part.slice(0, nl).trim().toLowerCase();
    const value = part.slice(nl + 1).trim();
    out[label] = value === '_No response_' ? '' : value;
  }
  return out;
}

const f = fields(raw);

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const title = (f['title'] || '').trim();
if (!title) {
  console.error('error: Title is required');
  process.exit(1);
}

const slug = (f['slug (optional)'] || f['slug'] || '').trim() || slugify(title);
const today = new Date().toISOString().slice(0, 10);
const date = (f['publication date'] || '').trim() || today;

// Tags: Issue Form "multiple" dropdown renders as a comma-separated line.
const tags = (f['tags'] || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const excerpt = (f['excerpt'] || '').trim().replace(/\n+/g, ' ');
const author = (f['author (optional)'] || f['author'] || '').trim();
let bodyMd = (f['body (markdown)'] || '').trim();

// --- Body image localization ---------------------------------------------------------
// Authors embed images in the body as GitHub inserts them: ![alt](https://github.com/
// user-attachments/...) or <img src="...">. Published verbatim those load from GitHub, not
// from news-data/assets, which breaks the self-contained-news-content guarantee. So we
// detect every body image, assign it a stable local name (<slug>-<n>.<ext>), REWRITE the
// link to the local news-data/assets path, and hand the workflow a download list. The
// extension is a hint only; the workflow finalizes it from the downloaded content-type.
const bodyImages = [];
bodyMd = localizeBodyImages(bodyMd);

function localizeBodyImages(body) {
  let n = 0;
  const seen = new Map(); // dedupe: same URL reused in the body -> one asset

  const assign = (url) => {
    if (seen.has(url)) return seen.get(url);
    n += 1;
    const ext = extGuess(url) || 'png';
    const file = `${slug}-${n}.${ext}`;
    const localPath = `news-data/assets/${file}`;
    bodyImages.push({ url, file });
    seen.set(url, localPath);
    return localPath;
  };

  // Markdown images: ![alt](url "optional title")
  body = body.replace(/(!\[[^\]]*\]\()\s*([^)\s]+)([^)]*\))/g, (m, pre, url, post) => {
    if (!/^https?:\/\//i.test(url)) return m; // leave already-local / relative links
    return `${pre}${assign(url)}${post}`;
  });

  // HTML <img src="url">
  body = body.replace(/(<img[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (m, pre, url, post) => {
    if (!/^https?:\/\//i.test(url)) return m;
    return `${pre}${assign(url)}${post}`;
  });

  return body;
}
// --------------------------------------------------------------------------------------

// Extract the first image URL from the Thumbnail field (GitHub inserts markdown or an
// <img>/bare URL for an upload). We download it in the workflow and name it <slug>.<ext>.
const thumbField = f['thumbnail image'] || f['thumbnail'] || '';
const imageUrl = extractImageUrl(thumbField);
const imageExtHint = imageUrl ? extGuess(imageUrl) : null;

function extractImageUrl(s) {
  if (!s) return null;
  const md = s.match(/!\[[^\]]*\]\(([^)\s]+)/); //  ![alt](url)
  if (md) return md[1];
  const img = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img) return img[1];
  const bare = s.match(/https?:\/\/\S+/);
  return bare ? bare[0] : null;
}

function extGuess(url) {
  const m = url.toLowerCase().match(/\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/);
  return m ? m[1].replace('jpeg', 'jpg') : null;
}

// Thumbnail path is set only if an image was provided; the actual extension is finalized
// in the workflow after download (content-type sniff), so we leave the field to the
// manifest builder's slug-based auto-detection unless an extension is known up front.
const frontmatter = [
  '---',
  `title: ${yamlScalar(title)}`,
  `date: ${date}`,
  `tags: [${tags.join(', ')}]`,
  `excerpt: ${yamlScalar(excerpt)}`,
  ...(imageExtHint ? [`thumbnail: news-data/assets/${slug}.${imageExtHint}`] : []),
  ...(author ? [`author: ${yamlScalar(author)}`] : []),
  '---',
  '',
].join('\n');

function yamlScalar(v) {
  // Quote when the value could be misparsed as YAML.
  if (/^[\s'"]|[:#]|^\s*$|^[&*!|>%@`]/.test(v) || /["']/.test(v)) {
    return `'${v.replace(/'/g, "''")}'`;
  }
  return v;
}

const md = frontmatter + '\n' + bodyMd + '\n';
mkdirSync(outDir, { recursive: true });
const mdPath = join(outDir, `${slug}.md`);
writeFileSync(mdPath, md);

console.log(JSON.stringify({ slug, mdPath, imageUrl, imageExtHint, bodyImages }));
