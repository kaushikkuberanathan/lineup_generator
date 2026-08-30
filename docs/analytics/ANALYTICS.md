# Dugout Lineup — Analytics Reference

> **App version:** v2.12.0
> **Last updated:** August 2026
> **Owner:** Platform Admin (KK)
> **Stack:** Mixpanel + Vercel Analytics

---

## Architecture Overview

Dugout Lineup uses two analytics tools in parallel:

| Tool | Purpose | Implementation |
|---|---|---|
| **Mixpanel** | Behavioral events, funnels, retention, user identity, segmentation | `src/utils/analytics.js` |
| **Vercel Analytics** | Page-level traffic, web vitals, screen-level corroboration | `@vercel/analytics` injected in `main.jsx` |

All custom Mixpanel events flow through the `track()` helper exported
from `src/utils/analytics.js`. Vercel screen events use `vaTrack()`
aliased from `@vercel/analytics` in `App.jsx`.

**Auth principle:** Analytics must never gate or block share link
rendering or Game Mode. All `track()` calls are wrapped in try/catch
and no-op silently on failure.

**Disclosure:** this collection is disclosed in the in-app Privacy Policy
(`frontend/src/content/legal.js`, Support → Legal). See #774 for the
2026-08-23 decision to disclose actual collection (Path B) rather than
suppress identifying fields.

---

## Initialization

**File:** `frontend/src/utils/analytics.js`

Mixpanel is initialized once at module load. The token is read from
`VITE_MIXPANEL_TOKEN`. If the token is unset (empty string), all
`track()` calls no-op silently. In local dev, all events additionally
log to console via `console.log("[analytics]", event, props)`.

### Super Properties

Registered once via `mixpanel.register()` immediately after init.
These attach automatically to every subsequent event — no need to
pass them manually per `track()` call.

| Super Property | Type | Values | Source |
|---|---|---|---|
| `is_pwa` | boolean | `true` / `false` | `getDeviceContext()` — display-mode media query + `navigator.standalone` |
| `platform` | string | `pwa_ios` / `pwa_android` / `ios` / `android` / `desktop` | `getDeviceContext()` |
| `device_os` | string | `ios` / `android` / `desktop` | `getDeviceContext()` |
| `screen_width` | number | px | `window.screen.width` at load |
| `screen_height` | number | px | `window.screen.height` at load |
| `app_version` | string | e.g. `2.12.0` | `__APP_VERSION__`, injected from `frontend/package.json` at Vite build time |

Note: `os` and `device_type` (referenced by older docs and some dashboard configs) are not actual super-property keys in the current `getDeviceContext()` implementation — the real keys are `device_os` and `platform` above. Reports filtering on `os`/`device_type` should be rechecked against real event data.

---

## User Identity

Identity is established in `loadTeam()` in `App.jsx` (~line 2284) every time a coach loads a team:

```js
track("load_team", { team_id: team.id, team_name: team.name });
mixpanel.identify(team.id);
try { if (coachName) { mixpanel.alias(coachName + "_" + team.id); } } catch(e) { /* ignored */ }
mixpanel.people.set({
  $name: coachName || team.name,
  coach_name: coachName || null,
  team_id: team.id,
  team_name: team.name,
  age_group: team.ageGroup || "unknown",
  roster_size: r.length,
  // ...additional fields below
});
```

**`coachName`** is sourced from `user.profile.first_name` via the
`useAuth()` hook. Auth is live in prod since v2.6.0 (magic link + Google
sign-in) — `coachName` is populated whenever the coach is signed in and
has set a name; falls back to `team.name` otherwise.

**Role model:** the code-level canonical role vocabulary is four values
(`platform_admin` / `team_admin` / `coach` / `parent`), enforced by
`normalizeRole()`. The database (`team_memberships.role`) currently
tolerates seven legacy values for existing rows — see root `CLAUDE.md` →
Multi-team design (Phase 5) for the full model. Do not assume a
hardcoded `"team_admin"` default; the actual value on `mixpanel.people.set`
reflects whatever the team/membership record holds.

### User-Level Properties (`mixpanel.people.set`)

