/**
 * adminDevHtmlSync.test.js
 *
 * admin.dev.html (#645) is a copy-paste DEV-pointed variant of admin.html —
 * same feature code, different Supabase project + backend URL. There is no
 * build step to share code between two files under public/, so a future
 * edit to admin.html's actual functionality is only a comment's promise
 * away from silently NOT being ported to admin.dev.html (see the file's own
 * header comment: "there is no build step to share code between them").
 *
 * This doesn't diff the files byte-for-byte (the DEV banner/title/config
 * constants are SUPPOSED to differ) — instead it asserts the two files
 * declare the exact same set of top-level functions. That's a cheap, low-
 * maintenance signal that catches the actual risk (a feature added/removed
 * in one file, not the other) without being sensitive to the intentional
 * config/banner differences or incidental whitespace.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML_PATH = path.join(__dirname, '../../public/admin.html');
const ADMIN_DEV_HTML_PATH = path.join(__dirname, '../../public/admin.dev.html');

function functionNames(html) {
  return [...html.matchAll(/function (\w+)\(/g)].map((m) => m[1]).sort();
}

describe('admin.dev.html — stays in sync with admin.html (#645)', () => {
  it('declares the exact same set of top-level functions as admin.html', () => {
    const prodHtml = readFileSync(ADMIN_HTML_PATH, 'utf8');
    const devHtml = readFileSync(ADMIN_DEV_HTML_PATH, 'utf8');

    expect(functionNames(devHtml)).toEqual(functionNames(prodHtml));
  });

  it('points at the DEV Supabase project, never the prod project ref', () => {
    const devHtml = readFileSync(ADMIN_DEV_HTML_PATH, 'utf8');

    expect(devHtml).toContain('psqvzppphdedqkpmarwx'); // dugout-lineup-dev
    expect(devHtml).not.toContain('hzaajccyurlyeweekvma'); // prod - must never appear
  });

  it('admin.html itself never points at the DEV project (fence works both directions)', () => {
    const prodHtml = readFileSync(ADMIN_HTML_PATH, 'utf8');

    expect(prodHtml).toContain('hzaajccyurlyeweekvma'); // prod
    expect(prodHtml).not.toContain('psqvzppphdedqkpmarwx'); // dev - must never appear
  });
});
