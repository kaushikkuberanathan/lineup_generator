// Coverage-analysis follow-up (session 2026-08-23): RestoreScoreModal.jsx
// (frontend/src/components/ScoringMode/) rebuilds live game state from the
// audit log via a Supabase RPC — a data-integrity-critical action with no
// prior test coverage. This test file lives outside components/ScoringMode/
// deliberately — that directory is a CLAUDE.md "Locked File" path requiring
// a gate phrase to edit; importing a component from it for a new, separate
// test file isn't editing it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

var mockEq3;
var mockRpc;

vi.mock("../supabase.js", function () {
  return {
    supabase: {
      from: vi.fn(function () {
        var chain = {
          select: vi.fn(function () { return chain; }),
          eq: vi.fn(function () { return chain; }),
          then: function (resolve) { return mockEq3().then(resolve); },
        };
        return chain;
      }),
      rpc: vi.fn(function (name, params) { return mockRpc(name, params); }),
    },
  };
});

import RestoreScoreModal from "../components/ScoringMode/RestoreScoreModal";

function baseProps(overrides) {
  return Object.assign({
    isOpen: true,
    gameId: "game-1",
    teamId: "team-1",
    userId: "user-1",
    userName: "Coach K",
    onClose: vi.fn(),
  }, overrides);
}

describe("RestoreScoreModal", function () {

  beforeEach(function () {
    vi.clearAllMocks();
    mockEq3 = vi.fn(function () { return Promise.resolve({ count: 12 }); });
    mockRpc = vi.fn(function () { return Promise.resolve({ error: null }); });
  });

  it("renders nothing when isOpen is false", function () {
    var { container } = render(<RestoreScoreModal {...baseProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the at-bat count once the audit-log query resolves, and enables Restore", async function () {
    render(<RestoreScoreModal {...baseProps()} />);

    expect(screen.getByText("Checking scorebook…")).toBeInTheDocument();

    await waitFor(function () {
      expect(screen.getByText("12")).toBeInTheDocument();
    });
    expect(screen.getByText(/at-bats recorded/)).toBeInTheDocument();
    expect(screen.getByText("Restore from Scorebook")).not.toBeDisabled();
  });

  it("disables Restore when there is no scorebook data", async function () {
    mockEq3 = vi.fn(function () { return Promise.resolve({ count: 0 }); });
    render(<RestoreScoreModal {...baseProps()} />);

    await waitFor(function () {
      expect(screen.getByText("No scorebook data found")).toBeInTheDocument();
    });
    expect(screen.getByText("Restore from Scorebook")).toBeDisabled();
  });

  it("requires a second confirming tap before calling the restore RPC", async function () {
    render(<RestoreScoreModal {...baseProps()} />);
    await waitFor(function () { expect(screen.getByText("12")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Restore from Scorebook"));
    expect(mockRpc).not.toHaveBeenCalled();
    expect(screen.getByText("Tap again to confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Tap again to confirm"));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("restore_game_state", {
      p_game_id: "game-1",
      p_team_id: "team-1",
      p_actor_id: "user-1",
      p_actor_name: "Coach K",
    });
  });

  it("a local (unauthenticated) userId is not sent as p_actor_id", async function () {
    render(<RestoreScoreModal {...baseProps({ userId: "local-abc123" })} />);
    await waitFor(function () { expect(screen.getByText("12")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Restore from Scorebook"));
    fireEvent.click(screen.getByText("Tap again to confirm"));

    expect(mockRpc).toHaveBeenCalledWith("restore_game_state", expect.objectContaining({
      p_actor_id: null,
    }));
  });

  it("shows a success message and auto-closes after a successful restore", async function () {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    var onClose = vi.fn();
    render(<RestoreScoreModal {...baseProps({ onClose: onClose })} />);
    await vi.waitFor(function () { expect(screen.getByText("12")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Restore from Scorebook"));
    fireEvent.click(screen.getByText("Tap again to confirm"));

    await vi.waitFor(function () { expect(screen.getByText("✓ Score restored successfully")).toBeInTheDocument(); });

    await vi.advanceTimersByTimeAsync(2000);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("a failed restore shows the error and resets the confirm state instead of closing", async function () {
    mockRpc = vi.fn(function () { return Promise.resolve({ error: { message: "RPC exploded" } }); });
    render(<RestoreScoreModal {...baseProps()} />);
    await waitFor(function () { expect(screen.getByText("12")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Restore from Scorebook"));
    fireEvent.click(screen.getByText("Tap again to confirm"));

    await waitFor(function () {
      expect(screen.getByText("RPC exploded")).toBeInTheDocument();
    });
    // confirmTap reset — button reads its un-confirmed label again
    expect(screen.getByText("Restore from Scorebook")).toBeInTheDocument();
  });

  it("Cancel and the X button both call onClose without touching the RPC", async function () {
    var onClose = vi.fn();
    render(<RestoreScoreModal {...baseProps({ onClose: onClose })} />);
    await waitFor(function () { expect(screen.getByText("12")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