| Property | Type | Source | Notes |
|---|---|---|---|
| `$name` | string | `coachName` or `team.name` | Coach name preferred |
| `coach_name` | string | `user.profile.first_name` | `null` if unauthenticated |
| `team_id` | string | team object | Supabase team ID |
| `team_name` | string | team object | |
| `age_group` | string | team object | e.g. `8U` |
| `roster_size` | number | loaded roster at time of load | count only, no player names |
| `role` | string | team/membership record | see Role model note above |
| `team_count` | number | teams array length | all teams for this coach |

---

## Full Event Reference

> All events automatically carry super properties (`is_pwa`, `platform`,
> `device_os`, `screen_width`, `screen_height`, `app_version`).
> Only event-specific properties are listed below. This list was rebuilt
> 2026-08-23 directly from `track()`/`vaTrack()` call sites — grep
> `track\("` across `frontend/src` to re-verify before relying on it for
> a new dashboard.

---

### Acquisition & Onboarding

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `app_opened` | App mount, fires once | App.jsx | `coach_name_set`, `team_count`, `app_version`, `is_first_launch` |
| `first_launch` | First-ever app open (guarded by `app:first_launched` localStorage key) | App.jsx | `team_count`, `app_version` |
| `create_team` | New team saved | App.jsx | `age_group` |
| `pwa_banner_shown` | Custom install banner rendered (Android: `beforeinstallprompt` captured; iOS: manual banner) | App.jsx | `platform`, `prompt_ready`, `browser` |
| `pwa_install_clicked` | Coach taps install on the Android banner | App.jsx | `platform`, `prompt_ready` |
| `pwa_install_accepted` | Android native install prompt accepted | App.jsx | `platform` |
| `pwa_install_declined` | Android native install prompt declined | App.jsx | `platform` |
| `pwa_installed` | Browser fires `appinstalled` | App.jsx | `platform` (`ios`/`android`) |

---

### Activation

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `load_team` | Team selected / loaded | App.jsx | `team_id`, `team_name` |
| `add_player` | Player added to roster | App.jsx | `roster_size` |
| `auto_assign` | Lineup generated (two call sites — main flow and a second entry point) | App.jsx | `attempts`, `warnings`, `valid`, `roster_size`, `innings` |
| `finalize_lineup` | Lineup finalized | App.jsx | `roster_size`, `innings` |
| `lineup_locked` | `persistLineupLocked(true)` — same action as `finalize_lineup` | App.jsx | `team_id`, `roster_size`, `inning_count` |
| `lineup_unlocked` | `persistLineupLocked(false)` | App.jsx | `team_id` |

> `finalize_lineup` and `lineup_locked` fire together — same user action, kept both for backward compatibility with existing Mixpanel saved reports.

---

### Game Mode (North Star)

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `game_mode_entered` | `GameModeScreen` mounts | GameModeScreen.jsx | `team_id`, `starting_inning` |
| `game_mode_exited` | `GameModeScreen` unmounts | GameModeScreen.jsx | `team_id`, `innings_completed` (via ref, avoids stale closure) |
| `inning_advanced` | Next Inning tapped | GameModeScreen.jsx | `team_id`, `from_inning`, `to_inning` |
| `batter_advanced` | Next Batter tapped | GameModeScreen.jsx | `team_id`, `inning`, `batter_index` |
| `defense_batting_toggled` | Pill toggle tapped | GameModeScreen.jsx | `team_id`, `to_tab`, `inning` |

---

### QuickSwap

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `quick_swap_triggered` | Position tapped in Game Mode | GameModeScreen.jsx | `position`, `inning` |
| `quick_swap_completed` | Replacement player confirmed | QuickSwap.jsx | `position`, `inning`, `swapped_in` (see file for exact props) |
| `quick_swap_cancelled` | QuickSwap dismissed without selection | QuickSwap.jsx | `position`, `inning` |

---

### Sharing

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `share_link` | Share link generated | App.jsx (`shareCurrentLineup`) | `team_id`, `method`, `share_type`, `has_game_id` |
| `share_viewer_link` | "Share Viewer Link" tapped (behind `VIEWER_MODE` flag) | App.jsx (`shareViewerLink`) | *(none currently passed)* |
| `share_link_viewed` | Viewer opens share URL, fetch succeeds | App.jsx (share fetch effect) | `has_lineup`, `viewer_type`, `referrer`, `platform`, `is_pwa` |
| `share_link_view_failed` | Share fetch returns null or throws | App.jsx | `error` |
| `share_pdf` | PDF generated for sharing | App.jsx (`generatePDF`) | `team_id`, `method`, `share_type`, `has_game_id` |
| `download_pdf` | PDF downloaded locally | App.jsx (`generatePDF`) | *(none currently passed)* |

