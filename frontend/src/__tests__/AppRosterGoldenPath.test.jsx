// #943: the Roster tab (App.jsx renderRoster, ~line 3053) had zero direct
// test coverage — the QA & Reliability Audit's #943 finding names it first
// among the untested render paths. This is a golden-path integration test
// mounting <App/> the same way AppSongsGoldenPath.test.jsx does, since the
// roster-add flow lives inline in the locked App.jsx and isn't separately
// extracted or unit-testable.
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

const TEAM = { id: "team-roster-1", name: "Roster Golden Path Sluggers", ageGroup: "10U", sport: "baseball", year: 2026 };
const ROSTER = [
  { name: "Alex Rivera", firstName: "Alex", lastName: "Rivera" },
  { name: "Blair Chen", firstName: "Blair", lastName: "Chen" },
];

describe("App Roster tab golden path (#943)", function () {

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
      memberships: [{ id: "membership-1", role: "coach", team_id: TEAM.id }],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  });

  async function openRosterTab() {
    render(<App />);

    // A single team with a matching membership auto-loads via the #376
    // reconciliation effect and lands on the Team > Roster screen directly —
    // "My Team" is the tab, "roster" is teamSubTab's default value.
    var myTeamNav = await screen.findByRole("button", { name: /My Team/ });
    fireEvent.click(myTeamNav);

    await waitFor(function () { expect(screen.getByText("Roster and Player Profiles")).toBeInTheDocument(); });
  }

  it("renders the existing roster as alphabetized player profile links", async function () {
    await openRosterTab();

    var links = screen.getAllByRole("button", { name: /Open .* player profile/ });
    expect(links.map(function(link) { return link.textContent; })).toEqual(["Alex", "Blair"]);
  });

  it("adds a new player via the Add Player form and shows them in the roster", async function () {
    await openRosterTab();

    var addButton = screen.getByRole("button", { name: /Add a New Player to Your Roster/ });
    expect(addButton.style.background).toContain("linear-gradient");
    expect(addButton).toHaveStyle({ color:"rgb(255, 255, 255)" });
    fireEvent.click(addButton);

    var firstNameInput = screen.getByPlaceholderText("First name*");
    var lastNameInput = screen.getByPlaceholderText("Last name*");
    fireEvent.change(firstNameInput, { target: { value: "jamie" } });
    fireEvent.change(lastNameInput, { target: { value: "fox" } });

    var confirmAdd = screen.getByRole("button", { name: "Add" });
    fireEvent.click(confirmAdd);

    // addPlayer() title-cases both names and adds a profile link to the summary.
    await waitFor(function () {
      expect(screen.getByRole("button", { name: "Open Jamie Fox player profile" })).toHaveTextContent("Jamie");
    });

    // The add form closes back to the "+ Add a New Player" button after a
    // successful add — confirms the form doesn't stay open silently broken.
    expect(screen.getByRole("button", { name: /Add a New Player to Your Roster/ })).toBeInTheDocument();
  });

  it("does not add a player when the first or last name is blank", async function () {
    await openRosterTab();

    fireEvent.click(screen.getByRole("button", { name: /Add a New Player to Your Roster/ }));
    fireEvent.change(screen.getByPlaceholderText("First name*"), { target: { value: "OnlyFirst" } });
    // Last name left blank.
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    // addPlayer() returns early when either name is blank — the form must
    // still be open (add was silently rejected, not silently "succeeded").
    expect(screen.getByPlaceholderText("First name*")).toBeInTheDocument();
    expect(screen.queryByText("OnlyFirst")).not.toBeInTheDocument();
  });
});
