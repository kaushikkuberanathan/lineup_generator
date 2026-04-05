# Dugout Lineup — Analytics Reference

> **App version:** v2.2.7
> **Last updated:** April 2026
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
rendering or Game Mode. All track() calls are wrapped in try/catch 
and no-op silently on failure.

---

## Initialization

**File:** `frontend/src/utils/analytics.js`

Mixpanel is initialized once at module load. The token is read from 
`VITE_MIXPANEL_TOKEN`. If the token is the placeholder value, all 
`track()` calls no-op silently. In local dev, all events log to 
console via `console.log("[analytics]", event, props)`.

### Super Properties

Registered once via `mixpanel.register()` immediately after init. 
These attach automatically to every subsequent event — no need to 
pass them manually per track() call.

| Super Property | Type | Values | Source |
|---|---|---|---|
| `os` | string | `ios` / `android` / `windows` / `macos` / `linux` / `unknown` | `getDeviceContext()` |
| `device_type` | string | `mobile` / `tablet` / `desktop` | `getDeviceContext()` |
| `platform` | string | `pwa_ios` / `pwa_android` / `ios` / `android` / `desktop` | `getDeviceContext()` |
| `is_pwa` | boolean | `true` / `false` | display-mode media query + navigator.standalone |
| `screen_width` | number | px | `window.innerWidth` at load |
| `screen_height` | number | px | `window.innerHeight` at load |
| `app_version` | string | e.g. `2.2.6` | `import.meta.env.VITE_APP_VERSION` |

---

## User Identity

Identity is established in `loadTeam()` in `App.jsx` every time 
a coach loads a team.
```js
mixpanel.alias(coachName + "_" + team.id);  // human-readable alias
mixpanel.identify(team.id);
mixpanel.people.set({ ... });
```

**`coachName`** is sourced from `user.profile.first_name` via the 
`useAuth()` hook. Requires Phase 4 auth to be active — falls back 
to `team.name` when unauthenticated.

**`team.role`** is not yet present on team objects in localStorage 
or Supabase. Defaults to `"team_admin"` until Phase 4 auth cutover 
wires the role model properly (platform_admin / team_admin / coach).

### User-Level Properties (`mixpanel.people.set`)

| Property | Type | Source | Notes |
|---|---|---|---|
| `$name` | string | `coachName` or `team.name` | Coach name preferred |
| `coach_name` | string | `user.profile.first_name` | null if unauthenticated |
| `team_id` | string | team object | Supabase team ID |
| `team_name` | string | team object | |
| `age_group` | string | team object | e.g. `8U` |
| `roster_size` | number | loaded roster at time of load | local var `r.length` |
| `app_version` | string | `APP_VERSION` const | e.g. `2.2.6` |
| `role` | string | team object or default | `"team_admin"` until Phase 4 |
| `team_count` | number | teams array length | all teams for this coach |
| `os` | string | deviceContext | mirrors super property |
| `device_type` | string | deviceContext | mirrors super property |
| `is_pwa` | boolean | deviceContext | mirrors super property |
| `platform` | string | deviceContext | `pwa` vs `browser` |

---

## Full Event Reference

> All events automatically carry super properties (os, device_type, 
> platform, is_pwa, screen_width, screen_height, app_version).
> Only event-specific properties are listed below.

---

### Acquisition & Onboarding

| Event | Trigger | Key Properties |
|---|---|---|
| `app_opened` | App mount, fires once | `coach_name_set`, `team_count`, `app_version`, `is_first_launch` |
| `first_launch` | First-ever app open (guarded by `app:first_launched` localStorage key) | `team_count`, `app_version` |
| `create_team` | New team saved | `age_group` |
| `pwa_install_prompted` | `beforeinstallprompt` browser event fires | `team_count` |
| `pwa_installed` | `appinstalled` browser event fires | `team_count`, `os`, `device_type` |

---

