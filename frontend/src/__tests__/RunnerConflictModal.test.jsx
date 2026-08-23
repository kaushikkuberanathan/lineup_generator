// Coverage-analysis follow-up (session 2026-08-23): RunnerConflictModal.jsx
// (frontend/src/components/ScoringMode/) is the coach-facing prompt for
// resolving a base-collision during live scoring — a correctness-critical
// decision point with no prior test coverage. This test file lives outside
// components/ScoringMode/ deliberately — that directory is a CLAUDE.md
// "Locked File" path requiring a gate phrase to edit; importing a
// component from it for a new, separate test file isn't editing it.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RunnerConflictModal from "../components/ScoringMode/RunnerConflictModal";

var BATTING_ORDER = [
  { id: "p1", name: "Jordan Lee" },
  { id: "p2", name: "Casey Kim" },
];

function baseProps(overrides) {
  return Object.assign({
    conflict: {
      targetBase: 2,
      incomingRunnerId: "p1",
      blockingRunnerId: "p2",
    },
    onResolve: vi.fn(),
    battingOrder: BATTING_ORDER,
  }, overrides);
}

describe("RunnerConflictModal", function () {

  it("renders nothing when there is no conflict", function () {
    var { container } = render(<RunnerConflictModal {...baseProps({ conflict: null })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders as an assertive dialog naming the target base", function () {
    render(<RunnerConflictModal {...baseProps()} />);
    var dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-live", "assertive");
    expect(dialog).toHaveAttribute("aria-label", "Runner conflict at 2B");
  });

  it("names both the blocking runner and the incoming runner by first name", function () {
    render(<RunnerConflictModal {...baseProps()} />);
    expect(screen.getByText("Casey is on 2B.")).toBeInTheDocument();
    expect(screen.getByText(/Jordan is also advancing to 2B/)).toBeInTheDocument();
  });

  it("falls back to \"?\" for a runner id not found in battingOrder", function () {
    render(<RunnerConflictModal {...baseProps({
      conflict: { targetBase: 3, incomingRunnerId: "ghost", blockingRunnerId: "p2" },
    })} />);
    expect(screen.getByText(/\? is also advancing to 3B/)).toBeInTheDocument();
  });

  it("labels 1st, 2nd, and 3rd base correctly", function () {
    var { rerender } = render(<RunnerConflictModal {...baseProps({
      conflict: { targetBase: 1, incomingRunnerId: "p1", blockingRunnerId: "p2" },
    })} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Runner conflict at 1B");

    rerender(<RunnerConflictModal {...baseProps({
      conflict: { targetBase: 3, incomingRunnerId: "p1", blockingRunnerId: "p2" },
    })} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Runner conflict at 3B");
  });

  it("Score [blocking runner] resolves with SCORE_BLOCKING", function () {
    var props = baseProps();
    render(<RunnerConflictModal {...props} />);
    // Each button has a nested subtitle span, so its accessible name is the
    // full concatenated text — match by role + substring rather than an
    // exact label to avoid a brittle/failing exact-text query.
    fireEvent.click(screen.getByRole("button", { name: /^Score Casey/ }));
    expect(props.onResolve).toHaveBeenCalledWith("SCORE_BLOCKING");
  });

  it("Hold [incoming runner] resolves with HOLD_INCOMING", function () {
    var props = baseProps();
    render(<RunnerConflictModal {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /^Hold Jordan/ }));
    expect(props.onResolve).toHaveBeenCalledWith("HOLD_INCOMING");
  });

  it("Cancel play resolves with CANCEL_PLAY", function () {
    var props = baseProps();
    render(<RunnerConflictModal {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /^Cancel play/ }));
    expect(props.onResolve).toHaveBeenCalledWith("CANCEL_PLAY");
  });
});
