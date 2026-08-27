// Fixes #775: "Join as Viewer" dead-ends on an unimplemented placeholder.
// LiveScoreViewer previously ignored every prop (including onExit), leaving
// anyone who tapped "Join as Viewer" mid-game with no score and no way out.
// This test file lives outside components/ScoringMode/ deliberately — that
// directory is a CLAUDE.md "Locked File" path requiring a gate phrase to
// edit; importing a component from it for a new, separate test file isn't
// editing it.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveScoreViewer from "../components/ScoringMode/LiveScoreViewer";

function baseGameState(overrides) {
  return Object.assign({
    inning: 3,
    halfInning: 'top',
    outs: 1,
    balls: 2,
    strikes: 1,
    myScore: 4,
    opponentScore: 2,
  }, overrides);
}

describe("LiveScoreViewer", function () {
  it("renders the real score, not the placeholder text", function () {
    render(
      <LiveScoreViewer
        gameState={baseGameState()}
        scorerName="Coach Sam"
        myTeamLabel="Mud Hens"
        oppLabel="Bananas"
        onClaimScorer={vi.fn()}
        onExit={vi.fn()}
      />
    );
    expect(screen.queryByText("LiveScoreViewer")).toBeNull();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("MUD HENS")).toBeInTheDocument();
    expect(screen.getByText("BANANAS")).toBeInTheDocument();
  });

  it("renders the current inning and half", function () {
    render(
      <LiveScoreViewer
        gameState={baseGameState({ inning: 5, halfInning: 'bottom' })}
        onClaimScorer={vi.fn()}
        onExit={vi.fn()}
      />
    );
    expect(screen.getByText("Bot 5th")).toBeInTheDocument();
  });

  it("calls onExit when the exit control is tapped", function () {
    var onExit = vi.fn();
    render(
      <LiveScoreViewer
        gameState={baseGameState()}
        onClaimScorer={vi.fn()}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByTestId("scoreboard-exit"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("calls onClaimScorer when Claim Scorer Role is tapped", function () {
    var onClaimScorer = vi.fn();
    render(
      <LiveScoreViewer
        gameState={baseGameState()}
        onClaimScorer={onClaimScorer}
        onExit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Claim Scorer Role/));
    expect(onClaimScorer).toHaveBeenCalledTimes(1);
  });

  it("shows the active scorer's name when one is present", function () {
    render(
      <LiveScoreViewer
        gameState={baseGameState()}
        scorerName="Coach Sam"
        onClaimScorer={vi.fn()}
        onExit={vi.fn()}
      />
    );
    expect(screen.getByText(/Coach Sam is scoring/)).toBeInTheDocument();
  });

  it("does not crash and shows defaults when gameState is missing", function () {
    render(<LiveScoreViewer onClaimScorer={vi.fn()} onExit={vi.fn()} />);
    var zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
