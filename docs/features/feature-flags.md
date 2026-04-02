# Feature Flags — How-To Guide

> Last updated: March 29, 2026 (v1.6.7)

Feature flags let you ship code to production without activating it for all users. You can test quietly, roll out gradually, and kill a broken feature in seconds — no code deploy required for most operations.

---

## Table of Contents

1. [How the System Works](#how-the-system-works)
2. [Flag File Reference](#flag-file-reference)
3. [Adding a New Flag](#adding-a-new-flag)
4. [Enabling / Disabling Flags](#enabling--disabling-flags)
5. [Per-User Rollout (No Deploy)](#per-user-rollout-no-deploy)
6. [URL Param Bootstrap](#url-param-bootstrap)
7. [Options for Runtime Flag Control (Future)](#options-for-runtime-flag-control-future)
8. [Current Flags](#current-flags)

---

## How the System Works

Flags are evaluated at **render time** using a two-level check:

```
FEATURE_FLAGS.<FLAG_NAME>           ← global default (compile-time, in featureFlags.js)
  OR
localStorage.getItem("flag:<name>") === "1"   ← per-user override (runtime, no deploy)
```

If **either** is true, the feature is on for that user. This means:

- Setting the global flag to `true` and deploying enables it for **everyone**.
- Setting a localStorage key enables it for **one device/browser** without any deploy.
- Setting the global flag to `false` disables it globally, even if some users have the localStorage key — unless you want localStorage to win (see the guard pattern below).

The standard guard pattern used throughout the app:

```js
var featureEnabled = FEATURE_FLAGS.VIEWER_MODE || localStorage.getItem("flag:viewer_mode") === "1";
if (featureEnabled) { ... }
```

To make the global flag a hard kill switch (overrides localStorage):

```js
var featureEnabled = FEATURE_FLAGS.VIEWER_MODE && (
  FEATURE_FLAGS.VIEWER_MODE === true || localStorage.getItem("flag:viewer_mode") === "1"
);
```

---

## Flag File Reference

**Location:** `frontend/src/config/featureFlags.js`

```js
export const FEATURE_FLAGS = {
  USE_NEW_LINEUP_ENGINE: true,   // V2 scoring engine — always on

  // Viewer Mode — read-only swipeable inning cards for parents/players
  // Set to true to enable globally, or leave false and enable per-user via:
  //   localStorage.setItem("flag:viewer_mode", "1")   ← enable for this user
  //   localStorage.removeItem("flag:viewer_mode")     ← disable / revert
  VIEWER_MODE: false,
};
```

---

## Adding a New Flag

1. Add a constant to `featureFlags.js`:

```js
export const FEATURE_FLAGS = {
  // ...existing flags...

  // My new feature — describe what it does and when to enable
  MY_FEATURE: false,
};
```

2. Import and guard in `App.jsx`:

```js
// At the point where the feature renders or runs:
{(FEATURE_FLAGS.MY_FEATURE || localStorage.getItem("flag:my_feature") === "1") ? (
  <MyFeatureComponent />
) : null}
```

3. Document it in the **Current Flags** table at the bottom of this file.

4. Add to the version history entry in `App.jsx` (`VERSION_HISTORY`) and `CLAUDE.md`.

---

## Enabling / Disabling Flags

### Global enable (for all users) — requires deploy

```js
// featureFlags.js
VIEWER_MODE: true,   // was false
```

Commit, push to main → Vercel deploys in ~1 minute → all users see the feature.

### Global disable (kill switch) — requires deploy

```js
VIEWER_MODE: false,
```

Same deploy cycle. Useful when a feature is broken in production.

---

## Per-User Rollout (No Deploy)

Enable or disable for a single user without any code change or deploy.

### Via browser console (coach / internal tester)

```js
// Enable
localStorage.setItem("flag:viewer_mode", "1");

// Disable / revert
localStorage.removeItem("flag:viewer_mode");
```

Refresh the page after running either command.

### Via URL param bootstrap (share a link with someone)

Send anyone a URL with `?enable_flag=<name>` appended. When they open it, the app:
1. Sets the localStorage flag automatically
2. Strips the param from the URL (clean redirect)
3. Loads normally with the feature active

```
# Enable viewer mode for the person who opens this link:
https://dugoutlineup.com/?enable_flag=viewer_mode

# Disable it (useful for reverting a tester):
https://dugoutlineup.com/?disable_flag=viewer_mode

# Combine with a share link — viewer opens in viewer mode AND gets the flag set:
https://dugoutlineup.com/?s=abc123&view=true&enable_flag=viewer_mode
```

This is the **recommended path for rolling out to specific coaches** before a global release.

---

## URL Param Bootstrap

Implemented in `App.jsx` as a `useEffect` on mount (runs once):

```js
useEffect(function() {
  var _ffp = new URLSearchParams(window.location.search);
  var _ef  = _ffp.get("enable_flag");
  var _df  = _ffp.get("disable_flag");
  if (!_ef && !_df) { return; }
  if (_ef) { localStorage.setItem("flag:" + _ef, "1"); }
  if (_df) { localStorage.removeItem("flag:" + _df); }
  // Strip param and reload cleanly
  var clean = window.location.pathname;
  var kept  = [];
  _ffp.forEach(function(v, k) {
    if (k !== "enable_flag" && k !== "disable_flag") kept.push(k + "=" + encodeURIComponent(v));
  });
  window.location.replace(clean + (kept.length ? "?" + kept.join("&") : ""));
}, []);
```

**Security note:** Anyone who receives such a URL can enable the feature on their own device. This is intentional — flags protect against accidental exposure, not adversarial access. Don't put unfinished or sensitive code behind a flag and assume it's secured.

---

## Options for Runtime Flag Control (Future)

The current system requires either a deploy (global) or manual browser console access (per-user). Below are upgrade paths, ranked from lowest to highest effort.

### Option A — Supabase `feature_flags` table *(recommended next step)*

Add a table to Supabase:

```sql
CREATE TABLE feature_flags (
  name       TEXT PRIMARY KEY,
  enabled    BOOLEAN DEFAULT false,
  notes      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Query on app load (non-blocking):

```js
supabase.from('feature_flags').select('name, enabled')
  .then(function(r) {
    (r.data || []).forEach(function(row) {
      if (row.enabled) localStorage.setItem("flag:" + row.name, "1");
      else             localStorage.removeItem("flag:" + row.name);
    });
  });
```

**Result:** You can flip flags in the Supabase dashboard — no deploy, no browser console. Takes effect on next page load.

**Targeting:** Add a `team_id` or `user_id` column to target specific coaches.

**Effort:** ~1 hour (SQL migration + 10 lines of JS).

---

### Option B — URL param only (already shipped)

Use the `?enable_flag=` bootstrap (described above). Zero infra, works today.

**Best for:** Inviting 1–3 specific coaches to test a feature before rolling out broadly.

---

### Option C — Dedicated flags endpoint on Render backend

Add `GET /api/flags` to `backend/index.js`. Returns JSON of flag states from an env var or a JSON file:

```json
{ "viewer_mode": true, "my_other_feature": false }
```

**Result:** Update an env var on Render dashboard → new flag state active in ~30s (no frontend deploy, but backend restart).

**Effort:** ~30 minutes.

---

### Option D — Third-party feature flag service

| Service | Free tier | Key capability |
|---|---|---|
| **PostHog** | 1M events/mo | Percentage rollouts, user properties, A/B testing, analytics |
| **GrowthBook** | Unlimited (open source) | Self-hosted option, SQL metric integration |
| **Flagsmith** | 50K requests/mo | Per-identity flags, remote config values |
| **LaunchDarkly** | Paid ($10/seat) | Industry standard, real-time streaming updates |

**Best for:** When you have multiple coaches, want rollout percentages (e.g., "5% of users"), or need A/B testing with analytics.

**Effort:** 2–4 hours to integrate SDK.

---

### Recommendation

| Stage | Approach |
|---|---|
| **Now (testing)** | URL param bootstrap — send `?enable_flag=viewer_mode` link |
| **Small rollout (2–5 coaches)** | URL param bootstrap per coach |
| **Broader rollout** | Supabase `feature_flags` table (Option A) |
| **Multi-team launch with targeting** | PostHog or Flagsmith (Option D) |

---

## Current Flags

| Flag name | Key in featureFlags.js | Default | localStorage key | Description |
|---|---|---|---|---|
| Viewer Mode | `VIEWER_MODE` | `false` | `flag:viewer_mode` | Read-only swipeable inning cards; `Share Viewer Link` button in Lineups tab |
| V2 Lineup Engine | `USE_NEW_LINEUP_ENGINE` | `true` | *(not overridable)* | V2 scoring engine — always on, no localStorage override |
