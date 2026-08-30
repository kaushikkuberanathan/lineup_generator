// #967: the Songs view (App.jsx renderSongs, ~line 5433) had zero test
// coverage — nothing asserted that the Game Day View filters walk-up songs
// down to activeBattingOrder (absent players excluded) or that the Play
// action's link target is wired correctly. This is a golden-path integration
// test mounting <App/> the same way AppBattingOrderGoldenPath.test.jsx does,
// since the walk-up song render logic lives inline in the locked App.jsx and
// isn't separately extracted or unit-testable. Only the Open Song link's href
// is asserted — the OS-mediated deep link/media playback itself is outside
// what a unit test can exercise, per #967's own description.
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

const TEAM = { id: "team-songs-1", name: "Songs Golden Path Sluggers", ageGroup: "8U", sport: "baseball", year: 2026 };
const ROSTER = [
  {
    name: "Jordan Lee",
    walkUpSong: "Thunderstruck",
    walkUpArtist: "AC/DC",
    walkUpLink: "https://open.spotify.com/track/thunderstruck-id",
  },
  {
    // Absent tonight — walkUpSong must NOT render in the Game Day View,
    // since that view filters through activeBattingOrder, not the raw roster.
    name: "Casey Kim",
    walkUpSong: "Eye of the Tiger",
    walkUpArtist: "Survivor",
    walkUpLink: "https://open.spotify.com/track/eye-of-the-tiger-id",
  },
  {
    name: "Sam Diaz",
    walkUpSong: null,
    walkUpArtist: null,
    walkUpLink: null,
  },
];
const BATTING_ORDER = ["Jordan Lee", "Casey Kim", "Sam Diaz"];

// Mirrors App.jsx's own local-calendar-date key derivation exactly (see
// frontend/CLAUDE.md § Date Keys in localStorage) — attendanceOverrides is
// keyed by local date, not toISOString(), so the test must compute the same
// key or the seeded absence silently misses.
function todayLocalDateKey() {
  var d = new Date();
  return d.getFullYear() + "-"
    + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0");
}

describe("App Songs golden path (#967)", function () {

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM]));
    localStorage.setItem("team:" + TEAM.id + ":roster", JSON.stringify(ROSTER));
    localStorage.setItem("team:" + TEAM.id + ":batting", JSON.stringify(BATTING_ORDER));
    localStorage.setItem("team:" + TEAM.id + ":schedule", JSON.stringify([]));
    localStorage.setItem("attendanceOverrides", JSON.stringify({
      [todayLocalDateKey()]: ["Casey Kim"],
    }));

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

  async function openTeamAndGoToSongsTab() {
    render(<App />);

    // A single team with a matching membership auto-loads via the #376
    // reconciliation effect — the app lands directly on the Team > Roster
    // screen with the bottom nav already enabled, no "Open" tap needed.
    var gameDayNav = await screen.findByRole("button", { name: /Game Day/ });
    fireEvent.click(gameDayNav);

    var songsSubtab = await screen.findByRole("button", { name: /^Songs$/ });
    fireEvent.click(songsSubtab);

    await waitFor(function () { expect(screen.getByText("Walk-Up Songs")).toBeInTheDocument(); });
  }

  it("filters the Game Day View to activeBattingOrder — absent players' songs are excluded", async function () {
    await openTeamAndGoToSongsTab();

    // Included, present player: song renders.
    expect(screen.getByText(/Thunderstruck/)).toBeInTheDocument();
    expect(screen.getByText(/AC\/DC/)).toBeInTheDocument();

    // Excluded, absent-tonight player: song must not render anywhere on the
    // page, even though it exists on the roster object.
    expect(screen.queryByText(/Eye of the Tiger/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Survivor/)).not.toBeInTheDocument();
    expect(screen.queryByText("Casey")).not.toBeInTheDocument();

    // A batting-order player with no song set still renders its row (via
    // the "No song set" empty state), confirming the list itself is built
    // from activeBattingOrder membership, not merely "has a song".
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("No song set")).toBeInTheDocument();
  });

  it("wires the Play action to the player's walk-up song link", async function () {
    await openTeamAndGoToSongsTab();

    var openSongLink = screen.getByRole("link", { name: /Open Song/ });
    expect(openSongLink).toHaveAttribute("href", "https://open.spotify.com/track/thunderstruck-id");
    expect(openSongLink).toHaveAttribute("target", "_blank");

    // Only one Open Song link should exist — Casey Kim (absent) and Sam Diaz
    // (no link) must not contribute one.
    expect(screen.getAllByRole("link", { name: /Open Song/ })).toHaveLength(1);
  });
});
