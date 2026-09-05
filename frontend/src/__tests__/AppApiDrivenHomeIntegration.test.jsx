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
import { setHomeCache } from "../api/homeCache.js";
import { track } from "../utils/analytics";

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
  track.mockClear();
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
    expect(track).toHaveBeenCalledWith("home_deep_link_resolved", { destination_type: "roster", team_id: TEAM.id });
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
    expect(track).toHaveBeenCalledWith("home_deep_link_denied", { destination_type: "roster", reason: "team_access_denied" });
  });

  // Found on a real device (2026-09-03): a team present in this device's
  // local `app:teams` cache (e.g. loaded under a different identity in an
  // earlier session on the same browser) but ABSENT from the current
  // user's authoritative Home API response must never be entered.
  // enterLegacyScreenForApiRoute() previously authorized team-level routes
  // (roster/schedule/team/lineups — anything without a gameId/lineupId)
  // using only `teams.find()` against this local cache, never checking the
  // real Home response at all for that case — a direct violation of
  // section 17's "cached team identity never authorizes a destination."
  // Confirmed live: an admin-only-on-Mud-Hens identity reached the
  // Bananas roster screen (full write surface, not just a read) by
  // pasting a route= URL, because Bananas was still in the device's local
  // team cache from a different identity's prior session.
  it("a team present in the device's local team cache but absent from the authoritative Home response is denied, not silently entered", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    // OTHER_TEAM is in the device's local `app:teams` cache (see
    // beforeEach) but deliberately NOT in the Home API response below —
    // reproducing a stale/cross-identity local cache on a real device.
    setHomeCache("user-api-1", homeApiResponse());
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + OTHER_TEAM.id + "/roster"));

    render(<App />);

    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    expect(screen.queryByText(OTHER_TEAM.name)).not.toBeInTheDocument();
    expect(screen.queryByText(/By Position|By Player/)).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("home_deep_link_denied", { destination_type: "roster", reason: "team_access_denied" });
  });

  // Fixed same session (was a documented gap, RED-confirmed before the
  // fix landed): App.jsx's enterLegacyScreenForApiRoute now verifies
  // route.gameId/route.lineupId against the last-cached Home response
  // (api/homeCache.js) via api/routes.js's resolveDestination(), instead
  // of only checking team-level membership via teams.find(). Section
  // 6.2/26.2 of the baseline doc requires nested-resource ownership to be
  // verified, not assumed from team membership alone.

  it("a cold restore with no cached Home response yet does not enter an unverifiable game route (fail-safe, not a guess)", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/games/game-real-1/mode"));

    render(<App />);

    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    // No prior setHomeCache() call in this test — genuinely no cache to
    // verify against, distinct from the mismatch case below.
    expect(screen.queryByText(/By Position|By Player/)).not.toBeInTheDocument();
  });

  it("a cached Home response proves a URL gameId is real for that team's actual next event — restored route is allowed through", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    var res = homeApiResponse();
    res.teams[0].nextEvent = { id: "game-real-1", type: "game", opponent: "Knights", startsAt: "2026-09-05T18:00:00Z" };
    setHomeCache("user-api-1", res);
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/games/game-real-1/mode"));

    render(<App />);

    await waitFor(function () { expect(screen.getByText(/By Position|By Player/)).toBeInTheDocument(); });
  });

  it("a cached Home response proves a URL gameId is fake (real nextEvent has a different id) — restored route is rejected, not silently entered", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    var res = homeApiResponse();
    res.teams[0].nextEvent = { id: "game-real-1", type: "game", opponent: "Knights", startsAt: "2026-09-05T18:00:00Z" };
    setHomeCache("user-api-1", res);
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/games/game-FORGED/mode"));

    render(<App />);

    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    // This is the genuine cross_team_denied path — a real cache proving a
    // real mismatch, not just an absent cache. Desired behavior per the
    // baseline doc: a mismatched gameId must not reach Game Day.
    expect(screen.queryByText(/By Position|By Player/)).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("home_deep_link_denied", { destination_type: "gameMode", reason: "cross_team_denied" });
  });

  it("a lineup route with an ID never enters — no addressable per-game lineup resource exists in the live schema yet", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/lineups/some-lineup-id"));

    render(<App />);

    await waitFor(function () { expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0); });
    expect(screen.queryByText("Print / Share View")).not.toBeInTheDocument();
  });

  it("a lineups LIST route (no ID) is unaffected by the lineupId check and still resolves normally", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/lineups"));

    render(<App />);

    await waitFor(function () { expect(screen.getByText("Print / Share View")).toBeInTheDocument(); });
  });
});

