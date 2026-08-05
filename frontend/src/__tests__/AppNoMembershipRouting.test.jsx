// D-S428b (#481) — the routing DECISION half of "NoMembershipScreen has zero
// tests". The component itself is covered in
// frontend/src/components/Auth/NoMembershipScreen.test.jsx; this file covers
// the gate-first invariant that actually decides whether a signed-in session
// with no team_memberships row ever reaches team data.
//
// That decision lives inline in App.jsx's render (not a standalone function
// like SharedView), gated on `authState` returned by the `useAuth()` hook:
//   authState === 'no_membership'  -> render <NoMembershipScreen />
//   authState === 'authenticated'  -> route straight past it to team data
//
// useAuth.js itself computes authState from `memberships`:
//   memberships.length === 0 -> 'no_membership'
//   otherwise                -> 'authenticated'
// (see frontend/src/hooks/useAuth.js checkSession()/onAuthStateChange()).
//
// We mock useAuth() directly rather than its Supabase/fetch internals — App's
// gate only ever looks at the hook's return value, and mocking at that
// boundary is what makes this test possible without also standing up
// Supabase + backend fetch mocks (which useAuth's own tests already cover
// separately, e.g. src/tests/useAuth.updateProfileName.test.js).
//
// No export change was needed to make this testable: App is already
// `export default function App()`.
//
// DOC_TEST_DEBT.md P0 (#535, Story 121) — this file previously had NO mock
// for `../supabase.js` at all, meaning App.jsx's boot-hydration effect
// (`!window._lineupDbBooted && isSupabaseEnabled`) ran against the real
// module on every render — a real live-data-mutation risk on any machine
// with a valid Supabase key in `frontend/.env` (it seeds/migrates real
// hardcoded team IDs, including a one-time patch keyed on a team literally
// named "Mud Hens" — this file's own second test even uses that team's real
// production ID, 1774297491626, as its `memberships` fixture). Fully
// self-contained mock below, no `importOriginal` spread — no code path in
// this file can reach a real client.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// App.jsx imports `virtual:pwa-register/react` — a Vite-plugin-generated
// virtual module Vitest cannot resolve outside a real build. Same mock used
// by SharedView.test.jsx.
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
    memberships: [{ role: "coach", team_id: "1774297491626" }],
    updateProfileName: vi.fn(),
  }, overrides);
}

describe("App — gate-first NoMembershipScreen routing (#481)", function () {

  it("renders NoMembershipScreen and no team-data surface when memberships is empty (authState 'no_membership')", async function () {
    mockUseAuth.mockReturnValue(baseAuth({
      authState: "no_membership",
      memberships: [],
    }));

    render(<App />);

    await waitFor(function () {
      expect(screen.getByText(/signed in, but not on a team/i)).toBeInTheDocument();
    });

    // No team-data surface reachable: no bottom-nav tabs, no roster/schedule content.
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    expect(screen.queryByText("My Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Game Day")).not.toBeInTheDocument();
    expect(screen.getByText("coach@example.com")).toBeInTheDocument();
  });

  it("routes past NoMembershipScreen entirely when memberships is non-empty (authState 'authenticated')", async function () {
    mockUseAuth.mockReturnValue(baseAuth({
      authState: "authenticated",
      memberships: [{ role: "coach", team_id: "1774297491626" }],
    }));

    render(<App />);

    // The primary tab bar (team-data surface) should be reachable, and the
    // gate-first screen must never render.
    await waitFor(function () {
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
    expect(screen.queryByText(/signed in, but not on a team/i)).not.toBeInTheDocument();
  });
});