### Activation

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `load_team` | Team selected / loaded | App.jsx | `team_id`, `team_name` |
| `add_player` | Player added to roster | App.jsx | `roster_size` |
| `auto_assign` | Lineup generated | App.jsx | `attempts`, `warnings`, `valid`, `roster_size`, `innings` |
| `finalize_lineup` | Lineup finalized | App.jsx | `roster_size`, `innings` |
| `lineup_locked` | `persistLineupLocked(true)` — same action as finalize | App.jsx | `team_id`, `roster_size`, `inning_count` |
| `lineup_unlocked` | `persistLineupLocked(false)` | App.jsx | `team_id` |

> **Note:** `finalize_lineup` and `lineup_locked` fire together from 
> `persistLineupLocked(val)` — they are the same user action. 
> `finalize_lineup` is retained for backward compatibility with 
> existing Mixpanel saved reports.

---

### Game Mode (North Star)

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `game_mode_entered` | `GameModeScreen` mounts | GameModeScreen.jsx | `team_id`, `starting_inning` |
| `game_mode_exited` | `GameModeScreen` unmounts (cleanup) | GameModeScreen.jsx | `team_id`, `innings_completed` (via ref) |
| `inning_advanced` | Next Inning tapped | GameModeScreen.jsx | `team_id`, `from_inning`, `to_inning` |
| `batter_advanced` | Next Batter tapped | GameModeScreen.jsx | `team_id`, `inning`, `batter_index` |
| `defense_batting_toggled` | Pill toggle tapped | GameModeScreen.jsx | `team_id`, `to_tab`, `inning` |

> **`game_mode_exited`** uses a `useRef` synced to `currentInning` 
> to avoid stale closure in the unmount cleanup. 
> `innings_completed` reflects the actual last inning reached.

---

### QuickSwap

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `quick_swap_triggered` | Position tapped in Game Mode | GameModeScreen.jsx (handler) / QuickSwap.jsx | `position`, `inning` |
| `quick_swap_completed` | Replacement player confirmed | QuickSwap.jsx | `position`, `inning`, `swapped_in` |
| `quick_swap_cancelled` | QuickSwap dismissed without selection | QuickSwap.jsx (handleClose wrapper) | `position`, `inning` |

---

### Sharing

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `share_link` | Share link generated | App.jsx (`shareCurrentLineup`) | `team_id`, `method`, `share_type`, `has_game_id` |
| `share_link_viewed` | Viewer opens share URL, fetch succeeds | App.jsx (share fetch useEffect) | `has_lineup`, `viewer_type`, `referrer`, `platform`, `is_pwa` |
| `share_link_view_failed` | Share fetch returns null or throws | App.jsx | `error` |
| `share_pdf` | PDF generated for sharing | App.jsx (`generatePDF`) | `team_id`, `method`, `share_type`, `has_game_id` |
| `download_pdf` | PDF downloaded locally | App.jsx (`generatePDF`) | `team_id`, `method`, `share_type` |

#### Share Method Values

| `method` value | Meaning |
|---|---|
| `native_share_sheet` | Web Share API (`navigator.share`) — iOS/Android native sheet |
| `copy_to_clipboard` | Clipboard fallback — desktop / unsupported browsers |

> No email or SMS branches exist in `shareCurrentLineup()` currently. 
> If added in future, instrument with `method: "email"` or `method: "sms"`.

#### `share_link_viewed` Referrer

The `referrer` property on `share_link_viewed` captures 
`document.referrer`, which reveals the app parents used to open 
the link (e.g. iMessage, WhatsApp, Gmail). `"direct"` means the 
link was opened from the home screen or address bar directly.

---

### Feature Adoption

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `suggest_batting_order` | AI batting order run | App.jsx | `has_stats` |
| `batting_hand_set` | Batting hand saved | BattingHandSelector.jsx | `team_id`, `hand` (`L`/`R`/`S`) |
| `game_result_logged` | Game result saved | App.jsx (`saveGameForm`) | `team_id`, `result` (`W`/`L`/`T`) |
| `import_schedule_text` | Text schedule imported | App.jsx | `games_found` |
| `import_schedule_photo` | Photo schedule imported | App.jsx | `games_found` |
| `import_result_text` | Text result imported | App.jsx | — |
| `import_result_photo` | Photo result imported | App.jsx | — |

---

### Auth Funnel (Phase 4 — gated)

