// Story 120 / #531 — SharedView duplicate header: region slice 9 (App.jsx `var C` sweep)
//
// SharedView() renders via its own <ErrorBoundary> tree, structurally separate
// from the main app shell (slices 1-7) — its C.navy/C.red/C.gold/C.textMuted/
// C.white/C.border references, plus two literal-hex duplicates of already-
// tokenized values (the navyLight header-gradient stop, and a companion
// "#0f1f3d" selected-batter text color), were never migrated by any prior
// slice. This proves the migration is zero-visual-change: every rendered
// color below is byte-identical to the pre-migration `var C` / literal value.
//
// All 6 tokens used here were already MINTED and pinned by Story 109/110 —
// this is a mechanical reference swap, not a new naming decision. See
// docs/product/DESIGN_AUDIT.md "Legacy C Object Disposition" per-key table.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: () => {} }),
}));

import { SharedView } from "../App";
import { tokens } from "../theme/tokens";

function makeRenderFieldSVG() {
  return vi.fn(function () {
    return <div data-testid="mock-field-svg" />;
  });
}

const payload = {
  team: "Mud Hens 8U",
  game: null,
  grid: {
    Aiden: ["SS", "Bench", "Out"],
    Benji: ["2B", "SS", "Bench"],
  },
  batting: ["Aiden", "Benji"],
  roster: ["Aiden", "Benji"],
  absentNames: undefined,
  songs: {},
};

describe("Story 120 — SharedView C.* -> tokens.* color equivalence (region slice 9)", () => {
  it("pins the two literal-hex sites (navyLight gradient stop, companion navy) to their already-minted tokens with zero value drift", () => {
    // These two sites replace bare literal hex, not a C.key reference —
    // confirm the token values are exact matches for the legacy literals
    // before checking the DOM, since jsdom does not reliably normalize
    // colors embedded inside a `linear-gradient(...)` function string.
    expect(tokens.color.brand.navy.toLowerCase()).toBe("#0f1f3d");
    expect(tokens.color.brand.navyLight.toLowerCase()).toBe("#1a3260");
  });

  it("header gradient wrapper: border-bottom resolves to brand.red (was C.red)", () => {
    const { container } = render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const headerWrapper = container.firstElementChild.children[0];
    expect(headerWrapper.style.borderBottomColor).toBe("rgb(200, 16, 46)");
  });

  it("team-initial circle: background=brand.navy, border+color=brand.gold (was C.navy / C.gold)", () => {
    const { container } = render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const circle = Array.from(container.querySelectorAll("div")).find(
      (d) => d.style.width === "30px" && d.style.height === "30px"
    );
    expect(circle).toBeTruthy();
    expect(circle.style.background).toBe("rgb(15, 31, 61)");
    expect(circle.style.borderColor).toBe("rgb(245, 200, 66)");
    expect(circle.style.color).toBe("rgb(245, 200, 66)");
  });

  it("team name: color=brand.gold (was C.gold)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText("Mud Hens 8U").style.color).toBe("rgb(245, 200, 66)");
  });

  it('"Inn" label and "All" pill (default active): brand.navy background, muted text (was C.navy / C.textMuted)', () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText("Inn").style.color).toBe("rgb(107, 114, 128)");
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(allBtn.style.background).toBe("rgb(15, 31, 61)");
  });

  it("numbered inning pill turns brand.red when active (was C.red)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const pill1 = screen.getByRole("button", { name: "1" });
    fireEvent.click(pill1);
    expect(pill1.style.background).toBe("rgb(200, 16, 46)");
    expect(pill1.style.color).toBe("rgb(255, 255, 255)");
  });

  it("view toggle: active state uses surface.card background + brand.navy text, inactive uses muted text (was C.white / C.navy / C.textMuted)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const diamondBtn = screen.getByTitle("Diamond view");
    const tableBtn = screen.getByTitle("Table view");
    expect(diamondBtn.style.background).toBe("rgb(255, 255, 255)");
    expect(diamondBtn.style.color).toBe("rgb(15, 31, 61)");
    expect(tableBtn.style.color).toBe("rgb(107, 114, 128)");
  });

  it("bench table: filled cell uses brand.navy (was C.navy)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    // Aiden is on the field (SS) in inning 1 — first bench-table data cell
    // with actual player text is styled with brand.navy when a name is present.
    const cell = screen.getAllByText("Aiden").find((el) => el.tagName === "TD");
    expect(cell).toBeTruthy();
    expect(cell.style.color).toBe("rgb(15, 31, 61)");
  });

  it("Batting Order card: border=border.neutral (was C.border)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const card = screen.getByText("Batting Order").parentElement;
    expect(card.style.borderColor).toBe("rgba(0, 0, 0, 0.06)");
  });

  it("batting-order badge circle: background=brand.navy (was C.navy)", () => {
    const { container } = render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    const badges = Array.from(container.querySelectorAll("div")).filter(
      (d) => d.style.width === "20px" && d.style.height === "20px"
    );
    expect(badges.length).toBe(2); // Aiden + Benji
    badges.forEach((b) => expect(b.style.background).toBe("rgb(15, 31, 61)"));
  });

  it("batting-order field-position summary: muted text (was C.textMuted)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    // "SS" appears inside a <span> (own color: inherit unless the position is
    // OUT) nested in the field-position summary <div>, which carries the
    // actual muted color the span inherits from.
    const posSpan = screen.getAllByText(/SS/).find((el) => el.parentElement?.style.fontSize === "9px");
    expect(posSpan).toBeTruthy();
    expect(posSpan.style.color).toBe("inherit");
    expect(posSpan.parentElement.style.color).toBe("rgb(107, 114, 128)");
  });

  it("footer: muted text (was C.textMuted)", () => {
    render(<SharedView payload={payload} renderFieldSVG={makeRenderFieldSVG()} />);
    expect(screen.getByText(/View-only lineup/).parentElement.style.color).toBe("rgb(107, 114, 128)");
  });
});
