// Coverage-analysis follow-up (session 2026-08-23): FinishGameModal.jsx
// (frontend/src/components/ScoringMode/) writes the final score to the
// schedule and is the sole "Finish Game" path for a live game — a broken
// confirm/error/loading flow here is real data-integrity risk on a surface
// with no prior test coverage. This test file lives outside
// components/ScoringMode/ deliberately — that directory is a CLAUDE.md
// "Locked File" path requiring a gate phrase to edit, but importing a
// component from it for a new, separate test file isn't editing it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FinishGameModal from "../components/ScoringMode/FinishGameModal";

function baseProps(overrides) {
  return Object.assign({
    isOpen: true,
    myScore: 7,
    oppScore: 3,
    inning: 6,
    halfInning: "bottom",
    opponentName: "River Cats",
    teamShort: "Us",
    endGame: vi.fn(() => Promise.resolve({ ok: true })),
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  }, overrides);
}

describe("FinishGameModal", function () {

  beforeEach(function () {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", function () {
    var props = baseProps({ isOpen: false });
    var { container } = render(<FinishGameModal {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the score preview and game context when open", function () {
    render(<FinishGameModal {...baseProps()} />);
    expect(screen.getByText("Finish Game")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText(/River Cats/).length).toBeGreaterThan(0);
    expect(screen.getByText(function (_, el) {
      return el.textContent === "▼ Inning 6 · vs River Cats";
    })).toBeInTheDocument();
  });

  it("Not yet calls onCancel and does not call endGame", function () {
    var props = baseProps();
    render(<FinishGameModal {...props} />);
    fireEvent.click(screen.getByText("Not yet"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.endGame).not.toHaveBeenCalled();
  });

  it("confirming calls endGame and onSuccess on a successful result", async function () {
    var props = baseProps();
    render(<FinishGameModal {...props} />);

    fireEvent.click(screen.getByText("Yes, finish game"));
    expect(props.endGame).toHaveBeenCalledTimes(1);

    await waitFor(function () {
      expect(props.onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a loading state while endGame is in flight, then clears it", async function () {
    var resolveEndGame;
    var props = baseProps({
      endGame: vi.fn(() => new Promise(function (resolve) { resolveEndGame = resolve; })),
    });
    render(<FinishGameModal {...props} />);

    fireEvent.click(screen.getByText("Yes, finish game"));
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    resolveEndGame({ ok: true });
    await waitFor(function () {
      expect(props.onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("a failed finalize surfaces a mapped error message and switches the button to Retry", async function () {
    var props = baseProps({
      endGame: vi.fn(() => Promise.resolve({ ok: false, error: "sync_failed" })),
    });
    render(<FinishGameModal {...props} />);

    fireEvent.click(screen.getByText("Yes, finish game"));

    await waitFor(function () {
      expect(screen.getByText(/Could not save to server/)).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it("an unrecognized error code falls back to the generic error message", async function () {
    var props = baseProps({
      endGame: vi.fn(() => Promise.resolve({ ok: false, error: "totally_unknown_code" })),
    });
    render(<FinishGameModal {...props} />);

    fireEvent.click(screen.getByText("Yes, finish game"));

    await waitFor(function () {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
  });

  it("tapping Retry after a failure calls endGame again", async function () {
    var call = 0;
    var props = baseProps({
      endGame: vi.fn(function () {
        call++;
        return call === 1
          ? Promise.resolve({ ok: false, error: "sync_failed" })
          : Promise.resolve({ ok: true });
      }),
    });
    render(<FinishGameModal {...props} />);

    fireEvent.click(screen.getByText("Yes, finish game"));
    await waitFor(function () { expect(screen.getByText("Retry")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Retry"));
    await waitFor(function () { expect(props.onSuccess).toHaveBeenCalledTimes(1); });

    expect(props.endGame).toHaveBeenCalledTimes(2);
  });
});
