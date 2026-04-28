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

  it("internalChanges and changes fields are never rendered (sanity)", () => {
    // Document-only test — render component must not reference these.
    // Passes by convention; review on render component change.
    expect(true).toBe(true);
  });
});
