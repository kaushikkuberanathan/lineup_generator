// #968 — PWA install-prompt platform branches (Android beforeinstallprompt,
// iOS standalone-mode detection, already-installed exclusion) had zero test
// coverage anywhere in the repo. Golden-path integration test mounting <App/>
// the same way AppHomeMembershipTeams.test.jsx / AppBattingOrderGoldenPath.test.jsx
// do, since this logic lives inline in the locked App.jsx (~line 1283-1310 for
// the capture effects, ~line 7549 for the render) and isn't separately
// extracted or unit-testable.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";

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

var ORIGINAL_UA = window.navigator.userAgent;
var ORIGINAL_MATCH_MEDIA = window.matchMedia;

// App.jsx computes `isStandalone` from window.matchMedia("(display-mode:
// standalone)").matches and `isIOS` from a UA regex (~App.jsx line 1457/1539)
// — there is no navigator.standalone check in the real code, so this stub
// only needs to answer the standalone media query.
function stubMatchMedia(isStandaloneDisplay) {
  window.matchMedia = vi.fn(function (query) {
    return {
      matches: query === "(display-mode: standalone)" ? isStandaloneDisplay : false,
      media: query,
      onchange: null,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return false; },
    };
  });
}

function stubUserAgent(ua) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}

var ANDROID_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36";
var IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("App PWA install banner platform branches (#968)", function () {
  beforeEach(function () {
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      session: { user: { email: "coach@example.com" }, access_token: "tok" },
      user: { email: "coach@example.com", profile: { first_name: "Coach" } },
      authState: "authenticated",
      setAuthState: vi.fn(),
      sendMagicLink: vi.fn(),
      requestAccess: vi.fn(),
      logout: vi.fn(),
      memberships: [],
      updateProfileName: vi.fn(),
      refreshMemberships: vi.fn(() => Promise.resolve()),
    });
  });

  afterEach(function () {
    stubUserAgent(ORIGINAL_UA);
    window.matchMedia = ORIGINAL_MATCH_MEDIA;
  });

  it("Android: dispatching beforeinstallprompt shows the install banner with an Install button", async function () {
    stubUserAgent(ANDROID_UA);
    stubMatchMedia(false); // not running standalone

    render(<App />);

    expect(screen.queryByText("📲 Install Dugout Lineup")).not.toBeInTheDocument();

    var promptEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    act(function () {
      window.dispatchEvent(promptEvent);
    });

    await waitFor(function () {
      expect(screen.getByText("📲 Install Dugout Lineup")).toBeInTheDocument();
    });
    expect(promptEvent.preventDefault).toHaveBeenCalled();
    expect(screen.getByText("One-tap access on game day — no browser needed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
    // iOS-specific copy must not leak into the Android branch.
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument();
  });

  it("iOS: shows the iOS-specific install banner on mount, with no beforeinstallprompt event needed", async function () {
    stubUserAgent(IOS_UA);
    stubMatchMedia(false); // not running standalone

    render(<App />);

    await waitFor(function () {
      expect(screen.getByText("📲 Install Dugout Lineup")).toBeInTheDocument();
    });
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    // Android's deferred-prompt copy/button must not appear on iOS.
    expect(screen.queryByText("One-tap access on game day — no browser needed")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("already installed (standalone display-mode): no install banner renders on either platform", async function () {
    stubUserAgent(ANDROID_UA);
    stubMatchMedia(true); // running standalone — already installed

    render(<App />);

    // Give any mount-time effects a tick to (not) fire.
    await waitFor(function () {
      expect(screen.queryByText("📲 Install Dugout Lineup")).not.toBeInTheDocument();
    });

    var promptEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    act(function () {
      window.dispatchEvent(promptEvent);
    });

    // Even a real beforeinstallprompt firing must not surface the banner
    // once the app is already running standalone.
    expect(screen.queryByText("📲 Install Dugout Lineup")).not.toBeInTheDocument();
  });
});
