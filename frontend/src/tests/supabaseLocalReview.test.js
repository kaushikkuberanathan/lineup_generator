import { describe, expect, it } from "vitest";
import { shouldUseLocalReviewMode } from "../supabase";

describe("Supabase local review boundary (#1002)", function() {
  it("accepts dev_bypass only in development", function() {
    expect(shouldUseLocalReviewMode(true, "?dev_bypass=1")).toBe(true);
    expect(shouldUseLocalReviewMode(false, "?dev_bypass=1")).toBe(false);
  });

  it("does not activate for absent or differently-valued parameters", function() {
    expect(shouldUseLocalReviewMode(true, "")).toBe(false);
    expect(shouldUseLocalReviewMode(true, "?dev_bypass=0")).toBe(false);
    expect(shouldUseLocalReviewMode(true, "?other=1")).toBe(false);
  });
});