#### Share Method Values

| `method` value | Meaning |
|---|---|
| `native_share_sheet` | Web Share API (`navigator.share`) — iOS/Android native sheet |
| `copy_to_clipboard` | Clipboard fallback — desktop / unsupported browsers |

#### `share_link_viewed` Referrer

`referrer` captures `document.referrer`, revealing the app parents used to open the link (e.g. iMessage, WhatsApp, Gmail). `"direct"` means opened from home screen or address bar directly.

---

### Feature Adoption

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `suggest_batting_order` | AI batting order run | App.jsx | `has_stats` |
| `batting_hand_set` | Batting hand saved | BattingHandSelector.jsx | `team_id`, `hand` (`L`/`R`/`S`) |
| `game_result_logged` | Game result saved | App.jsx (`saveGameForm`) | `team_id`, `result` (`W`/`L`/`T`) |
| `import_schedule_text` | Text schedule imported | App.jsx | `games_found` |
| `import_schedule_photo` | Photo schedule imported | App.jsx | `games_found` |
| `import_result_photo` | Photo result imported | App.jsx | *(none currently passed)* |

> `import_result_text` listed in a prior version of this doc has no current call site — either removed or never shipped. Do not rely on it existing in Mixpanel data going forward without re-verifying.

---

### Auth Funnel

> **Correction (2026-08-23): auth is live in production, not gated/dormant.** The auth cutover shipped in v2.6.0 (2026-07-20) — magic link + Google sign-in, editing requires a session. These events fire in normal production use, not only in a future state.

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `login_requested` | Magic link requested | components/Auth/LoginScreen.jsx | `method: "magic_link"` |
| `login_succeeded` | Login confirmed | components/Auth/LoginScreen.jsx | `method: "magic_link"` |
| `login_failed` | Login error | components/Auth/LoginScreen.jsx | `method`, `error` |
| `access_requested` | Access request submitted (via Home tab team search, not a form) | components/Auth/RequestAccessScreen.jsx | `team_id` |
| `tos_consented` | Registration submitted with the Terms of Service / Privacy Policy checkbox checked | components/Auth/RequestAccessScreen.jsx | `version` (the accepted `terms` doc version, e.g. `"2.0"`) |
| `tos_link_opened` | Coach taps the "Terms of Service" or "Privacy Policy" link inline in the consent checkbox label, opening `LegalDocSheet` | components/Auth/RequestAccessScreen.jsx | `source: "checkbox_label"`, `doc` (present for the privacy link) |

