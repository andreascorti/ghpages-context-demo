#!/usr/bin/env node
// Minimal, dependency-free test for parse-issue.mjs body-image localization.
// Run: node news-content-scaffold/scripts/parse-issue.test.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'parse-issue.mjs');
const dir = mkdtempSync(join(tmpdir(), 'parse-issue-'));

const issue = `### Title

Release 23 highlights

### Tags

Release

### Excerpt

Visuals.

### Body (Markdown)

![hero](https://github.com/user-attachments/assets/aaa111.png)

<img src="https://github.com/user-attachments/assets/bbb222.jpg" alt="d">

Reuse: ![again](https://github.com/user-attachments/assets/aaa111.png)

Relative stays: ![local](./x.png)

### Thumbnail image

![t](https://github.com/user-attachments/assets/ccc333.png)
`;
const issuePath = join(dir, 'issue.md');
writeFileSync(issuePath, issue);

const out = execFileSync('node', [script, issuePath, dir], { encoding: 'utf8' });
const res = JSON.parse(out.trim().split('\n').pop());
const md = readFileSync(res.mdPath, 'utf8');

// 1. Two unique body images collected (reused hero deduped).
assert.strictEqual(res.bodyImages.length, 2, 'expected 2 unique body images');
assert.ok(res.bodyImages[0].file.endsWith('-1.png'));
assert.ok(res.bodyImages[1].file.endsWith('-2.jpg'));

// 2. Body links rewritten to local asset paths.
assert.ok(md.includes('![hero](news-data/assets/release-23-highlights-1.png)'), 'hero link localized');
assert.ok(md.includes('src="news-data/assets/release-23-highlights-2.jpg"'), 'img src localized');
assert.ok(md.includes('![again](news-data/assets/release-23-highlights-1.png)'), 'reused hero shares asset');

// 3. Relative links untouched.
assert.ok(md.includes('![local](./x.png)'), 'relative link preserved');

// 4. Thumbnail is separate from body images.
assert.ok(res.imageUrl.endsWith('ccc333.png'), 'thumbnail detected separately');
assert.ok(!res.bodyImages.some((b) => b.url.endsWith('ccc333.png')), 'thumbnail not duplicated into body images');

rmSync(dir, { recursive: true, force: true });
console.log('parse-issue body-image localization: all assertions passed ✓');
