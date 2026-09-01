// Story #993 — My Team game-ready dashboard golden path.
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  mixpanel: {
    identify: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    people: { set: vi.fn() },
  },
  deviceContext: { is_pwa: false, platform: "test", device_os: "test" },
}));

import App from "../App";

const TEAM = {
  id: "team-dashboard-1",
  name: "Mud Hens",
  ageGroup: "8U",
  sport: "baseball",
  season: "Fall",
  year: 2026,
};

const ROSTER = [
  { name: "Alex Rivera", firstName: "Alex", lastName: "Rivera", prefs: [] },
  { name: "Blair Chen", firstName: "Blair", lastName: "Chen", prefs: ["SS"] },
];

function dateFromToday(days) {
  var date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function setSchedule(daysUntilGame) {
  localStorage.setItem("team:" + TEAM.id + ":schedule", JSON.stringify([
    {
      id: "game-next",
      date: dateFromToday(daysUntilGame),
      time: "10:00 AM",
      opponent: "River Cats",
      location: "Field 2",
      home: true,
      result: "",
      scoreReported: false,
      snackDuty: "",
    },
  ]));
}

describe("My Team game-ready dashboard (#993)", function () {
  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM]));
    localStorage.setItem("team:" + TEAM.id + ":roster", JSON.stringify(ROSTER));
    localStorage.setItem("team:" + TEAM.id + ":batting", JSON.stringify(ROSTER.map(function (player) { return player.name; })));

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

  async function openMyTeam() {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /My Team/ }));
    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });
  }

  it("moves the next game into Schedule and opens Game Day from there", async function () {
    setSchedule(1);
    await openMyTeam();

    expect(screen.queryByText("vs. River Cats")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Schedule/ }));
    expect(screen.getByText("vs. River Cats")).toBeInTheDocument();
    expect(screen.getAllByText(/Field 2/).some(function(node) { return node.textContent.includes("Home"); })).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Open Game Day" }));
    await waitFor(function () { expect(screen.getByRole("button", { name: /^Songs$/ })).toBeInTheDocument(); });
  });

  it("keeps game, record, and snack information out of My Team", async function () {
    setSchedule(7);
    await openMyTeam();

    expect(screen.getByText(/1 profile needs attention/)).toBeInTheDocument();
    expect(screen.queryByText("vs. River Cats")).not.toBeInTheDocument();
    expect(screen.queryByText("🍎 Snack Duty")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Schedule/ }));
    await waitFor(function () { expect(screen.getAllByText("🍎 Snack Duty").length).toBeGreaterThan(0); });
    expect(screen.getByLabelText("Season record")).toHaveTextContent("0–0");
  });

  it("keeps the roster summary compact and opens individual or all-player detail screens", async function () {
    setSchedule(7);
    await openMyTeam();
    expect(await screen.findByText("All Players — Quick Summary")).toBeInTheDocument();
    expect(screen.getByText(/Select a player name above/)).toBeInTheDocument();
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Alex Rivera player profile" }));
    expect(await screen.findByText("Review and edit this player's complete roster profile.")).toBeInTheDocument();
    expect(screen.getAllByText("Alex Rivera").length).toBeGreaterThan(0);
    expect(screen.queryByText("Team at a glance")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to roster summary" }));
    fireEvent.click(screen.getByRole("button", { name: "View All Players" }));
    expect(await screen.findByText("Review and edit every player profile in one place.")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Blair Chen")).toBeInTheDocument();
    expect(screen.queryByText("Team at a glance")).not.toBeInTheDocument();
  });
});
