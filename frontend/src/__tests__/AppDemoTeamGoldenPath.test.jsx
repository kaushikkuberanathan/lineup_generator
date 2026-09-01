// #969 — loadDemoTeam() (App.jsx ~line 2107) had zero automated coverage of
// its own orchestration: fresh seeding from data/demoSeed.js, the
// demoSeedVersion upgrade path, and the dedup guard. This mounts <App/> the
// same way AppHomeMembershipTeams.test.jsx / AppBattingOrderGoldenPath.test.jsx
// do, since loadDemoTeam is an inline closure in the locked App.jsx and isn't
// separately extracted or unit-testable.
//
// Real-code finding (verified empirically by this file, not just by reading):
// the "Try Demo Team" button (App.jsx ~line 2926) is hidden whenever ANY team
// named "Demo All-Stars" already exists in `teams`, matched by name only —
// not gated on demoSeedVersion. loadDemoTeam()'s own existingDemo lookup
// (line 2109) reads that exact same `teams` state, so whenever the button is
// visible, existingDemo is guaranteed falsy (fresh-create branch), and
// whenever a demo team already exists (old OR current version), the button
// is absent and the function can't be invoked via any click. That makes the
// version-comparison/cleanup branch (lines 2111-2116) currently unreachable
// through the UI as wired today — Test 2 and Test 3 below document this
// directly against a real render rather than asserting the issue's original
// (UI-unreachable) upgrade-path assumption.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

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
import {
  DEMO_ROSTER,
  DEMO_SCHEDULE,
  DEMO_GRID,
  DEMO_INNINGS,
  DEMO_AGE_GROUP,
  DEMO_SEED_VERSION,
} from "../data/demoSeed";

function readTeams() {
  return JSON.parse(localStorage.getItem("app:teams") || "[]");
}
function demoTeams() {
  return readTeams().filter(function (t) { return t.name === "Demo All-Stars"; });
}

describe("App demo team golden path (#969)", function () {
  beforeEach(function () {
    localStorage.clear();
    // memberships: [] deliberately keeps App on the Home "welcome" screen —
    // the #376 reconciliation effect only auto-navigates away when exactly
    // one membership exists, which would skip past the Try Demo Team button
    // entirely (see AppBattingOrderGoldenPath.test.jsx for that other case).
    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  });

  it("fresh creation: seeds a new demo team matching DEMO_ROSTER/DEMO_SCHEDULE at the current seed version", async function () {
    localStorage.setItem("app:teams", JSON.stringify([]));
    render(<App />);

    var tryDemoButton = await screen.findByRole("button", { name: "Try Demo Team" });
    fireEvent.click(tryDemoButton);

    var created = demoTeams();
    expect(created).toHaveLength(1);
    var demo = created[0];
    expect(demo.demoSeedVersion).toBe(DEMO_SEED_VERSION);
    expect(demo.ageGroup).toBe(DEMO_AGE_GROUP);
    expect(demo.sport).toBe("baseball");

    var roster = JSON.parse(localStorage.getItem("team:" + demo.id + ":roster"));
    var schedule = JSON.parse(localStorage.getItem("team:" + demo.id + ":schedule"));
    var grid = JSON.parse(localStorage.getItem("team:" + demo.id + ":grid"));
    var innings = JSON.parse(localStorage.getItem("team:" + demo.id + ":innings"));
    var batting = JSON.parse(localStorage.getItem("team:" + demo.id + ":batting"));
    var locked = JSON.parse(localStorage.getItem("team:" + demo.id + ":locked"));

    expect(roster).toHaveLength(DEMO_ROSTER.length);
    expect(schedule).toHaveLength(DEMO_SCHEDULE.length);
    expect(Object.keys(grid)).toHaveLength(Object.keys(DEMO_GRID).length);
    expect(innings).toBe(DEMO_INNINGS);
    expect(batting).toHaveLength(DEMO_ROSTER.length);
    expect(batting).toEqual(DEMO_ROSTER.map(function (p) { return p.name; }));
    expect(locked).toBe(false);
  });

  it("does not duplicate an existing demo team already at the current seed version (dedup guard)", async function () {
    var existing = {
      id: "demo_existing_current",
      name: "Demo All-Stars",
      ageGroup: DEMO_AGE_GROUP,
      sport: "baseball",
      season: "Spring",
      year: 2026,
      demoSeedVersion: DEMO_SEED_VERSION,
    };
    localStorage.setItem("app:teams", JSON.stringify([existing]));
    localStorage.setItem("team:" + existing.id + ":roster", JSON.stringify(DEMO_ROSTER));
    localStorage.setItem("team:" + existing.id + ":schedule", JSON.stringify(DEMO_SCHEDULE));

    render(<App />);
    await screen.findByText("Find your team…");

    // The dedup guard is the button never appearing at all — there is no
    // control left to click that could create a second demo team.
    expect(screen.queryByRole("button", { name: "Try Demo Team" })).not.toBeInTheDocument();
    expect(demoTeams()).toHaveLength(1);
    expect(demoTeams()[0].id).toBe(existing.id);
    expect(demoTeams()[0].demoSeedVersion).toBe(DEMO_SEED_VERSION);
  });

  it("leaves an existing OLDER-version demo team untouched — Try Demo Team is hidden regardless of demoSeedVersion, so the version-upgrade branch is unreachable via the UI today", async function () {
    var oldDemo = {
      id: "demo_old_version",
      name: "Demo All-Stars",
      ageGroup: DEMO_AGE_GROUP,
      sport: "baseball",
      season: "Spring",
      year: 2025,
      demoSeedVersion: DEMO_SEED_VERSION - 1,
    };
    localStorage.setItem("app:teams", JSON.stringify([oldDemo]));
    localStorage.setItem("team:" + oldDemo.id + ":roster", JSON.stringify([{ name: "Old Demo Player" }]));
    localStorage.setItem("team:" + oldDemo.id + ":schedule", JSON.stringify([{ id: "old-g1" }]));

    render(<App />);
    await screen.findByText("Find your team…");

    expect(screen.queryByRole("button", { name: "Try Demo Team" })).not.toBeInTheDocument();

    // No duplicate was created and the old team's per-team keys were never
    // touched (loadDemoTeam's old-key cleanup at App.jsx:2114 never ran,
    // because it's only reached from inside a click that can't happen here).
    expect(demoTeams()).toHaveLength(1);
    expect(demoTeams()[0].id).toBe(oldDemo.id);
    expect(demoTeams()[0].demoSeedVersion).toBe(DEMO_SEED_VERSION - 1);
    expect(JSON.parse(localStorage.getItem("team:" + oldDemo.id + ":roster")))
      .toEqual([{ name: "Old Demo Player" }]);
  });
});
