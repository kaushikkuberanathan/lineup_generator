// Story 134 — Home must mirror Account membership visibility and use one
// discover-team entry point. Supabase is fully mocked so this render cannot
// reach live data.
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

const mockUseAuth = vi.fn();
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../utils/analytics", () => ({
  track: vi.fn(),
  mixpanel: {
    identify: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    people: { set: vi.fn() },
  },
  deviceContext: { is_pwa: false, platform: "test", device_os: "test" },
}));

import App from "../App";

const SUBSCRIBED_TEAM = { id: "team-1", name: "Subscribed Sluggers", ageGroup: "8U", sport: "baseball", year: 2026 };
const LOCAL_ONLY_TEAM = { id: "team-2", name: "Local Only Legends", ageGroup: "10U", sport: "baseball", year: 2026 };

describe("App Home — membership teams and unified discovery (#740)", function () {
  let refreshMemberships;

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([SUBSCRIBED_TEAM, LOCAL_ONLY_TEAM]));
    refreshMemberships = vi.fn(() => Promise.resolve());
    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [
        { id: "membership-1", role: "coach", team_id: SUBSCRIBED_TEAM.id },
        { id: "membership-2", role: "coach", team_id: "not-yet-loaded" },
      ],
      updateProfileName: vi.fn(),
      refreshMemberships: refreshMemberships,
    });
  });

  it("shows only subscribed teams and routes the Find your team bar into discovery", async function () {
    render(<App />);

    expect((await screen.findAllByText(SUBSCRIBED_TEAM.name)).length).toBeGreaterThan(0);
    expect(screen.queryByText(LOCAL_ONLY_TEAM.name)).not.toBeInTheDocument();
    expect(screen.queryByText(/don't see your team/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Find your team" }));

    await waitFor(function () {
      expect(screen.getByRole("heading", { name: "Find a team" })).toBeInTheDocument();
    });
  });

  it("refreshes memberships after creating a team, so the new team doesn't wait for a reload (#729/#740 follow-up)", async function () {
    render(<App />);

    await screen.findAllByText(SUBSCRIBED_TEAM.name);

    fireEvent.click(screen.getByRole("button", { name: "+ New Team" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Mud Hens"), { target: { value: "Brand New Bombers" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(function () {
      expect(refreshMemberships).toHaveBeenCalled();
    });
  });
});