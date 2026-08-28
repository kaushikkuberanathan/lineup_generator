# Feature Flags — How-To Guide

> Last updated: 2026-08-27 (#112, #120 — isFlagEnabled() DB-driven cache, key-scheme dual-write; this doc's scheme table and URL-bootstrap section were themselves stale relative to code as of the previous update)

Feature flags let you ship code to production without activating it for all users. You can test quietly, roll out gradually, and kill a broken feature in seconds — no code deploy required for most operations.

---

## Table of Contents

1. [How the System Works](#how-the-system-works)
2. [Flag File Reference](#flag-file-reference)
3. [Adding a New Flag](#adding-a-new-flag)
4. [Enabling / Disabling Flags](#enabling--disabling-flags)
5. [Per-User Rollout (No Deploy)](#per-user-rollout-no-deploy)
6. [URL Param Bootstrap](#url-param-bootstrap)
7. [Supabase Runtime Flags](#supabase-runtime-flags)
8. [Current Flags](#current-flags)

---

## How the System Works

There are two independent layers, and a flag can be controlled by either or both:

**1. Compile-time default + localStorage override** — evaluated at render time via `isFlagEnabled()` (`frontend/src/config/featureFlags.js`):

```
FEATURE_FLAGS.<FLAG_NAME>                          ← global default (compile-time)
  OR
localStorage.getItem("flag_<FLAG_NAME>") === "true" / "false"   ← per-user override (runtime, no deploy)
```

**2. Supabase `feature_flags` table** — read at app load via the `useFeatureFlag` / `useFeatureFlags` hooks (see [Supabase Runtime Flags](#supabase-runtime-flags) below), and (as of Story 30/#112) also merged into `isFlagEnabled()`'s own runtime cache — see the DB-driven precedence note below.

**⚠️ Two localStorage key schemes coexist in the codebase (Story 49/#120) — as of 2026-08-27 they are additive, not exclusive:**

| Scheme | Key format | Value | Used by |
|---|---|---|---|
| **A — via `isFlagEnabled()`** | `flag_<UPPERCASE_NAME>` (underscore) | `"true"` / `"false"` (string) | Every flag: `ACCESSIBILITY_V1`, `SCORING_SHEET_V2`, `COMBINED_GAMEMODE_AND_SCORING` (Scheme A only), plus `MAINTENANCE_MODE`/`VIEWER_MODE` (Scheme A now works alongside Scheme B — see below) |
| **B — inline in App.jsx, not via `isFlagEnabled()`** | `flag:<lowercase_name>` (colon) | `"1"` (set) / absent (unset) | `MAINTENANCE_MODE` (`flag:MAINTENANCE_MODE`), `VIEWER_MODE` (`flag:viewer_mode`); `GAME_MODE` (`flag:game_mode`) is declared but not read anywhere — see the Current Flags table |

**Before #120 these were genuinely exclusive** — setting `flag:viewer_mode` had no effect on `isFlagEnabled()`, and vice versa, matching this doc's original warning. **That's no longer fully true.** #120 shipped two additive fixes, not a full consolidation onto one scheme (judged too high-blast-radius — MAINTENANCE_MODE is the whole-app kill switch, VIEWER_MODE gates the public share-link viewer):

1. `flagBootstrap.js`'s `applyFlagParams()` now writes **both** forms on every `?enable_flag=`/`?disable_flag=` call — so the URL bootstrap now works for Scheme-A-only flags too (see [URL Param Bootstrap](#url-param-bootstrap)).
2. App.jsx's `MAINTENANCE_MODE`/`VIEWER_MODE` gates were extended to also check `isFlagEnabled()`, alongside their existing Scheme B check — so the canonical `flag_MAINTENANCE_MODE`/`flag_VIEWER_MODE` form now works for those two flags too, not just the legacy colon form.

Net effect: for `MAINTENANCE_MODE` and `VIEWER_MODE`, **either key form works.** For every other flag, only Scheme A (`isFlagEnabled()`) ever worked and still does — nothing changed there except that the URL bootstrap can now reach them too.

The `isFlagEnabled()` guard pattern (Scheme A):

```js
import { isFlagEnabled } from '../config/featureFlags';
if (isFlagEnabled('ACCESSIBILITY_V1')) { ... }
```

The inline Scheme B pattern (used directly at a handful of call sites in App.jsx):

```js
var on = FEATURE_FLAGS.VIEWER_MODE || localStorage.getItem("flag:viewer_mode") === "1";
```

---

## Flag File Reference

**Location:** `frontend/src/config/featureFlags.js`

```js
export const FEATURE_FLAGS = {
  USE_NEW_LINEUP_ENGINE: true,          // V2 scoring engine — always on, not overridable
  MAINTENANCE_MODE: false,              // "We'll be right back" screen
  VIEWER_MODE: false,                   // Read-only swipeable inning cards; Share Viewer Link button
  GAME_MODE: true,                      // Full-screen live game overlay
  ACCESSIBILITY_V1: true,               // Font floors, touch targets, contrast, aria labels — GA default-on
  SCORING_SHEET_V2: true,               // Outcome sheet semantic cleanup — GA default-on
  COMBINED_GAMEMODE_AND_SCORING: true,  // DugoutView — GA default-on since v2.5.9
};

export function isFlagEnabled(flagName) {
  var override = localStorage.getItem('flag_' + flagName);
  if (override === 'true') return true;
  if (override === 'false') return false;
  return FEATURE_FLAGS[flagName] === true;
}
```

**Not every flag lives here.** `live_scoring` exists only as a Supabase `feature_flags` row (no `FEATURE_FLAGS` entry, no compile-time default) — see [Supabase Runtime Flags](#supabase-runtime-flags).

---

## Adding a New Flag

1. Add a constant to `featureFlags.js`:

```js
export const FEATURE_FLAGS = {
  // ...existing flags...
  MY_FEATURE: false,
};
```

2. Guard the call site using `isFlagEnabled()` (preferred — Scheme A) rather than a new inline `localStorage.getItem("flag:...")` check, to avoid adding a third key scheme:

```js
{isFlagEnabled('MY_FEATURE') ? <MyFeatureComponent /> : null}
```

3. Document it in the [Current Flags](#current-flags) table at the bottom of this file.

4. Add to `VERSION_HISTORY` (`frontend/src/data/versionHistory.js`) and `CLAUDE.md`.

---

## Enabling / Disabling Flags

### Global enable/disable (all users) — requires deploy

```js
// featureFlags.js
MY_FEATURE: true,   // was false
```

This is code in a **locked file's sibling path** — `featureFlags.js` itself isn't on the root `CLAUDE.md` Locked Files list, but the branch/PR/soak flow in that file's **Release Ritual — Develop to Main Promotion** section applies: feature branch → PR to `develop` (CI green, preview tested) → 24h soak → PR to `develop` → `main` (Ship Gate) → prod smoke test. There is no direct-push-to-main path in the current branch strategy.

### Per-user, no deploy

See below.

---

## Per-User Rollout (No Deploy)

Enable or disable for a single user without any code change or deploy. For `MAINTENANCE_MODE`/`VIEWER_MODE` either key form works (as of #120); for every other flag, use Scheme A.

### Via browser console

```js
// Scheme A — works for every flag, including MAINTENANCE_MODE/VIEWER_MODE
localStorage.setItem("flag_MY_FEATURE", "true");
localStorage.setItem("flag_MY_FEATURE", "false");   // force off
localStorage.removeItem("flag_MY_FEATURE");         // revert to default

// Scheme B — legacy form, still works for MAINTENANCE_MODE/VIEWER_MODE only
localStorage.setItem("flag:viewer_mode", "1");
localStorage.removeItem("flag:viewer_mode");
```

Refresh the page after running either command.

### Via URL param bootstrap (share a link with someone)

```
https://dugoutlineup.com/?enable_flag=viewer_mode
https://dugoutlineup.com/?disable_flag=viewer_mode
https://dugoutlineup.com/?s=abc123&view=true&enable_flag=viewer_mode
```

As of #120, this writes **both** localStorage forms (Scheme B `flag:<name>` and Scheme A `flag_<NAME>`) — it now works for every flag, not just Scheme B ones. Before #120 it wrote only the Scheme B form, so a Scheme-A-only flag (e.g. `?enable_flag=accessibility_v1`) silently did nothing.

---

## URL Param Bootstrap

The URL-param logic lives in `frontend/src/utils/flagBootstrap.js` (`applyFlagParams` / `buildCleanSearch`), unit-tested independently of React (`frontend/src/tests/flag-bootstrap.test.js`).

**`App.jsx`'s real `useEffect` (~line 1534) delegates to `applyFlagParams()`/`buildCleanSearch()` from this module** — confirmed by direct read 2026-08-27. This doc previously (as of a 2026-08-23 note) said App.jsx ran its own separate inline copy instead of importing the module, making it tested-but-not-live; that gap was closed 2026-08-26 (#406/#410 Pass 4, per the module's own header comment) and this doc simply never caught up until now. `?coach_access=`/`?clear_bypass` are also handled by the same module and the same `applyFlagParams()` call — not a separate mechanism.

**Security note:** Anyone who receives a `?enable_flag=` URL can enable the feature on their own device. This is intentional — flags protect against accidental exposure, not adversarial access.

---

## Supabase Runtime Flags

A second, independent flag source: the Supabase `feature_flags` table (`flag_name text, team_id text nullable, enabled bool`). This is live and shipped, not a future option.

### `useFeatureFlags()` — global flags, merged with compile-time defaults

`frontend/src/hooks/useFeatureFlags.js`. On mount, `fetchRuntimeFlags()` reads all rows where `team_id IS NULL`, uppercases `flag_name`, and merges over `FEATURE_FLAGS` (DB row wins on conflict). Falls back to the static `FEATURE_FLAGS` object if Supabase is disabled or the query errors. Used once at the top of `App.jsx` as `runtimeFlags`.

```js
var { flags, loading } = useFeatureFlags();
if (flags.VIEWER_MODE) { ... }
```

`fetchTeamFlags(teamId)` (team-scoped variant, same file) exists but has no call site yet — a stub for future per-team override support.

### `useFeatureFlag(flagName, teamId)` — single flag, team-scoped

`frontend/src/hooks/useFeatureFlag.js`. Reads one flag by name; if a team-scoped row (`team_id` matches) exists it wins over the global (`team_id IS NULL`) row. **Fails closed** — returns `enabled: false` if Supabase is unavailable or no row is found. Used in `App.jsx` for `live_scoring`:

```js
var { enabled, loading } = useFeatureFlag('live_scoring', activeTeamId);
```

`live_scoring` has no `FEATURE_FLAGS` compile-time entry — it exists purely as Supabase rows. Per root `CLAUDE.md` → Live Scoring Architecture, it's additionally hardcoded on regardless of the DB row for teams named "Mud Hens" or "Demo All-Stars".

### Managing rows

Flip flags directly in the Supabase dashboard (Table Editor → `feature_flags`) — no deploy, no browser console. Takes effect on next page load (`useFeatureFlags`/`useFeatureFlag` re-fetch on mount, not live-subscribed).

### `isFlagEnabled()` is now DB-driven too (Story 30/#112)

Before #112, `useFeatureFlags()`'s result (`runtimeFlags` in App.jsx) was only ever consulted for `VIEWER_MODE`/`MAINTENANCE_MODE`'s own inline checks — flipping a row for, say, `ACCESSIBILITY_V1` in the Supabase dashboard had no runtime effect at all; only a code deploy changing the `FEATURE_FLAGS` default did anything. App.jsx now feeds the same `useFeatureFlags()` result (no extra fetch) into a module-level cache in `featureFlags.js` via `setRuntimeFlagCache()`, and `isFlagEnabled()` checks that cache between the localStorage override and the static default:

```
localStorage "flag_<NAME>" override  (highest precedence, per-user)
  ↓ (if not set)
DB-driven runtime cache (setRuntimeFlagCache, from useFeatureFlags())
  ↓ (if flag not present in cache, or cache not yet populated)
FEATURE_FLAGS static default
```

So a Supabase `feature_flags` row flip now takes effect for any `isFlagEnabled()`-gated flag on the next page load, same as it already did for `VIEWER_MODE`/`MAINTENANCE_MODE`.

---

## Current Flags

| Flag name | Key in featureFlags.js | Default | Override scheme | Description |
|---|---|---|---|---|
| V2 Lineup Engine | `USE_NEW_LINEUP_ENGINE` | `true` | *(not overridable)* | V2 scoring engine — always on |
| Maintenance Mode | `MAINTENANCE_MODE` | `false` | A + B (`flag_MAINTENANCE_MODE` or `flag:MAINTENANCE_MODE`, either works as of #120) | "We'll be right back" screen during deploys |
| Viewer Mode | `VIEWER_MODE` | `false` | A + B (`flag_VIEWER_MODE` or `flag:viewer_mode`, either works as of #120) | Gates the "Share Viewer Link" button in the Lineups share sheet. Does **not** gate the viewer-rendering path itself — a share URL with `?view=true` or `?role=viewer` renders the read-only `DugoutView` viewer regardless of this flag. |
| Game Mode | `GAME_MODE` | `true` | B (`flag:game_mode`) | Full-screen live game overlay. **Not read anywhere in the render tree** (verified 2026-08-27, #120) — superseded by `COMBINED_GAMEMODE_AND_SCORING` (DugoutView). Left in place, not removed — out of scope for the flag-key-scheme fix that found this. |
| Accessibility v1 | `ACCESSIBILITY_V1` | `true` | A (`flag_ACCESSIBILITY_V1`) | Font floors, touch targets, contrast, aria labels — GA default-on (Phase 1a) |
| Scoring Sheet V2 | `SCORING_SHEET_V2` | `true` | A (`flag_SCORING_SHEET_V2`) | Outcome sheet semantic cleanup — GA default-on |
| Combined Game Mode + Scoring | `COMBINED_GAMEMODE_AND_SCORING` | `true` | A (`flag_COMBINED_GAMEMODE_AND_SCORING`) | DugoutView, the sole game-day surface — GA default-on since v2.5.9 |
| Live Scoring | *(Supabase only, no compile-time entry)* | `false` (DB row) | Supabase `feature_flags` table, team-scoped via `useFeatureFlag('live_scoring', teamId)` | Hardcoded on for "Mud Hens" / "Demo All-Stars" regardless of the DB row |
