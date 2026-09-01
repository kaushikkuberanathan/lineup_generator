// #664 item 1 — the actual wired flow was never covered end-to-end: App.jsx's
// Home entry point -> TeamSearch -> RequestAccessScreen (preselectedTeam
// populated from the real onSelectTeam call site) -> submit with
// preserveSession correctly threaded from App.jsx into useAuth's
// requestAccess(). Previously verified once by direct code trace and a
// one-off local run, never landed as a permanent CI-enforced test (PR #663
// review, 2026-08-09). Written 2026-08-26 during the #406/#410 test-health
// survey follow-up.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: () => {} }),
}));

vi.mock("../supabase.js", () => ({
  supabase: null,
  isSupabaseEnabled: false,
  dbSaveTeams: vi.fn(() => Promise.resolve()),
  dbDeleteTeam: vi.fn(() => Promise.resolve()),
  dbLoadTeams: vi.fn(() => Promise.resolve(null)),
  dbSaveTeamData: vi.fn(() => Promise.resolve()),
  dbLoadTeamData: vi.fn(() => Promise.resolve(null)),
  dbSnapshotRoster: vi.fn(() => Promise.resolve()),
  dbGetRosterSnapshots: vi.fn(() => Promise.resolve([])),
  dbSaveShareLink: vi.fn(() => Promise.resolve()),
  SHARE_LINK_FETCH_TIMEOUT_MS: 10000,
  dbLoadShareLink: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../utils/analytics", () => ({
  track: vi.fn(),
  identifyTeam: vi.fn(),
  mixpanel: {
    identify: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    people: { set: vi.fn() },
  },
  deviceContext: { is_pwa: false, platform: "test", device_os: "test" },
}));

const mockRequestAccess = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import App from "../App";

const FOUND_TEAM = { id: "team-999", name: "Bananas", age_group: "9U", sport: "baseball", year: 2026 };

describe("App Home -> TeamSearch -> RequestAccessScreen wired flow (#664 item 1)", function () {

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([]));

    mockRequestAccess.mockReset();
    mockRequestAccess.mockResolvedValue({ success: true });

    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: mockRequestAccess,
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([FOUND_TEAM]),
      })
    );
  });

  it("threads a team selected via search into RequestAccessScreen as preselectedTeam, and submits with preserveSession:true", async function () {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Find your team" }));
    await waitFor(function () {
      expect(screen.getByRole("heading", { name: "Find a team" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Team name"), { target: { value: "Banana" } });

    await waitFor(function () {
      expect(screen.getByText(FOUND_TEAM.name)).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText(FOUND_TEAM.name));

    await waitFor(function () {
      expect(screen.getByRole("heading", { name: "Request Access" })).toBeInTheDocument();
    });
    // preselectedTeam populated: read-only team confirmation shown, not an editable Team ID input
    expect(screen.getByText(FOUND_TEAM.name)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("1774297491626")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Jane"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText("Smith"), { target: { value: "Smith" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.click(screen.getByLabelText(/i agree to the/i));
    fireEvent.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(function () {
      expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    });
    expect(mockRequestAccess.mock.calls[0][0].tid).toBe(FOUND_TEAM.id);
    expect(mockRequestAccess.mock.calls[0][1]).toEqual({ preserveSession: true });

    // preserveSession:true's own confirmation-card behavior is covered directly
    // in RequestAccessScreen.test.jsx — this test's job stops at confirming the
    // real App.jsx call site threads the right props into the real component,
    // not re-testing the component's internal render branches.
    await waitFor(function () {
      expect(screen.getByRole("heading", { name: "Request Sent" })).toBeInTheDocument();
    });
  });
});
