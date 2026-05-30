import { describe, it, expect } from "vitest";
import { VERSION_HISTORY } from "../data/versionHistory";

const APPROVED_TECH_NOTES = [
  "Bug fixes and performance improvements",
  "Under-the-hood stability improvements",
  "Performance and reliability improvements",
  "Minor fixes and internal improvements",
];

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
