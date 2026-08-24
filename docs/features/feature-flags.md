# Feature Flags — How-To Guide

> Last updated: August 2026 (v2.12.0)

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

**2. Supabase `feature_flags` table** — read at app load via the `useFeatureFlag` / `useFeatureFlags` hooks (see [Supabase Runtime Flags](#supabase-runtime-flags) below). This is a separate mechanism from `isFlagEnabled()` and does not go through it.

**⚠️ Two different localStorage key schemes coexist in the codebase — verified against current call sites, not assumed:**

| Scheme | Key format | Value | Used by |
|---|---|---|---|
| **A — via `isFlagEnabled()`** | `flag_<UPPERCASE_NAME>` (underscore) | `"true"` / `"false"` (string) | `ACCESSIBILITY_V1`, `SCORING_SHEET_V2`, `COMBINED_GAMEMODE_AND_SCORING`, `MAINTENANCE_MODE` |
| **B — inline in App.jsx, not via `isFlagEnabled()`** | `flag:<lowercase_name>` (colon) | `"1"` (set) / absent (unset) | `VIEWER_MODE` (`flag:viewer_mode`), `GAME_MODE` (`flag:game_mode`) |

These are not interchangeable — setting `flag:viewer_mode` has no effect on a flag guarded by `isFlagEnabled()`, and vice versa. Check which scheme a specific flag's call site actually uses (grep the flag name in `App.jsx`) before assuming either key format will work.

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

Enable or disable for a single user without any code change or deploy. **Use the key scheme that matches the specific flag** — see the table in [How the System Works](#how-the-system-works).

### Via browser console

```js
// Scheme A flags (ACCESSIBILITY_V1, SCORING_SHEET_V2, COMBINED_GAMEMODE_AND_SCORING, MAINTENANCE_MODE)
localStorage.setItem("flag_MY_FEATURE", "true");
localStorage.setItem("flag_MY_FEATURE", "false");   // force off
localStorage.removeItem("flag_MY_FEATURE");         // revert to default

// Scheme B flags (VIEWER_MODE, GAME_MODE)
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

This always writes the **Scheme B (`flag:<name>`, colon)** localStorage key — it does not set the `flag_<NAME>` (underscore) key `isFlagEnabled()` reads. For a Scheme A flag, the URL param bootstrap has no effect; use the browser console method above instead.

---

## URL Param Bootstrap

The URL-param logic has been extracted into `frontend/src/utils/flagBootstrap.js` (`applyFlagParams` / `buildCleanSearch`), which is unit-tested independently of React (`frontend/src/tests/flag-bootstrap.test.js`).

**Verified 2026-08-23: `App.jsx`'s actual `useEffect` (~line 1519) does not import or call `flagBootstrap.js` — it runs its own separate inline copy of the same param-reading logic**, plus two params (`coach_access`, `clear_bypass`) that `flagBootstrap.js` doesn't know about. Both implementations behave equivalently for `enable_flag`/`disable_flag` today, but `flagBootstrap.js` is currently tested-but-not-live: a fix or behavior change made there will not reach production until App.jsx's inline copy is switched over to import it. Filed as a known gap, not fixed here — App.jsx requires its locked-file gate phrase to edit.

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

---

## Current Flags

| Flag name | Key in featureFlags.js | Default | Override scheme | Description |
|---|---|---|---|---|
| V2 Lineup Engine | `USE_NEW_LINEUP_ENGINE` | `true` | *(not overridable)* | V2 scoring engine — always on |
| Maintenance Mode | `MAINTENANCE_MODE` | `false` | A (`flag_MAINTENANCE_MODE`) | "We'll be right back" screen during deploys |
| Viewer Mode | `VIEWER_MODE` | `false` | B (`flag:viewer_mode`) | Gates the "Share Viewer Link" button in the Lineups share sheet. Does **not** gate the viewer-rendering path itself — a share URL with `?view=true` or `?role=viewer` renders the read-only `DugoutView` viewer regardless of this flag. |
| Game Mode | `GAME_MODE` | `true` | B (`flag:game_mode`) | Full-screen live game overlay |
| Accessibility v1 | `ACCESSIBILITY_V1` | `true` | A (`flag_ACCESSIBILITY_V1`) | Font floors, touch targets, contrast, aria labels — GA default-on (Phase 1a) |
| Scoring Sheet V2 | `SCORING_SHEET_V2` | `true` | A (`flag_SCORING_SHEET_V2`) | Outcome sheet semantic cleanup — GA default-on |
| Combined Game Mode + Scoring | `COMBINED_GAMEMODE_AND_SCORING` | `true` | A (`flag_COMBINED_GAMEMODE_AND_SCORING`) | DugoutView, the sole game-day surface — GA default-on since v2.5.9 |
| Live Scoring | *(Supabase only, no compile-time entry)* | `false` (DB row) | Supabase `feature_flags` table, team-scoped via `useFeatureFlag('live_scoring', teamId)` | Hardcoded on for "Mud Hens" / "Demo All-Stars" regardless of the DB row |
