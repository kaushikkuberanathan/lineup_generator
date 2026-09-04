// #943: the Bottom Nav (App.jsx renderBottomNav, ~line 7457) had zero direct
// test coverage — the QA & Reliability Audit's #943 finding names it among
// the untested render paths (it's part of the "always-present chrome" per
// frontend/CLAUDE.md's Frontend Structure section, not tab-dispatched, and
// renders on every screen). This is a golden-path integration test mounting
// <App/> the same way AppSongsGoldenPath.test.jsx does, since the nav lives
// inline in the locked App.jsx and isn't separately extracted or
// unit-testable. Covers ordinary tab switching plus the one non-obvious
// behavior: tapping Home while inside My Team, Schedule, or Game Day opens the Exit Sheet
// confirmation instead of navigating straight home (renderExitSheet, ~7413).
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

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
  identifyTeam: vi.fn(),
  mixpanel: {
    identify: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    people: { set: vi.fn() },
  },
  deviceContext: { is_pwa: false, platform: "test", device_os: "test" },
}));

import App from "../App";

const TEAM = { id: "team-nav-1", name: "Bottom Nav Golden Path Sluggers", ageGroup: "9U", sport: "baseball", year: 2026 };
const ROSTER = [{ name: "Alex Rivera", firstName: "Alex", lastName: "Rivera" }];

describe("App Bottom Nav golden path (#943)", function () {

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM]));
    localStorage.setItem("team:" + TEAM.id + ":roster", JSON.stringify(ROSTER));
    localStorage.setItem("team:" + TEAM.id + ":batting", JSON.stringify(ROSTER.map(function (p) { return p.name; })));
    localStorage.setItem("team:" + TEAM.id + ":schedule", JSON.stringify([]));

    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [{ id: "membership-1", role: "coach", team_id: TEAM.id }],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  });

  it("switches primaryTab through My Team, Schedule, Game Day, and Support", async function () {
    render(<App />);

    var myTeamNav = await screen.findByRole("button", { name: /My Team/ });
    fireEvent.click(myTeamNav);
    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Schedule/ }));
    await waitFor(function () { expect(screen.getByText("No upcoming game. Add one below when the schedule is ready.")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Game Day/ }));
    await waitFor(function () { expect(screen.getByRole("button", { name: /^Songs$/ })).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Support/ }));
    await waitFor(function () { expect(screen.queryByText("Roster and Player Profiles")).not.toBeInTheDocument(); });
  });

  it("selects the contemporary Game Day entry behind UX_GAMEDAY_SETUP", async function () {
    localStorage.setItem("flag_UX_GAMEDAY_SETUP", "true");
    localStorage.setItem("team:" + TEAM.id + ":schedule", JSON.stringify([{ id:"game-1", opponent:"Tigers", date:"2099-09-05", home:false }]));
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name:/Game Day/ }));

    expect(await screen.findByRole("heading", { name:"Game Day" })).toBeInTheDocument();
    expect(screen.getByText("vs. Tigers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name:/Finish lineup setup/i })).toBeDisabled();
  });

  it("tapping Home while inside My Team opens the Exit Sheet instead of navigating away", async function () {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /My Team/ }));
    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Home/ }));

    await waitFor(function () { expect(screen.getByText("Leave team?")).toBeInTheDocument(); });
    // The underlying Team screen is still mounted behind the sheet — Home
    // did not navigate away on its own.
    expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument();
  });

  it.each([375, 393])("keeps all five primary destinations available at %ipx", async function(width) {
    Object.defineProperty(window, "innerWidth", { configurable:true, writable:true, value:width });
    window.dispatchEvent(new Event("resize"));
    render(<App />);

    var nav = await screen.findByRole("navigation", { name:"Primary" });
    var buttons = within(nav).getAllByRole("button");
    expect(buttons).toHaveLength(5);
    ["Home", "My Team", "Schedule", "Game Day", "Support"].forEach(function(label) {
      expect(within(nav).getByRole("button", { name:new RegExp(label, "i") })).toBeInTheDocument();
    });
    buttons.forEach(function(button) { expect(button.style.flex).toBe("1 1 0%"); });
    expect(nav).toHaveStyle({ position:"fixed", bottom:"0px" });
  });

  it("tapping Home while inside Schedule opens the Exit Sheet", async function () {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /Schedule/ }));
    await waitFor(function () { expect(screen.getByText("No upcoming game. Add one below when the schedule is ready.")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Home/ }));
    await waitFor(function () { expect(screen.getByText("Leave team?")).toBeInTheDocument(); });
  });

  it("Exit Sheet's Keep Working dismisses the sheet without leaving the team", async function () {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /My Team/ }));
    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: /Home/ }));
    await waitFor(function () { expect(screen.getByText("Leave team?")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: "Keep Working" }));

    await waitFor(function () { expect(screen.queryByText("Leave team?")).not.toBeInTheDocument(); });
    expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument();
  });

  it("Exit Sheet's Go to Home Screen navigates to the home screen", async function () {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /My Team/ }));
    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: /Home/ }));
    await waitFor(function () { expect(screen.getByText("Leave team?")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /Go to Home Screen/ }));

    await waitFor(function () { expect(screen.queryByText("Leave team?")).not.toBeInTheDocument(); });
    expect(screen.queryByText("Roster and Player Profiles")).not.toBeInTheDocument();
  });
});
