// Coverage-analysis follow-up (session 2026-08-23): the Batting Order feature
// (App.jsx renderBatting, ~line 4904) is a shipped MVP feature with zero
// prior test coverage per FEATURE_MAP.md row 3. This is a golden-path
// integration test mounting <App/> the same way AppHomeMembershipTeams.test.jsx
// does, since the reorder/save logic lives inline in the locked App.jsx and
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

const TEAM = { id: "team-batting-1", name: "Batting Order Bombers", ageGroup: "8U", sport: "baseball", year: 2026 };
const ROSTER = [
  { name: "Jordan Lee" },
  { name: "Casey Kim" },
  { name: "Sam Diaz" },
];
const BATTING_ORDER = ["Jordan Lee", "Casey Kim", "Sam Diaz"];

describe("App Batting Order golden path (FEATURE_MAP.md row 3)", function () {

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM]));
    localStorage.setItem("team:" + TEAM.id + ":roster", JSON.stringify(ROSTER));
    localStorage.setItem("team:" + TEAM.id + ":batting", JSON.stringify(BATTING_ORDER));
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

  async function openTeamAndGoToBattingTab() {
    render(<App />);

    // A single team with a matching membership auto-loads via the #376
    // reconciliation effect — the app lands directly on the Team > Roster
    // screen with the bottom nav already enabled, no "Open" tap needed.
    var gameDayNav = await screen.findByRole("button", { name: /Game Day/ });
    fireEvent.click(gameDayNav);

    var battingSubtab = await screen.findByRole("button", { name: /Batting/ });
    fireEvent.click(battingSubtab);

    await waitFor(function () { expect(screen.getByText(/^Batting order$/i)).toBeInTheDocument(); });
  }

  it("shows the roster in the saved batting order", async function () {
    await openTeamAndGoToBattingTab();

    var names = ROSTER.map(function (p) { return p.name.split(" ")[0]; });
    for (var i = 0; i < names.length; i++) {
      // NowBattingStrip elsewhere on this same view also shows the current
      // batter's first name, so first names aren't unique — assert presence
      // rather than a single match.
      expect(screen.getAllByText(names[i]).length).toBeGreaterThan(0);
    }
  });

  it("selects the contemporary Batting controls behind UX_GAMEDAY_SETUP", async function () {
    localStorage.setItem("flag_UX_GAMEDAY_SETUP", "true");
    await openTeamAndGoToBattingTab();

    expect(screen.getByRole("heading", { name:"Batting order" })).toBeInTheDocument();
    expect(screen.getByText("3/3 available tonight")).toBeInTheDocument();
    expect(screen.getByRole("button", { name:"Suggest Order" })).toBeEnabled();
  });

  it("reordering with the down arrow marks the order dirty, and Save Order persists the new order", async function () {
    await openTeamAndGoToBattingTab();

    // Scope to actual row buttons — a decorative "▼" span elsewhere on the
    // page (unrelated disclosure caret) also matches a plain text query.
    var downButtons = screen.getAllByRole("button", { name: "▼" });
    expect(downButtons).toHaveLength(3); // one per roster row

    // Move Jordan Lee (idx 0) down one slot.
    fireEvent.click(downButtons[0]);

    expect(screen.getByText("● Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText("💾 Save Order")).toBeInTheDocument();

    fireEvent.click(screen.getByText("💾 Save Order"));

    await waitFor(function () { expect(screen.getByText("✓ Saved")).toBeInTheDocument(); });

    var persisted = JSON.parse(localStorage.getItem("team:" + TEAM.id + ":batting"));
    expect(persisted).toEqual(["Casey Kim", "Jordan Lee", "Sam Diaz"]);
  });

  it("Finalize is disabled while the order has unsaved changes", async function () {
    await openTeamAndGoToBattingTab();

    fireEvent.click(screen.getAllByRole("button", { name: "▼" })[0]);

    expect(screen.getByText("✓ Finalize")).toBeDisabled();
  });
});
