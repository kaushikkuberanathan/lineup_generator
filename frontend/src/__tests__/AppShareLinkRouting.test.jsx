// DOC_TEST_DEBT.md P1 "Share-link routing render path (Story 61 follow-up)".
//
// Story 61 (v2.5.16) removed the VIEWER_MODE flag gate from the two inline
// routing decisions in App.jsx that decide whether a share link opens
// SharedView (read-only static page) or DugoutView (interactive viewer mode):
//   - the `?s=<id>` short-link branch: `isViewer = view==="true" || role==="viewer"`
//   - the legacy `?share=<base64>` branch: `isViewer64 = view==="true" || role==="viewer"`
// That fix was verified only via a Vercel preview smoke test on a real device
// (v2.5.16 PR) — no automated coverage exists for either branch. A future
// refactor (or an accidental flag-gate reintroduction) could silently regress
// recipient-side share-link routing again, with no signal until a parent
// reports a broken link. This file closes that gap.
//
// Both branches are reached BEFORE the auth gate (Auth Principle: viewing a
// share link never requires login) — see App.jsx's render order: maintenance
// check -> `?s=` short-link check -> legacy `?share=` check -> auth gate.
// `useAuth` and feature-flag state are mocked purely for hook stability;
// their actual values never influence which branch below is taken.
//
// `?s=<id>` requires an async Supabase lookup (`dbLoadShareLink`) to resolve
// before `sharePayload` is set and the routing decision is evaluated, so it's
// mocked directly (App.jsx's own `dbLoadShareLink` returns
// `Promise.resolve(null)` when the Supabase client isn't configured, which is
// always true under Vitest — the real return value must be supplied here).
// `?share=<base64>` decodes synchronously in the render body itself, so no
// async mock is needed for that branch.
//
// DugoutView is a heavy component (useLiveScoring, ScoringModeEntry,
// LiveScoringPanel, DefenseDiamond, ...) — mocked to a marker div, matching
// DugoutView.test.jsx's own mocking of its non-essential children. SharedView
// is NOT mocked: it's a lightweight named export off App.jsx (see
// SharedView.test.jsx) and asserting on its real rendered text is a stronger
// routing-decision signal than a marker div would be.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// App.jsx imports `virtual:pwa-register/react` — a Vite-plugin-generated
// virtual module Vitest cannot resolve outside a real build. Same mock used
// by SharedView.test.jsx / AppNoMembershipRouting.test.jsx.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: () => {} }),
}));

const mockUseAuth = vi.fn();
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockDbLoadShareLink = vi.fn();
vi.mock("../supabase.js", async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual, {
    dbLoadShareLink: (...args) => mockDbLoadShareLink(...args),
  });
});

vi.mock("../components/game-mode/DugoutView", () => ({
  DugoutView: function MockDugoutView(props) {
    return (
      <div data-testid="mock-dugout-view" data-is-viewer={String(!!props.isViewer)}>
        dugout view mock
      </div>
    );
  },
}));

import App from "../App";

function baseAuth(overrides) {
  return Object.assign(
    {
      session: null,
      user: null,
      authState: "unauthenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
    },
    overrides
  );
}

const sharePayload = {
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

function encodeSharePayload(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function setUrl(search) {
  window.history.pushState(null, "", "/" + (search ? "?" + search : ""));
}

beforeEach(function () {
  mockUseAuth.mockReturnValue(baseAuth());
  mockDbLoadShareLink.mockReset();
});

afterEach(function () {
  setUrl("");
});

describe("App — share-link routing render path (Story 61 follow-up, DOC_TEST_DEBT.md)", function () {
  describe("`?s=<id>` short-link branch", function () {
    it("renders SharedView (not DugoutView) for `?s=abc` with no view/role param", async function () {
      mockDbLoadShareLink.mockResolvedValue(sharePayload);
      setUrl("s=abc");

      render(<App />);

      await waitFor(function () {
        expect(screen.getByText("Mud Hens 8U")).toBeInTheDocument();
      });
      expect(screen.getByText("Print")).toBeInTheDocument();
      expect(screen.queryByTestId("mock-dugout-view")).not.toBeInTheDocument();
    });

    it("renders DugoutView (not SharedView) for `?s=abc&view=true`", async function () {
      mockDbLoadShareLink.mockResolvedValue(sharePayload);
      setUrl("s=abc&view=true");

      render(<App />);

      await waitFor(function () {
        expect(screen.getByTestId("mock-dugout-view")).toBeInTheDocument();
      });
      expect(screen.getByTestId("mock-dugout-view")).toHaveAttribute("data-is-viewer", "true");
      expect(screen.queryByText("Print")).not.toBeInTheDocument();
    });

    it("renders DugoutView (not SharedView) for `?s=abc&role=viewer`", async function () {
      mockDbLoadShareLink.mockResolvedValue(sharePayload);
      setUrl("s=abc&role=viewer");

      render(<App />);

      await waitFor(function () {
        expect(screen.getByTestId("mock-dugout-view")).toBeInTheDocument();
      });
      expect(screen.queryByText("Print")).not.toBeInTheDocument();
    });
  });

  describe("legacy `?share=<base64>` branch", function () {
    it("renders SharedView (not DugoutView) for `?share=<base64>` with no view/role param", async function () {
      setUrl("share=" + encodeSharePayload(sharePayload));

      render(<App />);

      await waitFor(function () {
        expect(screen.getByText("Mud Hens 8U")).toBeInTheDocument();
      });
      expect(screen.getByText("Print")).toBeInTheDocument();
      expect(screen.queryByTestId("mock-dugout-view")).not.toBeInTheDocument();
      // Legacy branch never touches the async short-link lookup.
      expect(mockDbLoadShareLink).not.toHaveBeenCalled();
    });

    it("renders DugoutView (not SharedView) for `?share=<base64>&view=true`", async function () {
      setUrl("share=" + encodeSharePayload(sharePayload) + "&view=true");

      render(<App />);

      await waitFor(function () {
        expect(screen.getByTestId("mock-dugout-view")).toBeInTheDocument();
      });
      expect(screen.getByTestId("mock-dugout-view")).toHaveAttribute("data-is-viewer", "true");
      expect(screen.queryByText("Print")).not.toBeInTheDocument();
    });

    it("renders DugoutView (not SharedView) for `?share=<base64>&role=viewer`", async function () {
      setUrl("share=" + encodeSharePayload(sharePayload) + "&role=viewer");

      render(<App />);

      await waitFor(function () {
        expect(screen.getByTestId("mock-dugout-view")).toBeInTheDocument();
      });
      expect(screen.queryByText("Print")).not.toBeInTheDocument();
    });
  });
});