> These events are wired but dormant until the auth gate is 
> re-enabled in App.jsx. They will fire correctly once 
> `LoginScreen` and `RequestAccessScreen` are active.

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `login_requested` | Magic link / OTP requested | LoginScreen.jsx | `method: "magic_link"` |
| `login_succeeded` | Login confirmed | LoginScreen.jsx | `method: "magic_link"` |
| `login_failed` | Login error | LoginScreen.jsx | `method`, `error` |
| `access_requested` | Access request submitted | RequestAccessScreen.jsx | `team_id` |

> **Future (Phase 5):** `access_approved` and `access_denied` fire 
> from the backend approval flow. Documented in 
> `docs/TODO_approve_link_security.md`.

---

### PWA Lifecycle

| Event | Trigger | File | Key Properties |
|---|---|---|---|
| `pwa_install_prompted` | Browser fires `beforeinstallprompt` | App.jsx | `team_count` |
| `pwa_installed` | Browser fires `appinstalled` | App.jsx | `team_count`, `os`, `device_type` |

> On `pwa_installed`, super properties are updated immediately via 
> `mixpanel.register({ is_pwa: true, platform: "pwa_[os]" })` so 
> all subsequent events in that session reflect the installed state.

---

## Vercel Analytics Events

Fired via `vaTrack()` (aliased from `@vercel/analytics`) 
independently of Mixpanel. Used for corroboration and web vitals.

| Event | Trigger |
|---|---|
| `app_loaded` | App mount |
| `game_mode_entered` | Game Mode activated (all 4 launch paths via `useEffect([gameModeActive])`) |
| `share_link_viewed` | Share payload fetched successfully |
| `lineup_finalized` | Lineup locked |

---

## Mixpanel Dashboard Reference

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

> All existing reports can be filtered by super properties. 
> No new events needed — just apply filters.

Segments to compare across any funnel or report:

| Segment | Filter |
|---|---|
| PWA vs Browser | `is_pwa = true/false` |
| iOS vs Android | `os = ios/android` |
| Mobile vs Tablet vs Desktop | `device_type = mobile/tablet/desktop` |
| Native share vs clipboard | `method` on `share_link` event |
| New vs returning coaches | `is_first_launch = true/false` on `app_opened` |

---

## Deployment Checklist — Analytics Steps

Note: app_version super property is injected automatically 
from frontend/package.json at Vite build time. 
Single source of truth: frontend/package.json version field.

---

## Known Gaps & Future Instrumentation

| Gap | Priority | Notes |
|---|---|---|
| `access_approved` / `access_denied` | P1 | Backend approval flow — Phase 5 |
| `role` on team object | P1 | Defaults to `"team_admin"` until Phase 4 auth cutover |
| `coach_name` when unauthenticated | P2 | Falls back to `team.name` — accurate post-auth |
| Email / SMS share branches | P2 | Not in `shareCurrentLineup()` yet |
| `loginLimiter` max reset to 5 | P0 | Currently set to 50 for testing — must reset before prod auth deploy |
| LockFlow.jsx duplicate key warning | Low | Pre-existing, unrelated to analytics |

---

## Implementation Files

| File | Role |
|---|---|
| `frontend/src/utils/analytics.js` | Mixpanel init, `getDeviceContext()`, super properties, `track()` export, `deviceContext` export |
| `frontend/src/App.jsx` | Identity (`loadTeam`), lifecycle events, share events, auth events |
| `frontend/src/components/game-mode/GameModeScreen.jsx` | Game Mode events, inning/batter advance |
| `frontend/src/components/game-mode/QuickSwap.jsx` | QuickSwap triggered/completed/cancelled |
| `frontend/src/components/auth/LoginScreen.jsx` | Auth funnel events (gated) |
| `frontend/src/components/auth/RequestAccessScreen.jsx` | Access request event (gated) |
| `frontend/src/components/BattingHandSelector.jsx` | Batting hand event |
| `frontend/main.jsx` | Vercel Analytics `inject()` |

---

*Event names are stable contracts. Do not rename without updating 
this document and all Mixpanel saved reports and funnels.*
