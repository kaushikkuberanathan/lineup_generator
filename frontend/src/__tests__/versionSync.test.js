// Regression spec for Story 31 / #113 — package.json version sync gate.
//
// The v2.5.2 release (commit 0c005e1) bumped APP_VERSION in App.jsx and
// frontend/package.json but missed backend/package.json — caught only by
// manual recon during the release deploy, not by anything automated. This
// spec is the automated gate: it fails CI the moment any of the three
// version sources drift from the other two.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_PKG = path.resolve(__dirname, "../../package.json");
const BACKEND_PKG = path.resolve(__dirname, "../../../backend/package.json");
const APP_JSX = path.resolve(__dirname, "../App.jsx");

// Pure detector: given App.jsx source, return the APP_VERSION string literal
// it declares. Kept pure (no fs) so a synthetic source string can drive it
// and prove the detector can return red — see the negative test below.
function extractAppVersion(src) {
  const m = src.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : null;
}

describe("version sync gate (Story 31 / #113)", () => {
  const frontendVersion = JSON.parse(readFileSync(FRONTEND_PKG, "utf8")).version;
  const backendVersion = JSON.parse(readFileSync(BACKEND_PKG, "utf8")).version;
  const appVersion = extractAppVersion(readFileSync(APP_JSX, "utf8"));

  it("precondition: all three version sources are readable", () => {
    expect(frontendVersion, "frontend/package.json has no version field").toBeTruthy();
    expect(backendVersion, "backend/package.json has no version field").toBeTruthy();
    expect(appVersion, "APP_VERSION not found in App.jsx").toBeTruthy();
  });

  it("backend/package.json version matches frontend/package.json version", () => {
    expect(
      backendVersion,
      `backend/package.json is at ${backendVersion}, frontend/package.json is at ${frontendVersion} — ` +
        "the release version-bump step was applied to one but not the other"
    ).toBe(frontendVersion);
  });

  it("App.jsx APP_VERSION matches frontend/package.json version", () => {
    expect(
      appVersion,
      `App.jsx APP_VERSION is ${appVersion}, frontend/package.json is at ${frontendVersion} — ` +
        "the release version-bump step was applied to one but not the other"
    ).toBe(frontendVersion);
  });

  it("detector returns red: a mismatched APP_VERSION is not silently accepted", () => {
    // Synthetic source deliberately declaring a different version — proves
    // the assertion above is not vacuous. If any of the three ever drift,
    // this is the failure shape the real test above would produce.
    const broken = 'var APP_VERSION = "1.0.0";';
    expect(extractAppVersion(broken)).toBe("1.0.0");
    expect(extractAppVersion(broken)).not.toBe(frontendVersion);
  });
});