> **Added 2026-08-29**, documenting the Terms of Service experience (PRs #907/#910/#913, `develop`-only as of this writing, not yet promoted) — by a session other than the one that authored the feature, from reading the code directly rather than the authoring session's own notes. See `content/legal.js` and `utils/legalConsent.js` for the full consent-versioning system these two events sit alongside; the consent record itself (`POST /api/v1/auth/consent`, migration 028's `legal_consents` table) is a separate, non-Mixpanel audit trail, not one of these two events.

> Path correction: access requests are submitted via "Find your team…" on the Home tab → team search → role picker → `POST /request-access` (Story 124/#655, v2.10.0), not via a Feedback form as a prior version of this doc and `legal.js` both stated (see #774).

> **Still a gap:** `access_approved` / `access_denied` are not instrumented anywhere in `backend/src/` — the admin approve/deny flow does not fire Mixpanel events (Mixpanel is a browser SDK; no server-side Mixpanel usage exists in this repo). Tracked in Known Gaps below.

---

### PWA Lifecycle

Covered above under Acquisition & Onboarding (`pwa_banner_shown`, `pwa_install_clicked/accepted/declined`, `pwa_installed`).

---

## Vercel Analytics Events

Fired via `vaTrack()` (aliased from `@vercel/analytics`) independently of Mixpanel.

| Event | Trigger |
|---|---|
| `app_loaded` | App mount |
| `game_mode_entered` | Game Mode activated (`useEffect([gameModeActive])`) |
| `share_link_viewed` | Share payload fetched successfully |
| `lineup_finalized` | Lineup locked |

---

## Mixpanel Dashboard Reference

These dashboard configs are carried forward from the prior version of this doc and have not been individually re-verified against a live Mixpanel project in this pass — treat as a starting point, re-check report definitions against the corrected event/property names above (especially the `os`/`device_type` → `device_os`/`platform` correction) before trusting an existing saved report.

### Dashboard 1: Coach Health (check daily)

| Report | Type | Config |
|---|---|---|
| Weekly Active Coaches | Insights Line | `load_team` unique users by week |
| Lineup → Game Mode Gap | Insights Line | `finalize_lineup` vs `game_mode_entered` on same axis |
| Share Link Send vs Open | Insights Line | `share_link` vs `share_link_viewed` by week |
| Avg Innings Completed | Insights Number | `inning_advanced` total / `game_mode_entered` total |
| PWA vs Browser split | Insights Bar | any event, breakdown by `is_pwa` super property |

### Dashboard 2: Activation Funnel (review weekly)

**Funnel:** `app_opened` → `create_team` → `add_player` →
`auto_assign` → `finalize_lineup` → `game_mode_entered` →
`inning_advanced` (≥3 times)

- Conversion window: **30 days**
- Counting: **Unique users**
- **Primary north star: Step 5→6** (`finalize_lineup` → `game_mode_entered`)

### Dashboard 3: Feature Adoption (product decisions)

| Report | Config |
|---|---|
| Feature Reach | All feature events, unique users %, bar chart, last 30 days |
| QuickSwap Conversion | `quick_swap_triggered` / `completed` / `cancelled` stacked bar |
| Inning Depth | `inning_advanced` grouped by `to_inning` property |
| Share Method Split | `share_link` broken down by `method` property |

### Dashboard 4: Retention (weekly cohorts)

| Report | Entry Event | Return Event |
|---|---|---|
| Game Day Return | `game_mode_entered` | `game_mode_entered` |
| Lineup Completion | `app_opened` | `finalize_lineup` |

### Dashboard 5: Device & Platform Segmentation

| Segment | Filter |
|---|---|
| PWA vs Browser | `is_pwa = true/false` |
| iOS vs Android | `platform` contains `ios`/`android` |
| Native share vs clipboard | `method` on `share_link` event |

---

## Deployment Checklist — Analytics Steps

`app_version` super property is injected automatically from
`frontend/package.json` at Vite build time. Single source of truth:
`frontend/package.json` version field.

---

## Known Gaps & Future Instrumentation

| Gap | Priority | Notes |
|---|---|---|
| `access_approved` / `access_denied` | P1 | No server-side Mixpanel usage exists in this repo; would need either a client-side event on the next load after approval, or a different pipeline |
| Email / SMS share branches | P2 | Not in `shareCurrentLineup()` — only native share sheet / clipboard exist |
| `import_result_text` | P2 | Documented in a prior version of this file; no current call site found — verify whether it was removed or never shipped before re-adding to a funnel |
| Dashboard configs (below) | P2 | Not re-verified against live Mixpanel project data in this pass — see note above Dashboard 1 |

---

## Implementation Files

| File | Role |
|---|---|
| `frontend/src/utils/analytics.js` | Mixpanel init, `getDeviceContext()`, super properties, `track()` export, `deviceContext` export |
| `frontend/src/App.jsx` | Identity (`loadTeam`), lifecycle events, PWA events, share events |
| `frontend/src/components/game-mode/GameModeScreen.jsx` | Game Mode events, inning/batter advance, QuickSwap trigger |
| `frontend/src/components/game-mode/QuickSwap.jsx` | QuickSwap completed/cancelled |
| `frontend/src/components/Auth/LoginScreen.jsx` | Auth funnel events (live in prod since v2.6.0) |
| `frontend/src/components/Auth/RequestAccessScreen.jsx` | Access request event |
| `frontend/src/components/BattingHandSelector.jsx` | Batting hand event |
| `frontend/main.jsx` | Vercel Analytics `inject()` |

---

*Event names are stable contracts. Do not rename without updating
this document and all Mixpanel saved reports and funnels.*
