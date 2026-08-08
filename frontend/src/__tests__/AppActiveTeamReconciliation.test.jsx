// #376 — activeTeamId (App.jsx ~1406-1407) is initialized purely from
// loadJSON("ui:activeTeam", null) at mount and never reconciled against the
// authenticated user's real memberships array from useAuth(). The only two
// setActiveTeamId call sites (loadTeam() from the Account tab picker, and a
// null-out on delete-team) are both manual — no effect watches
// authState/memberships to correct activeTeamId on login.
//
// This reproduces the exact repro: a stale/mismatched activeTeamId already
// sitting in localStorage (e.g. from a prior device/session, or none at all)
// plus a real single membership whose team is already present in the local
// `app:teams` cache (as would happen via dbLoadTeams() on boot) — the app
// should auto-select that team via the existing loadTeam() path instead of
// leaving the stale id in place. Zero-membership routing (#394,
// authState === 'no_membership') is untouched and out of scope here — see
// AppNoMembershipRouting.test.jsx for that gate.
//
// Same mocking convention as AppNoMembershipRouting.test.jsx: useAuth is
// mocked directly at the hook boundary, and ../supabase.js gets a fully
// self-contained mock (no `importOriginal` spread) so no code path here can
// reach a real Supabase client — see DOC_TEST_DEBT.md P0 (#535, Story 121)
// for why a partial mock is a live-data-mutation risk, not just a style
// preference.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

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

// loadTeam() (App.jsx) calls mixpanel.identify()/alias()/people.set() directly
// against the real mixpanel-browser client, which throws in jsdom when never
// initialized (no other App-level test exercises loadTeam() via a render, so
// this gap was never hit before). Mocked here, not as a broader test-suite
// change - out of scope for #376's fix itself.
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

function baseAuth(overrides) {
  return Object.assign({
    session: { user: { email: "coach@example.com" }, access_token: "tok" },
    user: { email: "coach@example.com", profile: { first_name: "Coach" } },
    authState: "authenticated",
    setAuthState: vi.fn(),
    sendMagicLink: vi.fn(),
    requestAccess: vi.fn(),
    logout: vi.fn(),
    memberships: [{ role: "coach", team_id: "9000000000002" }],
    updateProfileName: vi.fn(),
  }, overrides);
}

const REAL_TEAM = { id: "9000000000002", name: "Real Team", ageGroup: "10U", sport: "baseball" };
const OTHER_TEAM = { id: "9000000000003", name: "Other Team", ageGroup: "12U", sport: "baseball" };

describe("App — activeTeamId reconciliation against real memberships (#376)", function () {
  beforeEach(function () {
    localStorage.clear();
  });

  it("auto-selects the user's single real membership when the stored activeTeamId doesn't match it", async function () {
    localStorage.setItem("ui:activeTeam", JSON.stringify("stale-team-id-not-in-memberships"));
    localStorage.setItem("app:teams", JSON.stringify([REAL_TEAM]));

    mockUseAuth.mockReturnValue(baseAuth({
      authState: "authenticated",
      memberships: [{ role: "coach", team_id: REAL_TEAM.id }],
    }));

    render(<App />);

    await waitFor(function () {
      expect(JSON.parse(localStorage.getItem("ui:activeTeam"))).toBe(REAL_TEAM.id);
    });
  });

  it("leaves activeTeamId untouched when it already matches a real membership", async function () {
    localStorage.setItem("ui:activeTeam", JSON.stringify(REAL_TEAM.id));
    localStorage.setItem("app:teams", JSON.stringify([REAL_TEAM]));

    mockUseAuth.mockReturnValue(baseAuth({
      authState: "authenticated",
      memberships: [{ role: "coach", team_id: REAL_TEAM.id }],
    }));

    render(<App />);

    await waitFor(function () {
      expect(JSON.parse(localStorage.getItem("ui:activeTeam"))).toBe(REAL_TEAM.id);
    });
  });

  it("does not auto-select when the user has more than one membership, leaving it to the Account-tab picker", function () {
    localStorage.setItem("ui:activeTeam", JSON.stringify("stale-team-id-not-in-memberships"));
    localStorage.setItem("app:teams", JSON.stringify([REAL_TEAM, OTHER_TEAM]));

    mockUseAuth.mockReturnValue(baseAuth({
      authState: "authenticated",
      memberships: [
        { role: "coach", team_id: REAL_TEAM.id },
        { role: "parent", team_id: OTHER_TEAM.id },
      ],
    }));

    render(<App />);

    expect(JSON.parse(localStorage.getItem("ui:activeTeam"))).toBe("stale-team-id-not-in-memberships");
  });
});
