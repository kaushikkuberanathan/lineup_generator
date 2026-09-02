// Coverage-analysis follow-up (session 2026-08-23): Schedule management
// (App.jsx renderSchedule, ~line 5664) is a shipped MVP feature with zero
// prior test coverage per FEATURE_MAP.md row 4. This is a golden-path
// integration test mounting <App/> the same way AppHomeMembershipTeams.test.jsx
// does, since the add/edit-game logic lives inline in the locked App.jsx and
// isn't separately extracted or unit-testable.
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

const TEAM = { id: "team-schedule-1", name: "Schedule Test Sluggers", ageGroup: "8U", sport: "baseball", year: 2026 };
const ROSTER = [{ name: "Jordan Lee" }, { name: "Casey Kim" }];

describe("App Schedule golden path (FEATURE_MAP.md row 4)", function () {

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
      // Matches TEAM.id so the #376 reconciliation effect leaves activeTeamId alone.
      memberships: [{ id: "membership-1", role: "coach", team_id: TEAM.id }],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  });

  async function goToScheduleTab() {
    render(<App />);

    // A single team with a matching membership auto-loads via the #376
    // reconciliation effect — the app lands directly on Team > Roster with
    // the bottom nav already enabled.
    var scheduleTab = await screen.findByRole("button", { name: /Schedule/ });
    fireEvent.click(scheduleTab);

    await waitFor(function () { expect(screen.getByText("+ Add Game")).toBeInTheDocument(); });
  }

  it("shows the empty-schedule state before any game is added", async function () {
    await goToScheduleTab();
    expect(screen.getAllByText(/No games/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "+ Add Game" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Import Schedule|Cancel Import/ })).not.toBeInTheDocument();
  });

  it("adding a game with opponent and date persists it and shows it in the list", async function () {
    await goToScheduleTab();

    fireEvent.click(screen.getByText("+ Add Game"));
    await waitFor(function () { expect(screen.getByText("Add New Game")).toBeInTheDocument(); });

    fireEvent.change(screen.getByPlaceholderText("Opponent *"), { target: { value: "River Cats" } });
    fireEvent.change(screen.getByPlaceholderText("Date *"), { target: { value: "2026-09-12" } });

    var addButton = screen.getByRole("button", { name: "Add Game" });
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    await waitFor(function () { expect(screen.getAllByText(/River Cats/).length).toBeGreaterThan(0); });
    expect(screen.queryByText("Add New Game")).not.toBeInTheDocument();

    var persisted = JSON.parse(localStorage.getItem("team:" + TEAM.id + ":schedule"));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].opponent).toBe("River Cats");
    expect(persisted[0].date).toBe("2026-09-12");
  });

  it("the Add Game submit button stays disabled until both opponent and date are filled in", async function () {
    await goToScheduleTab();

    fireEvent.click(screen.getByText("+ Add Game"));
    await waitFor(function () { expect(screen.getByText("Add New Game")).toBeInTheDocument(); });

    var addButton = screen.getByRole("button", { name: "Add Game" });
    expect(addButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Opponent *"), { target: { value: "River Cats" } });
    expect(addButton).toBeDisabled(); // date still missing

    fireEvent.change(screen.getByPlaceholderText("Date *"), { target: { value: "2026-09-12" } });
    expect(addButton).not.toBeDisabled();
  });

  it("Cancel discards the in-progress form without persisting a game", async function () {
    await goToScheduleTab();

    fireEvent.click(screen.getByText("+ Add Game"));
    await waitFor(function () { expect(screen.getByText("Add New Game")).toBeInTheDocument(); });

    fireEvent.change(screen.getByPlaceholderText("Opponent *"), { target: { value: "River Cats" } });
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Add New Game")).not.toBeInTheDocument();
    var persisted = JSON.parse(localStorage.getItem("team:" + TEAM.id + ":schedule"));
    expect(persisted).toEqual([]);
  });
});
