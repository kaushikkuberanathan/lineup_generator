// Story 127 (#666) — the Home team card's "···" menu (Edit/Delete team)
// previously rendered unconditionally for every role, including viewer. Only
// Edit and Delete are admin-gated; Download backup stays available to every
// role (a read-only local export, not a mutation). Supabase is fully mocked
// so this render cannot reach live data.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

const TEAM = { id: "team-1", name: "Role Gate Rockets", ageGroup: "8U", sport: "baseball", year: 2026 };
// A second membership-backed team, purely so App.jsx's single-membership
// auto-select (memberships.length === 1 → jump straight into that team's
// dashboard) doesn't fire and bypass the Home team-list view this test needs.
const OTHER_TEAM = { id: "team-2", name: "Other Otters", ageGroup: "10U", sport: "baseball", year: 2026 };

function mockAuthWithRole(role) {
  mockUseAuth.mockReturnValue({
    session: { user: { email: "coach@example.com" }, access_token: "tok" },
    user: { email: "coach@example.com", profile: { first_name: "Coach" } },
    authState: "authenticated",
    setAuthState: vi.fn(),
    sendMagicLink: vi.fn(),
    requestAccess: vi.fn(),
    logout: vi.fn(),
    memberships: [
      { id: "membership-1", role: role, team_id: TEAM.id },
      { id: "membership-2", role: "admin", team_id: OTHER_TEAM.id },
    ],
    updateProfileName: vi.fn(),
    refreshMemberships: vi.fn(() => Promise.resolve()),
  });
}

// Finds TEAM's own card (not OTHER_TEAM's) by walking up from the team-name
// node until an ancestor also contains a "···" button, then clicking that
// scoped button — order-independent of how the two cards are sorted.
async function openTeamCardMenu() {
  render(<App />);
  const [nameNode] = await screen.findAllByText(TEAM.name);
  let card = nameNode.parentElement;
  while (card && within(card).queryByText("···") === null) {
    card = card.parentElement;
  }
  expect(card).not.toBeNull();
  fireEvent.click(within(card).getByText("···"));
  await waitFor(function () {
    expect(within(card).getByText("⬇ Download backup")).toBeInTheDocument();
  });
  return card;
}

describe("Home team card '···' menu — role-gated (#666)", function () {
  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM, OTHER_TEAM]));
  });

  it("admin sees Edit team and Delete team", async function () {
    mockAuthWithRole("admin");
    const card = await openTeamCardMenu();

    expect(within(card).getByText("✏ Edit team")).toBeInTheDocument();
    expect(within(card).getByText("🗑 Delete team")).toBeInTheDocument();
  });

  it("viewer does not see Edit team or Delete team, but keeps Download backup", async function () {
    mockAuthWithRole("viewer");
    const card = await openTeamCardMenu();

    expect(within(card).queryByText("✏ Edit team")).not.toBeInTheDocument();
    expect(within(card).queryByText("🗑 Delete team")).not.toBeInTheDocument();
    expect(within(card).getByText("⬇ Download backup")).toBeInTheDocument();
  });

  it("coach (non-admin) does not see Edit team or Delete team", async function () {
    mockAuthWithRole("coach");
    const card = await openTeamCardMenu();

    expect(within(card).queryByText("✏ Edit team")).not.toBeInTheDocument();
    expect(within(card).queryByText("🗑 Delete team")).not.toBeInTheDocument();
  });
});
