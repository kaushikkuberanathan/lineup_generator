import { describe, expect, it } from "vitest";
import { buildRosterProfileSearch, readRosterProfileRoute } from "./rosterProfileRoute";

describe("roster profile URL contract (#1002)", function() {
  it("reads individual and all-player routes", function() {
    expect(readRosterProfileRoute("?player=Alex+Rivera")).toBe("Alex Rivera");
    expect(readRosterProfileRoute("?players=all")).toBe("all");
    expect(readRosterProfileRoute("")).toBeNull();
  });

  it("preserves unrelated query parameters while changing profile routes", function() {
    expect(buildRosterProfileSearch("?dev_bypass=1", "Alex Rivera")).toBe("?dev_bypass=1&player=Alex+Rivera");
    expect(buildRosterProfileSearch("?dev_bypass=1&player=Alex+Rivera", "all")).toBe("?dev_bypass=1&players=all");
    expect(buildRosterProfileSearch("?dev_bypass=1&players=all", null)).toBe("?dev_bypass=1");
  });
});
