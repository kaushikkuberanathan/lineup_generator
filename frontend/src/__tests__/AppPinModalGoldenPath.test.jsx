// #943: the coach PIN modal (App.jsx renderPinModal, ~line 6868) had zero
// direct test coverage — the QA & Reliability Audit's #943 finding names it
// among the untested render paths (it's part of the "always-present chrome"
// per frontend/CLAUDE.md's Frontend Structure section, not tab-dispatched).
// This is a golden-path integration test mounting <App/> the same way
// AppSongsGoldenPath.test.jsx does, since the PIN flow lives inline in the
// locked App.jsx and isn't separately extracted or unit-testable. Covers the
// "unlock" flow only (wrong PIN vs. correct PIN) — the other five pinModal
// modes (finalize/setup/change1/change2/remove) share the same render/submit
// path and are not separately re-verified here.
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

const TEAM = { id: "team-pin-1", name: "PIN Golden Path Sluggers", ageGroup: "12U", sport: "baseball", year: 2026 };
const ROSTER = [{ name: "Alex Rivera", firstName: "Alex", lastName: "Rivera" }];
const COACH_PIN = "4271";

describe("App coach-PIN unlock golden path (#943)", function () {

  beforeEach(function () {
    localStorage.clear();
    localStorage.setItem("app:teams", JSON.stringify([TEAM]));
    localStorage.setItem("team:" + TEAM.id + ":roster", JSON.stringify(ROSTER));
    localStorage.setItem("team:" + TEAM.id + ":batting", JSON.stringify(ROSTER.map(function (p) { return p.name; })));
    localStorage.setItem("team:" + TEAM.id + ":schedule", JSON.stringify([]));
    // loadTeam() hydrates lineupLocked/coachPin from these two keys on the
    // #376 single-team auto-reconciliation load — see root CLAUDE.md's
    // Roster identity note and App.jsx's own loadTeam() for the read shape.
    localStorage.setItem("team:" + TEAM.id + ":locked", JSON.stringify(true));
    localStorage.setItem("team:" + TEAM.id + ":pin", JSON.stringify(COACH_PIN));

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

  async function openFinalizedLineupAndClickUnlock() {
    render(<App />);

    var gameDayNav = await screen.findByRole("button", { name: /Game Day/ });
    fireEvent.click(gameDayNav);

    await waitFor(function () { expect(screen.getByText("Lineup Finalized")).toBeInTheDocument(); });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(function () { expect(screen.getByText(/Unlock Lineup/)).toBeInTheDocument(); });
  }

  it("rejects the wrong PIN with an inline error and keeps the lineup locked", async function () {
    await openFinalizedLineupAndClickUnlock();

    var pinInput = screen.getByPlaceholderText("· · · ·");
    fireEvent.change(pinInput, { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(function () { expect(screen.getByText("Incorrect PIN.")).toBeInTheDocument(); });
    // Modal must still be open — a wrong PIN does not close it.
    expect(screen.getByPlaceholderText("· · · ·")).toBeInTheDocument();
  });

  it("accepts the correct PIN, closes the modal, and unlocks the lineup", async function () {
    await openFinalizedLineupAndClickUnlock();

    var pinInput = screen.getByPlaceholderText("· · · ·");
    fireEvent.change(pinInput, { target: { value: COACH_PIN } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(function () { expect(screen.queryByText(/Unlock Lineup/)).not.toBeInTheDocument(); });
    // persistLineupLocked(false) removes the "Lineup Finalized" banner.
    expect(screen.queryByText("Lineup Finalized")).not.toBeInTheDocument();
  });

  it("closing via the backdrop cancels without submitting or clearing the PIN state", async function () {
    await openFinalizedLineupAndClickUnlock();

    fireEvent.change(screen.getByPlaceholderText("· · · ·"), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(function () { expect(screen.queryByText(/Unlock Lineup/)).not.toBeInTheDocument(); });
    // Cancel must not unlock the lineup — the banner is still there.
    expect(screen.getByText("Lineup Finalized")).toBeInTheDocument();
  });
});
