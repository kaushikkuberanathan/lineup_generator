// DOC_TEST_DEBT.md "Share Link Payload Integrity" (P0) — second half of the
// ticket's ask: "a DOM test that SharedView renders all sections without
// errors given the payload." SharedView (App.jsx) is the component every
// share link and viewer link ultimately renders; buildSharePayload.test.js
// covers the payload-building half, this covers the render half.
//
// SharedView was made a named export (was a plain top-level `function`, not
// closure-scoped inside App()) specifically to make this test possible — see
// git history on this file's introduction for the one-line change.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// App.jsx imports `virtual:pwa-register/react` — a Vite-plugin-generated
// virtual module that vite-plugin-pwa only resolves in real dev/build
// pipelines, not under Vitest's module loader (confirmed: importing App.jsx
// unmocked throws "argument 'filename' must be a file URL..." trying to
// resolve it). SharedView itself never touches the SW registration hook
// (that's only called inside the App() component), so a no-op mock is safe.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: () => {} }),
}));

import { SharedView } from "../App";

function makeRenderFieldSVG() {
  return vi.fn(function () {
    return <div data-testid="mock-field-svg" />;
  });
}

const basePayload = {
  team: "Mud Hens 8U",
  game: null,
  grid: {
    Aiden: ["SS", "Bench", "Out"],
    Benji: ["2B", "SS", "Bench"],
    Cassius: ["Bench", "2B", "SS"],
  },
  batting: ["Aiden", "Benji", "Cassius"],
  roster: ["Aiden", "Benji", "Cassius"],
  absentNames: undefined,
  songs: {
    Aiden: { song: "Thunderstruck", artist: "AC/DC", start: null, end: null },
  },
};

describe("SharedView — renders all sections without errors given the payload", () => {
  it("renders the header with team name and Print button", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText("Mud Hens 8U")).toBeInTheDocument();
    expect(screen.getByText("Print")).toBeInTheDocument();
    expect(screen.getByText("Game Day Lineup")).toBeInTheDocument();
  });

  it("renders game info line instead of the fallback when payload.game is present", () => {
    const withGame = {
      ...basePayload,
      game: { opponent: "Firefighters", date: "2026-08-05", time: "6:00 PM" },
    };
    render(<SharedView payload={withGame} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText(/vs Firefighters/)).toBeInTheDocument();
    expect(screen.queryByText("Game Day Lineup")).not.toBeInTheDocument();
  });

  it("renders player filter pills when roster is present", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByRole("button", { name: "All Players" })).toBeInTheDocument();
    // "Aiden" also appears in the Bench table (Bench in inning 2, Out in
    // inning 3) — scope to the pill button to disambiguate.
    expect(screen.getByRole("button", { name: "Aiden" })).toBeInTheDocument();
  });

  it("omits player filter pills when roster is empty", () => {
    render(<SharedView payload={{ ...basePayload, roster: [] }} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.queryByText("All Players")).not.toBeInTheDocument();
  });

  it("renders inning filter controls sized to the grid's inning count", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    // Plain "1"/"2"/"3" text also appears in the Batting Order badge circles
    // (batting position number) — scope to buttons to disambiguate.
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("defaults to diamond view: calls renderFieldSVG and shows the Bench table", () => {
    const renderFieldSVG = makeRenderFieldSVG();
    render(<SharedView payload={basePayload} renderFieldSVG={renderFieldSVG} />);
    expect(renderFieldSVG).toHaveBeenCalled();
    expect(screen.getByTestId("mock-field-svg")).toBeInTheDocument();
    expect(screen.getByText("Bench")).toBeInTheDocument();
  });

  it("switches to table view and renders per-inning position badges without calling renderFieldSVG again", () => {
    const renderFieldSVG = makeRenderFieldSVG();
    render(<SharedView payload={basePayload} renderFieldSVG={renderFieldSVG} />);
    const initialCalls = renderFieldSVG.mock.calls.length;
    fireEvent.click(screen.getByTitle("Table view"));
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getAllByText(/OUT/).length).toBeGreaterThan(0);
    expect(renderFieldSVG.mock.calls.length).toBe(initialCalls);
  });

  it("renders the Batting Order section with per-batter field-position summaries", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText("Batting Order")).toBeInTheDocument();
    // Aiden batted #1, positions SS / Bench(–) / Out(OUT)
    expect(screen.getAllByText(/OUT/).length).toBeGreaterThan(0);
  });

  it("renders walk-up song details on the batting order card when present", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText(/Thunderstruck/)).toBeInTheDocument();
    expect(screen.getByText(/AC\/DC/)).toBeInTheDocument();
  });

  it("omits the Batting Order section entirely when batting is empty", () => {
    render(<SharedView payload={{ ...basePayload, batting: [] }} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.queryByText("Batting Order")).not.toBeInTheDocument();
  });

  it("renders the 'Not playing tonight' footnote when absentNames is populated", () => {
    render(
      <SharedView
        payload={{ ...basePayload, absentNames: ["Levi Smith"] }}
        renderFieldSVG={makeRenderFieldSVG()}
      />
    );
    expect(screen.getByText(/Not playing tonight: Levi/)).toBeInTheDocument();
  });

  it("renders the view-only footer", () => {
    render(<SharedView payload={basePayload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText(/View-only lineup/)).toBeInTheDocument();
  });
});
