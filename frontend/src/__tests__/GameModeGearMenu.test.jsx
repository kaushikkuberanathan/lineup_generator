// Coverage-analysis follow-up (session 2026-08-23): GameModeGearMenu.jsx
// (frontend/src/components/ScoringMode/) is the gear-menu affordance for
// Exit Scoring / Hand off scoring / Finish Game — real actions on the live
// game-day surface, previously untested. This test file lives outside
// components/ScoringMode/ deliberately — that directory is a CLAUDE.md
// "Locked File" path requiring a gate phrase to edit; importing a
// component from it for a new, separate test file isn't editing it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameModeGearMenu from "../components/ScoringMode/GameModeGearMenu";

function baseProps(overrides) {
  return Object.assign({
    isOpen: true,
    isScorer: true,
    confirmHandoff: false,
    onClose: vi.fn(),
    onHandoff: vi.fn(),
    onFinishGame: vi.fn(),
    onExitScoring: vi.fn(),
    onConfirmHandoff: vi.fn(),
    onCancelHandoff: vi.fn(),
  }, overrides);
}

describe("GameModeGearMenu", function () {

  beforeEach(function () {
    vi.clearAllMocks();
  });

  it("renders nothing (no menu, no confirm modal) when closed and no handoff confirmation pending", function () {
    var { container } = render(<GameModeGearMenu {...baseProps({ isOpen: false, confirmHandoff: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Exit Scoring, Hand off scoring, and Finish Game options for the scorer", function () {
    render(<GameModeGearMenu {...baseProps()} />);
    expect(screen.getByText("Exit Scoring")).toBeInTheDocument();
    expect(screen.getByText("Hand off scoring")).toBeInTheDocument();
    expect(screen.getByText("Finish Game…")).toBeInTheDocument();
  });

  it("hides Hand off scoring for a non-scorer (viewer)", function () {
    render(<GameModeGearMenu {...baseProps({ isScorer: false })} />);
    expect(screen.queryByText("Hand off scoring")).not.toBeInTheDocument();
    expect(screen.getByText("Exit Scoring")).toBeInTheDocument();
    expect(screen.getByText("Finish Game…")).toBeInTheDocument();
  });

  it("Exit Scoring closes the menu and calls onExitScoring", function () {
    var props = baseProps();
    render(<GameModeGearMenu {...props} />);
    fireEvent.click(screen.getByText("Exit Scoring"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onExitScoring).toHaveBeenCalledTimes(1);
  });

  it("Hand off scoring closes the menu and calls onHandoff", function () {
    var props = baseProps();
    render(<GameModeGearMenu {...props} />);
    fireEvent.click(screen.getByText("Hand off scoring"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onHandoff).toHaveBeenCalledTimes(1);
  });

  it("Finish Game closes the menu and calls onFinishGame", function () {
    var props = baseProps();
    render(<GameModeGearMenu {...props} />);
    fireEvent.click(screen.getByText("Finish Game…"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onFinishGame).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop calls onClose", function () {
    var props = baseProps();
    var { container } = render(<GameModeGearMenu {...props} />);
    // Backdrop is the first fixed-inset div rendered ahead of the menu panel.
    fireEvent.click(container.firstChild);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the handoff confirmation modal when confirmHandoff is true, even while the menu is closed", function () {
    render(<GameModeGearMenu {...baseProps({ isOpen: false, confirmHandoff: true })} />);
    expect(screen.getByText("Hand off scoring?")).toBeInTheDocument();
  });

  it("confirming the handoff modal calls onConfirmHandoff", function () {
    var props = baseProps({ isOpen: false, confirmHandoff: true });
    render(<GameModeGearMenu {...props} />);
    fireEvent.click(screen.getByText("Hand off"));
    expect(props.onConfirmHandoff).toHaveBeenCalledTimes(1);
  });

  it("cancelling the handoff modal calls onCancelHandoff", function () {
    var props = baseProps({ isOpen: false, confirmHandoff: true });
    render(<GameModeGearMenu {...props} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(props.onCancelHandoff).toHaveBeenCalledTimes(1);
  });

  it("the handoff confirmation modal can also appear while the menu itself is open", function () {
    render(<GameModeGearMenu {...baseProps({ isOpen: true, confirmHandoff: true })} />);
    expect(screen.getByText("Exit Scoring")).toBeInTheDocument();
    expect(screen.getByText("Hand off scoring?")).toBeInTheDocument();
  });
});
