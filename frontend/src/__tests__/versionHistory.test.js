import { describe, it, expect } from "vitest";
import { VERSION_HISTORY } from "../data/versionHistory";

const APPROVED_TECH_NOTES = [
  "Bug fixes and performance improvements",
  "Under-the-hood stability improvements",
  "Performance and reliability improvements",
  "Minor fixes and internal improvements",
];

// Story 38 / #116 -- userChanges token scanner. userChanges is coach-facing prose
// (rendered verbatim on the Updates tab); technical jargon here degrades trust the
// same way an unapproved techNote did before the guard above existed. Denylist kept
// tight (<=10 patterns) per Story 38's recommendation -- broader coverage risks
// false positives on legitimate copy (e.g. "refactored to a one-tap workflow").
//
// Scope: enforced only on entries from ENFORCED_FROM_VERSION onward, not
// retroactively. 22 older bullets (pre-2.15.1 -- Story 75's "pre-push hook",
// Story 92/94's "token migration", suite-auth-middleware.js, etc.) already contain
// banned tokens; those shipped to the real Updates tab before this guard existed,
// and rewriting already-shipped changelog prose was judged not worth doing here.
// This protects against new leaks going forward, the same forward-looking
// enforcement DOC_TEST_DEBT.md's "items over 30 days old" rule already uses instead
// of demanding every pre-existing item be fixed retroactively.
const ENFORCED_FROM_VERSION = "2.15.1";

const BANNED_TOKENS = [
  { name: "refactor", re: /\brefactor(ed|ing|s)?\b/i },
  { name: "middleware", re: /\bmiddleware\b/i },
  { name: "hook", re: /\bhooks?\b/i },
  { name: "RPC", re: /\bRPC\b/ },
  { name: "migration", re: /\bmigrations?\b/i },
  { name: "CI", re: /\bCI\b/ },
  { name: "*Panel component name", re: /\b\w+Panel\b/ },
  { name: "*Row component name", re: /\b\w+Row\b/ },
  { name: "*Header component name", re: /\b\w+Header\b/ },
  { name: "terse 'Added X' bullet", re: /^Added?\s+\w+$/i },
];

// Escape hatch for a bullet that legitimately trips a pattern (e.g. "refactored" used
// in plain coach-facing language, not as a dev-jargon reference). Add
// `{ version, bullet }` with a comment explaining why it's a false positive --
// mirrors Story 38's "per-entry override" recommendation. Empty today; no bullet at
// or after ENFORCED_FROM_VERSION currently needs one.
const ALLOWED_FALSE_POSITIVES = new Set([
  // "2.99.0::Example bullet text here" -- reason for the override
]);

describe("VERSION_HISTORY content rules", () => {
  it("every entry has version + date", () => {
    for (const v of VERSION_HISTORY) {
      expect(v.version, `entry missing version`).toBeTruthy();
      expect(v.date, `${v.version} missing date`).toBeTruthy();
    }
  });

  it("every techNote is one of the four approved strings", () => {
    for (const v of VERSION_HISTORY) {
      if (v.techNote == null) continue;
      expect(
        APPROVED_TECH_NOTES,
        `${v.version} techNote not approved: "${v.techNote}"`
      ).toContain(v.techNote);
    }
  });

  it("no userChanges bullet contains PR/Story references", () => {
    const pattern = /PR #\d+|Story #?\d+|closes #\d+/i;
    for (const v of VERSION_HISTORY) {
      if (!Array.isArray(v.userChanges)) continue;
      for (const bullet of v.userChanges) {
        expect(
          pattern.test(bullet),
          `${v.version} userChanges bullet contains PR/Story reference: "${bullet}"`
        ).toBe(false);
      }
    }
  });

  it("no userChanges bullet (from ENFORCED_FROM_VERSION onward) contains banned dev-jargon tokens", () => {
    const cutoffIndex = VERSION_HISTORY.findIndex(
      v => v.version === ENFORCED_FROM_VERSION
    );
    expect(
      cutoffIndex,
      `ENFORCED_FROM_VERSION "${ENFORCED_FROM_VERSION}" not found in VERSION_HISTORY -- update the constant`
    ).toBeGreaterThanOrEqual(0);

    const enforced = VERSION_HISTORY.slice(0, cutoffIndex + 1);
    for (const v of enforced) {
      if (!Array.isArray(v.userChanges)) continue;
      for (const bullet of v.userChanges) {
        const key = `${v.version}::${bullet}`;
        if (ALLOWED_FALSE_POSITIVES.has(key)) continue;
        for (const { name, re } of BANNED_TOKENS) {
          expect(
            re.test(bullet),
            `${v.version} userChanges bullet contains banned token "${name}": "${bullet}"`
          ).toBe(false);
        }
      }
    }
  });

  it("no entry uses 'title' field instead of 'headline'", () => {
    for (const v of VERSION_HISTORY) {
      expect(
        v.title,
        `${v.version} uses 'title' field — rename to 'headline'`
      ).toBeUndefined();
    }
  });

  it("every entry has a non-empty headline string", () => {
    for (const v of VERSION_HISTORY) {
      expect(
        typeof v.headline === "string" && v.headline.length > 0,
        `${v.version} missing or empty headline`
      ).toBe(true);
    }
  });

  it("every entry date matches a recognized format", () => {
    // TODO: normalize all entries to MonthYear format once
    // App.jsx date rendering is confirmed (App.jsx locked to T2).
    // New entries should use MonthYear format.
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/,           // ISO: 2026-05-30
      /^[A-Z][a-z]+ \d{4}$/,           // MonthYear: May 2026
      /^[A-Z][a-z]+ \d{1,2}, \d{4}$/,  // LongDate: March 31, 2026
    ];
    for (const v of VERSION_HISTORY) {
      const matches = formats.some(re => re.test(v.date || ""));
      expect(
        matches,
        `${v.version} date format unrecognized: "${v.date}"`
      ).toBe(true);
    }
  });
});
