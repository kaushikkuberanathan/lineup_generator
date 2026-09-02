import { describe, expect, it, vi } from "vitest";
import { renderHook } from "./helpers/renderHook";

vi.mock("../supabase", function() {
  return { supabase:null };
});

import { useAuth } from "../hooks/useAuth";

describe("useAuth without a Supabase client (#1002)", function() {
  it("settles unauthenticated without fetching or subscribing", async function() {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const hook = await renderHook(function() { return useAuth(); });

    expect(hook.result.current.authState).toBe("unauthenticated");
    expect(fetchSpy).not.toHaveBeenCalled();

    await hook.unmount();
    fetchSpy.mockRestore();
  });
});
