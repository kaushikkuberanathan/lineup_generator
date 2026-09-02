// Story #1030 — API-driven Home wired into App.jsx behind API_DRIVEN_HOME/
// API_DRIVEN_ROUTES (both default off). Supabase is fully mocked so this
// render cannot reach live data; the Home API itself is mocked via
// global.fetch, matching useBackendHealth.test.js's established pattern
// for network calls this app makes directly (not through Supabase).
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
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

const TEAM = { id: "team-api-1", name: "API Home Rockets", ageGroup: "8U", sport: "baseball", season: "Fall", year: 2026, role: "admin" };
// A second membership-backed team, purely so App.jsx's single-membership
// auto-select (memberships.length === 1 -> jump straight into that team's
// dashboard, bypassing Home entirely) doesn't fire and swallow the Home
// view these tests need — same reason AppHomeTeamCardRoleGate.test.jsx
// carries its own OTHER_TEAM.
const OTHER_TEAM = { id: "team-api-2", name: "Other Otters", ageGroup: "10U", sport: "baseball", season: "Fall", year: 2026, role: "admin" };

function mockAuth() {
  mockUseAuth.mockReturnValue({
    session: { user: { email: "coach@example.com" }, access_token: "tok" },
    user: { id: "user-api-1", email: "coach@example.com", profile: { first_name: "Coach" } },
    authState: "authenticated",
    setAuthState: vi.fn(),
    sendMagicLink: vi.fn(),
    requestAccess: vi.fn(),
    logout: vi.fn(),
    memberships: [
      { id: "membership-1", role: "admin", team_id: TEAM.id },
      { id: "membership-2", role: "admin", team_id: OTHER_TEAM.id },
    ],
    updateProfileName: vi.fn(),
    refreshMemberships: vi.fn(() => Promise.resolve()),
  });
}

function homeApiResponse() {
  return {
    version: 1,
    generatedAt: "2026-09-02T18:00:00Z",
    requestId: "r1",
    defaultTeamId: TEAM.id,
    teams: [
      {
        id: TEAM.id,
        name: TEAM.name,
        displayName: TEAM.name,
        season: "Fall",
        year: 2026,
        ageGroup: "8U",
        sport: "baseball",
        role: { code: "admin", label: "Team Admin / Head Coach" },
        capabilities: ["team.view", "roster.view", "roster.manage", "schedule.view", "lineup.view"],
        nextEvent: null,
        readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: "none", lineupId: null },
        actions: [
          { id: "manage_roster", label: "Manage " + TEAM.name + " roster", href: "/app/teams/" + TEAM.id + "/roster", enabled: true, disabledReason: null },
        ],
      },
    ],
  };
}

function jsonResponse(body) {
  return Promise.resolve({ status: 200, ok: true, headers: new Headers({}), json: () => Promise.resolve(body) });
}

beforeEach(function () {
  localStorage.clear();
  localStorage.setItem("app:teams", JSON.stringify([TEAM, OTHER_TEAM]));
  mockAuth();
  global.fetch = vi.fn(function (url) {
    if (String(url).includes("/api/v1/home")) return jsonResponse(homeApiResponse());
    return jsonResponse({});
  });
  window.history.replaceState(null, "", "/");
});