describe("API-driven Home pending-destination resume (#1032)", function () {
  function mockUnauthenticated() {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      authState: "unauthenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  }

  // Fixed same session, second gap found while writing #1032's deep-link
  // suite: savePendingDestination/consumePendingDestination (built in
  // #1027) were never called anywhere in App.jsx. A coach who opens a
  // deep link while logged out, then completes auth on a landing URL
  // that no longer carries `route=` (a real possibility for an OAuth
  // callback), previously had no way to resume — the restore effect only
  // ever re-read the live URL. RED confirmed before the fix (this test
  // failed, landing on Home instead of the roster screen) by reverting
  // just the App.jsx effect change and rerunning.
  it("a deep link opened while logged out resumes after auth completes on a URL that lost its route param", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    mockUnauthenticated();
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/roster"));

    var view = render(<App />);
    // Sessionstorage save happens in the effect keyed on authState —
    // give it a tick before simulating the auth round trip.
    await waitFor(function () {
      expect(window.sessionStorage.getItem("api:pendingDestination")).not.toBeNull();
    });

    // Simulate the actual auth redirect: the landing URL is bare, exactly
    // like an OAuth callback that doesn't echo the original query string.
    window.history.replaceState(null, "", "/");
    mockAuth();
    view.rerender(<App />);

    await waitFor(function () {
      expect(screen.queryByRole("region", { name: new RegExp(TEAM.name) })).not.toBeInTheDocument();
    });
    await waitFor(function () {
      expect(screen.getAllByText(TEAM.name).length).toBeGreaterThan(0);
    });
    // The resumed destination is written back to the URL so a later
    // refresh/Back/Forward sees the same canonical route.
    expect(window.location.search).toContain("route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/roster"));
  });

  it("does not honor a pending team destination when a different user completes authentication", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    mockUnauthenticated();
    window.history.replaceState(null, "", "/?route=" + encodeURIComponent("/app/teams/" + TEAM.id + "/roster"));

    var view = render(<App />);
    await waitFor(function () {
      expect(window.sessionStorage.getItem("api:pendingDestination")).not.toBeNull();
    });

    window.history.replaceState(null, "", "/");
    mockUseAuth.mockReturnValue({
      session: { user: { email: "other@example.com" }, access_token: "other-tok" },
      user: { id: "user-api-2", email: "other@example.com", profile: { first_name: "Other" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [{ id: "membership-other", role: "admin", team_id: OTHER_TEAM.id }],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
    view.rerender(<App />);

    await waitFor(function () {
      expect(window.sessionStorage.getItem("api:pendingDestination")).toBeNull();
    });
    expect(window.location.search).not.toContain("route=");
    expect(track).toHaveBeenCalledWith("home_deep_link_denied", {
      destination_type: "roster",
      reason: "team_access_denied",
    });
  });

  it("with no pending destination stashed, authenticating with a route-less URL just shows Home (no false resume)", async function () {
    localStorage.setItem("flag_API_DRIVEN_HOME", "true");
    localStorage.setItem("flag_API_DRIVEN_ROUTES", "true");
    window.history.replaceState(null, "", "/");

    render(<App />);

    await waitFor(function () { expect(screen.getByRole("region", { name: new RegExp(TEAM.name) })).toBeInTheDocument(); });
  });
});
