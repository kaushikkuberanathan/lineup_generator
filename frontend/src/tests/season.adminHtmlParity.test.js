/**
 * season.adminHtmlParity.test.js
 *
 * admin.html (frontend/public/) can't import ./utils/season.js directly —
 * files under public/ are served as-is, outside Vite's module graph, so a
 * raw import would resolve in `npm run dev` but 404 in the production
 * build. It keeps its own inline copy of formatSeason/compareNewestFirst/
 * currentSeasonGuess instead (same duplication convention this codebase
 * already uses for AGE_GROUPS across App.jsx/TeamSearch.jsx).
 *
 * This test extracts admin.html's actual inline function source (not a
 * hand-copied re-statement of it) and runs the exact same behavioral
 * assertions against it as season.test.js runs against the canonical
 * module — so if admin.html's copy silently drifts from season.js (or
 * vice versa), this fails instead of only one side being covered.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { currentSeasonGuess, formatSeason, compareTeamsNewestFirst } from '../utils/season.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML_PATH = path.join(__dirname, '../../public/admin.html');

// Extracts a function's full source text ("function NAME(...) { ... }") from
// admin.html by brace-counting from the first '{' after the signature —
// robust to the exact body formatting, unlike a naive single-line regex.
function extractFunctionSource(html, name) {
  var sigIndex = html.indexOf('function ' + name + '(');
  if (sigIndex === -1) {
    throw new Error('admin.html: could not find "function ' + name + '(" — has it been renamed or removed?');
  }
  var braceStart = html.indexOf('{', sigIndex);
  var depth = 0;
  var i = braceStart;
  for (; i < html.length; i++) {
    if (html[i] === '{') { depth++; }
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { break; }
    }
  }
  return html.slice(sigIndex, i + 1);
}

describe('admin.html season logic — behavioral parity with utils/season.js', function() {
  var adminFormatSeason, adminCompareNewestFirst, adminCurrentSeasonGuess;

  beforeAll(function() {
    var html = readFileSync(ADMIN_HTML_PATH, 'utf8');
    // seasonRank is a private helper compareNewestFirst depends on — pull
    // both into scope together so the extracted compareNewestFirst source
    // can actually call it.
    var seasonRankSrc = extractFunctionSource(html, 'seasonRank');
    var formatSeasonSrc = extractFunctionSource(html, 'formatSeason');
    var compareNewestFirstSrc = extractFunctionSource(html, 'compareNewestFirst');
    var currentSeasonGuessSrc = extractFunctionSource(html, 'currentSeasonGuess');

    adminFormatSeason = new Function('return (' + formatSeasonSrc + ')')();
    adminCompareNewestFirst = new Function(seasonRankSrc + '; return (' + compareNewestFirstSrc + ')')();
    adminCurrentSeasonGuess = new Function('return (' + currentSeasonGuessSrc + ')')();
  });

  it('formatSeason: identical output to the canonical module across a range of inputs', function() {
    var cases = [
      ['Spring', 2026], ['Fall', 2026], ['Spring', 2008],
      ['', 2026], [null, 2026], [undefined, 2026],
      ['Spring', null], ['Spring', undefined], ['Spring', 0],
    ];
    cases.forEach(function(args) {
      expect(adminFormatSeason(args[0], args[1])).toBe(formatSeason(args[0], args[1]));
    });
  });

  it('compareNewestFirst: identical ordering to the canonical module', function() {
    var teams = [
      { name: 'Old Spring', season: 'Spring', year: 2025 },
      { name: 'This Fall', season: 'Fall', year: 2026 },
      { name: 'This Spring', season: 'Spring', year: 2026 },
    ];
    var adminSorted = teams.slice().sort(adminCompareNewestFirst).map(function(t) { return t.name; });
    var canonicalSorted = teams.slice().sort(compareTeamsNewestFirst).map(function(t) { return t.name; });
    expect(adminSorted).toEqual(canonicalSorted);
    expect(adminSorted).toEqual(['This Fall', 'This Spring', 'Old Spring']);
  });

  afterEach(function() {
    vi.useRealTimers();
  });

  it('currentSeasonGuess: identical Spring/Fall boundary behavior to the canonical module', function() {
    // admin.html's copy takes no date argument (unlike the canonical
    // module's optional param) — fake the system clock for the boundary check.
    [0, 5, 6, 11].forEach(function(monthIndex) {
      var fixedNow = new Date(2026, monthIndex, 15);
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      expect(adminCurrentSeasonGuess()).toBe(currentSeasonGuess(fixedNow));
      vi.useRealTimers();
    });
  });
});