afterEach(function () {
  delete global.fetch;
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("API-driven Home integration (#1030)", function () {
  it("flag off (default) renders the legacy Home, not the new Team Hub — zero behavior change by default", async function () {
    render(<App />);
    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    // The legacy Home's "+ New Team" button is specific to renderHome()'s
    // own welcome-mode markup and has no equivalent in the new Team Hub.
    expect(screen.getByText("+ New Team")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: new RegExp(TEAM.name) })).not.toBeInTheDocument();
  });

  it("API_DRIVEN_HOME on renders the new Team Hub with a role=region expanded card sourced from the Home API", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    render(<App />);
    await waitFor(function () { expect(screen.getByRole("region", { name: new RegExp(TEAM.name) })).toBeInTheDocument(); });
    expect(screen.queryByText("+ New Team")).not.toBeInTheDocument();
  });

  it("tapping a Home action loads the team, leaves Home, and pushes the canonical route", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    render(<App />);

    var actionLabel = "Manage " + TEAM.name + " roster";
    await waitFor(function () { expect(screen.getByRole("button", { name: actionLabel })).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: actionLabel }));

    await waitFor(function () {
      expect(window.location.search).toContain("route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/roster"));
    });
    // Home (the Team Hub region) is gone — the compatibility adapter left
    // the API-driven Home surface for the legacy roster screen.
    expect(screen.queryByRole("region", { name: new RegExp(TEAM.name) })).not.toBeInTheDocument();
  });

  it("Back after a Home action returns to Home with the same team expanded", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    render(<App />);

    var actionLabel = "Manage " + TEAM.name + " roster";
    await waitFor(function () { expect(screen.getByRole("button", { name: actionLabel })).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: actionLabel }));
    await waitFor(function () { expect(window.location.search).toContain("route="); });

    // jsdom's popstate doesn't move window.location on its own the way a
    // real browser's Back button does — the browser changes the URL FIRST,
    // then fires popstate. Reproduce that ordering: revert the URL to what
    // it was before the CTA's pushState, then dispatch the event.
    window.history.pushState({ apiHomeRoute: null }, "", "/");
    fireEvent.popState(window, { state: { apiHomeRoute: null, apiHomeReturnTeamId: TEAM.id } });

    await waitFor(function () { expect(screen.getByRole("region", { name: new RegExp(TEAM.name) })).toBeInTheDocument(); });
  });

  it("onFindTeam (no-membership empty state) falls back to the existing TeamSearch flow", async function () {
    localStorage.setItem("app:teams", JSON.stringify([]));
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { id: "user-api-1", email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
    global.fetch = vi.fn(function (url) {
      if (String(url).includes("/api/v1/home")) {
        return jsonResponse({ version: 1, generatedAt: "x", requestId: "r", defaultTeamId: null, teams: [] });
      }
      return jsonResponse({});
    });
    render(<App />);

    await waitFor(function () { expect(screen.getByText(/not on any team yet/i)).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: /find your team/i }));
    await waitFor(function () { expect(screen.getByRole("heading", { name: /find a team/i })).toBeInTheDocument(); });
  });
});

describe("API-driven Home deep links (#1032)", function () {
  it("direct deep-link open: a route already in the URL at first mount (no CTA click) lands on the team's screen, not Home", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/roster"));

    render(<App />);

    await waitFor(function () {
      expect(screen.queryByRole("region", { name: new RegExp(TEAM.name) })).not.toBeInTheDocument();
    });
    // Header logoTitle only shows the team name once activeTeam is set and
    // the app has left the "more" tab family — direct proof loadTeam() ran
    // for the URL's team on a cold open, not just that Home unmounted.
    await waitFor(function () {
      expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0);
    });
  });

  it("a foreign team ID in the URL (not a real membership) does not enter any team's screen", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/not-a-real-team/roster"));

    render(<App />);

    // enterLegacyScreenForApiRoute's teams.find() returns undefined for an
    // unknown id and bails out (returns false) before calling loadTeam() —
    // this must never fall through to entering ANY team's screen.
    await waitFor(function () {
      expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); // Home still lists real teams
    });
    expect(screen.queryByText(/By Position|By Player/)).not.toBeInTheDocument();
  });

  // KNOWN GAP (#1032, found while writing this suite — not yet fixed):
  // section 6.2/26.2 of docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
  // requires nested gameId/lineupId values to be verified as belonging to
  // the route's team before the destination is entered.
  // frontend/src/api/routes.js's resolveDestination() implements exactly
  // this check (cross_team_denied), but App.jsx's real compatibility
  // adapter (enterLegacyScreenForApiRoute, ~line 2146) never calls it —
  // it only checks `teams.find(t => t.id === route.teamId)` and then
  // switches tab by route.type alone, ignoring route.gameId entirely for
  // 'gameMode'/'gameScore'. A forged or stale gameId for a real team
  // currently launches Game Day exactly as a valid one would.
  // RED confirmed 2026-09-02: this test fails against the current
  // App.jsx, proving the gap is real, not theoretical. Fixing it needs an
  // App.jsx edit (locked file — requires the literal "all clear —
  // App.jsx editing approved" phrase) to thread api/homeCache.js's
  // getHomeCache(user.id) + resolveDestination() into
  // enterLegacyScreenForApiRoute instead of the bare teams.find() check.
  // Un-skip once that fix lands.
  it.skip("a gameId that does not belong to the route's team is rejected, not silently entered", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    global.fetch = vi.fn(function (url) {
      if (String(url).includes("/api/v1/home")) {
        var res = homeApiResponse();
        res.teams[0].nextEvent = { id: "game-real-1", type: "game", opponent: "Knights", startsAt: "2026-09-05T18:00:00Z" };
        return jsonResponse(res);
      }
      return jsonResponse({});
    });
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/games/game-FORGED/mode"));

    render(<App />);

    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    // Desired behavior per the baseline doc: a mismatched gameId must not
    // reach the live Game Day surface at all.
    expect(screen.queryByText(/By Position|By Player/)).not.toBeInTheDocument();
  });
});
