# Lineup Generator — Product Roadmap

> Last updated: April 2026 (v2.2.42)
> MVP launched: March 24, 2026

---

## v2.2.42 — 2026-04-20
- Fix: Scoring screen dead space removed — diamond section reverted to flexShrink:0; pitch buttons marginTop:auto pins to bottom
- Fix: Absent players excluded from batting order in scoring — ScoringMode now receives `activeBattingOrder` instead of `battingOrder`

## v2.2.41 — 2026-04-20
- Fix: Live scoring pitch buttons (Ball/Strike/K/Foul/Contact) now always visible without scrolling — outer container locked to `height:100vh + overflow:hidden`; diamond section absorbs slack via `flex:1`; pitch bar pinned at bottom with 72px nav clearance

## v2.2.40 — 2026-04-20
- Fix: Live scoring "Loading rules..." hang — `team` prop now wired from ScoringMode → useLiveScoring so `getRulesForTeam()` receives the team object and resolves pitchUIConfig on first render

## v2.2.39 — 2026-04-17
- Debt: logged FEATURE_MAP.md structural and content gaps for v2.2.40 repair (prerequisite for Backlog Adjacency System)

## v2.2.38 — 2026-04-17 — Drift repair: FAQs, PERSONAS, SOLUTION_DESIGN, debt ledger
- Docs: FAQs — Scorekeeper category added (3 items); head-coach Out Tonight + Game Ball answers added; dj-parent Spotify deep-link FAQ added; install banner + account answers updated
- Docs: PERSONAS.md rewritten — 8 personas (Head Coach, Assistant Coach, Parent, Scorer, DJ Parent, Admin, Viewer, Child Player) with Phase 2 auth notes
- Docs: SOLUTION_DESIGN.md — Live Scoring Framework section added (Tier 1/2/3 breakdown, scorer lock rationale); CI/CD Pipeline section added (branch strategy, GitHub Actions, Husky pre-push, smoke tests); Analytics Architecture section added (identity model, super properties, SSR guards); feature_flags table schema added to Feature Flag System; /health version bumped to v2.2.38; Known Tradeoffs CI row corrected
- Governance: DOC_TEST_DEBT.md — Area field added to all 17 open items; 4 resolved SOLUTION_DESIGN doc gaps moved to Resolved; dashboard corrected (17 open: P0:2, P1:4, P2:11)
- Governance: FEATURE_MAP.md — Governance row (#19) added; D018 debt cleared from Feature Flag System; Coverage Summary updated to 19 features

## v2.2.37 — 2026-04-17
- Fix: Claim Scorer now works without login — scoringUserId falls back to stable localStorage-persisted local ID; never null
- Fix: isAdminTestMode permanently false; amber badge removed
- Fix: removed 4 null guards from useLiveScoring.js write sites

## v2.2.36 — 2026-04-17 — Governance activation: enhanced debt ledger, staging discipline, shell helpers
- Governance: `docs/product/DOC_TEST_DEBT.md` replaced with enhanced format — emoji priority markers (🔴/🟠/🟡), table-based items, Test/Doc/Process gap categories, Debt Summary Dashboard (20 items: 2 P0, 7 P1, 11 P2)
- Tooling: `scripts/debt-helpers.sh` and `scripts/debt-helpers.ps1` added — `debt`, `debt-all`, `debt-p0`, `debt-next`, `debt-dashboard` shell commands
- CLAUDE.md: Git Staging Discipline section added; debt-p0 minor-bump gate added to Ship Gate; CI target corrected to 306/1/0
- Repo: `.gitignore` hardened — `.vscode/` and `.idea/` added

## v2.2.35 — 2026-04-16 — Test suite: Groups 9-10 share payload + Out detection
- Test: attendance.test.js Group 9 — buildSharePayload (10 tests) — batting/roster/absentNames shape, copy-safety
- Test: attendance.test.js Group 10 — computeOutByInning (7 tests) — per-inning Out detection, Bench-not-Out, missing grid entry
- Total suite: 306 passed / 1 skipped / 0 failed

## v2.2.34 — 2026-04-16
- Fix: scoringUserId now falls back to session.user.id instead of hardcoded admin-coach-mud-hens string
- Fix: null guards added to all 4 Supabase write sites in useLiveScoring.js (audit, startHeartbeat, claimScorerLock, releaseScorerLock)

## v2.2.33 — 2026-04-16 — Meta-governance: Feature Map, Debt Ledger, Ship Gate
- Added `docs/product/FEATURE_MAP.md` — authoritative feature-to-doc-to-test mapping (18 feature rows)
- Added `docs/product/DOC_TEST_DEBT.md` — debt ledger with 21 known gaps (2 P0, 8 P1, 11 P2)
- CLAUDE.md: Ship Gate four-question ritual, Audit Cadence, Feature Map Update Rules, 8-step Session Start Command, STEP 0 Ship Gate in Deploy Checklist
- MASTER_DEV_REFERENCE.md: 8-step Session Start Command, updated Document Governance table
- `.claude/settings.local.json` files untracked (already in .gitignore); v2.2.31 scope creep root cause documented

## v2.2.31 — 2026-04-16 — Docs-only: FAQ, Personas, Solution Design drift repaired
- FAQ: added Attendance and multi-player Game Ball answers (Head Coach category)
- FAQ: updated walk-up song location FAQ; added Spotify deep-link FAQ (DJ Parent category)
- FAQ: new Scorekeeper category (3 FAQs — Live Scoring, scorer role lock, inning correction)
- FAQ: updated install banner FAQ and Google sign-in FAQ (Setup & Sharing category)
- PERSONAS.md: rewritten to 8 personas — added Dugout Parent, DJ Parent, Catcher Parent, Base Coach; Live Scoring and Admin Dashboard flipped to MVP; Auth Required updated to Phase 2
- SOLUTION_DESIGN.md: Auth Architecture section rewritten (Phase 3 → Phase 2, all [Twilio removed] tags cleaned); /health example updated (v2.2.31, db fields added); App.jsx line count updated to ~9,834; utils/ and components/ trees expanded; navigation table updated; Walk-up Songs Architecture subsection added

## v2.2.30 — 2026-04-16
- Fix: Out-tonight players now visible with red indicator across all 11 surfaces — diamond SVG, defense grid, Game Mode strip, share link diamond/table/batting, PDF bench/grid/batting card

## v2.2.29 — 2026-04-16
- Feat: liveScoringEnabled overridden to true for Mud Hens and Demo All-Stars by team name; all other teams still require live_scoring feature flag

## v2.2.28 — 2026-04-16
- Fix: Boot team merge changed from local-wins-entirely to additive — Supabase teams whose ID is not in localStorage are appended; zero impact when no new teams exist
- Fix: String() cast on team IDs prevents bigint vs string mismatch during boot merge comparison

## v2.2.26 — 2026-04-16
- Feat: playerMapper.js V1→V2 skill shim — skills[]/batSkills[] arrays now inferred as V2 enum fields (reliability, reaction, armStrength, speed, contact, power, swingDiscipline)
- UX: gameBall edit removed from inline schedule card; moved into game Edit modal with search filter + multiselect pills
- UX: gameBall displays as read-only 🏆 label on schedule card

## v2.2.25 — 2026-04-16
- Feat: Game Ball award supports multiple players — gameBall migrated from string to array; normalizeGameBall() coerces legacy data on read
- UX: Team tab renamed to My Team in bottom nav

## v2.2.24 — 2026-04-16
- UX: Game Day restructured — Lineups tab is now the default view with Tonight's Attendance above Defense/Batting sub-tabs
- Fix: QuickSwap in Game Mode now excludes absent players from swap candidate list; absentTonight threaded App.jsx → GameModeScreen → QuickSwap

## v2.2.23 — 2026-04-16
- Fix: validateGrid skips "Out" slots — no false warnings for absent players
- Fix: todayDate switched from UTC to local calendar date to fix attendance key mismatch during evening games

## v2.2.22 — 2026-04-15 (HOTFIX)
- Hotfix: auth gate re-commented out — was inadvertently blocking all unauthenticated users in prod
- useAuth hook, LoginScreen, RequestAccessScreen, PendingApprovalScreen imports preserved for Phase 4C cutover

## v2.2.21 — 2026-04-15
- Feat: activeBattingOrder — absent players filtered from batting order across PDF, share links, print, songs, game mode, Now Batting strip
- SharedView: player filter pills exclude absent names; absent note in batting footer
- Feat (v2.2.19): Game Day Attendance panel — mark players out before lineup gen, persisted to Supabase attendance_overrides column
- Fix: PendingApprovalScreen "Try logging in" now correctly transitions auth state
- Fix: supabase.js attendance_overrides support in dbSaveTeamData/dbLoadTeamData

---

## v2.2.18 — 2026-04-06
- Fix: MERGE_FIELDS extracted to single shared const (was duplicated at boot hydration and loadTeam hydration)
- Fix: division migration block now saves mergeLocalScheduleFields result instead of raw seed — gameBall/snackDuty/scoreReported no longer overwritten on migration run
- Fix: boot hydration now merges DB + local schedules instead of preferring local blindly — new Supabase games no longer silently dropped
- Feat: loginLimiter (15min window, max 5) created and applied to POST /magic-link — express-rate-limit was imported but never instantiated

---

## v2.2.17 — 2026-04-06
- Docs: legal content refresh — removed stale phone OTP references, updated auth to email magic link + Google sign-in, fixed phantom email reference, updated all legal doc dates to April 2026

---

## v2.2.16 — 2026-04-05
- Analytics: full PWA install funnel — pwa_banner_shown (platform, prompt_ready, browser), pwa_install_clicked, pwa_install_accepted, pwa_install_declined, pwa_installed with platform property

---

## v2.2.15 — 2026-04-05
- Feat: persistent PWA install banner — fixed above bottom nav on all tabs, Android install button or Chrome instructions, iOS Share → Add to Home Screen, no dismiss/snooze
- Fix: overscroll-behavior: none on html + body — prevents pull-to-refresh bounce (Android) and rubber-band scroll (iOS)

---

## v2.2.14 — 2026-04-05
- UTM tracking framework (trackingUrl.js) — auto-detects pwa vs web for utm_medium; CAMPAIGNS + CONTENT registries
- Migrated all 7 LINKS array outbound links to outboundLinkProps (utm_source=dugoutlineup on every click)
- Click-side outbound_click event captured before navigation — attribution decoupled from destination redirect behavior
- 17-test Vitest suite for trackingUrl utility (co-located in src/utils/)
- vite.config.js include widened to src/**/*.test.js for co-located test files

---

## v2.2.6 — 2026-04-04
- Analytics: device context super properties (os, device_type, platform, is_pwa, screen_width, screen_height, app_version) registered via mixpanel.register()
- Analytics: PWA install events (pwa_install_prompted, pwa_installed); super property override on install
- Analytics: first launch detection (is_first_launch on app_opened; first_launch event)
- Analytics: VITE_APP_VERSION wired as build-time env var
- Docs: docs/analytics/ANALYTICS.md — full event reference, identity model, dashboard configs

---

## v2.2.5 — 2026-04-04
- Analytics: 15 new Mixpanel events — Game Mode, QuickSwap, share link, auth funnel, batting hand, game result, app open, Mixpanel identity on team load
- Analytics: Vercel Analytics screen events (app_loaded, game_mode_entered, share_link_viewed, lineup_finalized)
- Analytics: track() + mixpanel init extracted to src/utils/analytics.js; imported in 6 files

---

## v2.2.4 — 2026-04-03
- Ops: activated Mixpanel analytics — wired VITE_MIXPANEL_TOKEN env var; 14 existing track() call sites now live in production

---

## v2.2.3 — 2026-04-03
- Feat: personalized home screen greeting uses coach first name from user.profile; falls back to "Coach" for guests/unauthenticated
- Fix: time bands corrected — Good night covers 9pm–5am; Good morning now starts at 5am (was midnight)

---

## v2.2.2 — 2026-04-03
- Fix: newGame template initializer and both setNewGame reset calls now include gameBall:"" and scoreReported:false
- Fix: non-active team boot hydration applies migrateSchedule + mergeLocalScheduleFields before writing to localStorage
- Fix: Mud Hens migration patch preserves snackDuty, gameBall, scoreReported from existing game entries

---

## v2.2.1 — 2026-04-03
- Ops: develop branch created with GitHub branch protection rules
- Ops: Render DEV service + dev.dugoutlineup.com environment planned
- Ops: backend envGuard middleware — rejectTestDataInProd checks TEST_TEAM_IDS; 403 in prod, console.warn in dev for real team IDs
- Ops: ci.yml triggers on both main and develop branches

---

## v2.2.0 — 2026-04-03
- Chore: test suite cleanup — deleted 7 stale OTP tests; fixed VAL-07 XSS; split RATE-01a/b; updated AUD-02/03 skip reasons
- Chore: suite-idempotency.js — upfront seed block, seedFailed guard, no inter-test dependency chain
- Chore: suite-auth-middleware.js added (AUTH-MW-01–08) — 8 protected endpoint rejection tests
- Chore: scoring.test.js Group 1 parameterized (7 bundled → 28 individual forEach tests)
- Chore: lineupEngineV2-unit.test.js added (30 tests: Groups A–E — output shape, field assignment, bench logic, batting order, edge cases)
- Chore: frontend test suite 205 total (204 passed / 1 skipped) across 8 files
- Ops: ci.yml — frontend build step added before Vitest so compile errors block CI gate
- Ops: /health — async DB connectivity check via Supabase teams read; db:ok/error + db_latency_ms; returns 503 on DB failure
- Ops: health-check.yml — new 6-hour GitHub Actions cron: /health db:ok, share link smoke (HEALTH_SHARE_KEY), /generate-lineup shape
- Docs: MASTER_DEV_REFERENCE.md — UptimeRobot gap documented, health-check.yml referenced

---

## v2.1.9 — 2026-04-03
- Fix: admin magic link redirectTo /admin.html
- Fix: Add Result button invisible on game day (gameDate <= today)

---

## v2.1.8 — 2026-04-03
- Chore: suite-team-data.js (7 tests), suite-feedback.js (6 tests), suite-contracts.js (7 tests)
- Chore: GitHub Actions ci.yml — push-to-main gate (Vitest + backend CI_SAFE mode against Render prod)
- Chore: GitHub Actions health.yml — cron every other day 7am ET, /ping + frontend load + job summary

---

## v2.1.7 — 2026-04-03
- Fix: admin approve route writes email + user_id to team_memberships (phone_e164 null)
- Fix: admin members endpoint returns email and user_id fields
- Fix: all four admin email notifications (approve/deny links + approve/reject API) look up team name from DB

---

## v2.1.6 — 2026-04-02
- Fix: Rules of Hooks violation — extracted renderSharedView into proper SharedView component
- Fix: non-active team card hydration — eager Supabase fetch on boot, warm localStorage skip, skeleton state while pending

---

## v2.1.5 — 2026-04-02
- Feat: Supabase runtime feature flags (007 migration)
- Feat: maintenance mode + coach bypass (?coach_access=mudhen2026)
- Feat: VIEWER_MODE, GAME_MODE, ACCESSIBILITY_V1 all toggle from Supabase dashboard instantly — no deploy needed
- Chore: all legacy line-up-generator.vercel.app URLs replaced with dugoutlineup.com

---

## v2.1.4 — 2026-04-02
- 154 frontend tests across 7 files (migration, scoring, formatters, flag bootstrap, bench equity)
- Extracted migrations.js, formatters.js, flagBootstrap.js utilities from App.jsx
- Husky pre-push hook: test suite runs before every push; failing tests block the push

---

## v2.1.3 — 2026-04-02
- Rebrand: all customer-facing surfaces renamed from Lineup Generator to Dugout Lineup (PWA manifest, index.html, login/access screens, legal docs, admin UI, About tab, PDF header, share text, install banner)

---

## v2.1.2 — 2026-04-02
- Fix: bottom nav fixed to viewport on mobile
- Fix: bottom nav and Now Batting bar hidden during Game Mode

---

## v2.1.0 — Phase 4B: Email OTP Auth (2026-04-01)
### Shipped
- Email OTP authentication via Supabase + Resend
- Access request pipeline (submit → admin notified → 1-tap approve → user notified)
- auth_events audit table with full device context on every auth action
- Migrations 008-012: email columns, role expansion, partial unique indexes
- Backend test suite: 60 tests across 9 categories
- Approve/deny link security TODO documented (Phase 5 item)
- PORT env var fix, DEFAULT_TEAM_ID fix, debug log cleanup

### Outstanding (Phase 4C)
- Frontend auth screens (LoginScreen, RequestAccessScreen, AuthGate)
- requireAuth gate activation on protected routes
- RLS enforcement (004_rls_fixes.sql — parked until frontend auth complete)
- Auth: email magic-link + Google OAuth (Twilio removed)

---

## ✅ MVP — Launched 3/24

### Core Engine
- 11-constraint auto-assign scoring engine with retry fallback
- Manual cell edits with issue detection + Auto-Fix All
- Schema versioning + migration runner (v1→current)
- Hard blocks: back-to-back, outfield repeat, benchOnce enforcement

### Roster Tab
- Player cards with V2 scoring attributes (Fielding, Batting, Running, Constraints) ✅
- Preferred / avoid positions per player
- Add/remove player with confirmation
- Innings selector (4/5/6)

### Field Grid Tab
- Full defensive grid with auto-assign + manual overrides
- Per-inning coverage summary

### Batting Tab
- Suggest Order (stats-driven)
- Desktop drag-to-reorder
- Season stats table (AB, H, R, RBI, AVG with color coding)

### Schedule Tab
- AI schedule import — photo, paste/text, manual, bulk
- Game result logging (score + per-player batting stats)
- Parse batting scorecard from photo or text dump
- View-only share link (URL-encoded snapshot)

### Print / PDF
- Toggle: Both / Defense Only / Batting Only
- PDF bundled via npm (jsPDF — no CDN dependency)
- Diamond view, grid, and batting order

### Infrastructure
- Supabase backend (primary data store)
- Render backend for AI parsing
- UptimeRobot ping to keep Render warm (5-minute interval)
- Vercel frontend deploy with CI/CD
- PWA — installable on iOS + Android, offline-capable after first visit
- Export / Import backup (JSON)
- 10-player field configuration: LC + RC replace CF in outfield; 1 bench slot per inning (schema v2, migration auto-remaps saved CF→LC)
- First-time coach onboarding modal (5-step in-app walkthrough, localStorage completion tracking, always re-accessible via "Getting Started" button in Roster tab)

### v2.0.5 — March 31, 2026
- **Fix: home screen team card** — Complete Roster badge no longer truncated; text wraps within grid-constrained column

### v2.0.4 — March 31, 2026
- **Fix: home screen team card** — top row converted to CSS grid (`1fr auto auto`); Open button and ellipsis get fixed width, Zone 1 strictly constrained — badges can no longer bleed into Open button on any screen size

### v2.0.3 — March 31, 2026
- **Fix: home screen team card** — Open button no longer bleeds into status badge; top row uses `flex-start` alignment
- **UX: rename** — "Game View Mode" → "Game Mode" on Next Game CTA card; consistent naming across all screens

### v2.0.2 — March 31, 2026
- **Fix: home screen team card** — Game Mode button moved to its own full-width row below the top row (team info + Open + menu); no longer bleeds into READY badge on narrow screens (iPhone SE / 375px)

### v2.0.1 — March 31, 2026
- **Fix: home screen team card** — Game Mode button no longer overlaps READY badge; card `alignItems` changed from `center` to `flex-start` so all three zones (team info, buttons, menu) anchor to the top

### v2.0.0 — March 31, 2026
- **Fix: mobile browser layout** — App shell uses `100svh` (small viewport height) in non-standalone mode; bottom nav no longer clipped by Edge/Safari mobile address bar
- **Fix: bottom nav padding** — Extra buffer applied in browser mode to prevent toolbar overlap
- Installed PWA unaffected — continues to use `100dvh` in standalone mode

### v1.9.9 — March 31, 2026
- **Game Mode icons**: Baseball bat (GiBaseballBat via react-icons) replaces ⚾ for all batting indicators — BATTING tab, What's Next card label, Start Batting button
- **Sport-aware fielding icon**: DEFENSE tab, What's Next fielding card + Take the Field button now show GiBaseballGlove for baseball teams and 🥎 for softball teams
- **App-wide sport awareness**: Game Ball label (Schedule tab) and Needs Attention dashboard card now use ⚾ vs 🥎 based on team sport
- **What's Next — player sort**: Field players and bench players in the fielding preview card are now sorted alphabetically by first name
- **Dependency**: react-icons added (GiBaseballBat, GiBaseballGlove from game-icons set)

### v1.9.8 — March 31, 2026
- **MyPlayer View**: renamed from Parent View; toggle moved to persistent Game Day subtab bar header; always visible across all Game Day subtabs

### v1.9.7 — March 31, 2026
- **Now Batting**: 36px bold, gold border, dominant visual treatment (ACCESSIBILITY_V1)
- **Batting queue**: 3-tier size hierarchy — 36px / 22px / 17px, color-coded
- **Aria-live**: NowBattingStrip announces batter changes silently to screen readers
- **InningModal**: batting preview font tiers match NowBattingStrip
- **Position labels**: full name in aria-label throughout game-day view

### v1.9.6 — March 30, 2026
- **Support tab**: FAQ sub-tab — 6 role-based categories (Head Coach, Dugout Parent, DJ Parent, Catcher Parent, Base Coaches, Setup & Sharing); 36 real-field Q&As; accordion with category picker; answer panel uses distinct background for readability
- **Game Mode**: inning transition modal dynamically shows batting order (team just finished defense → now batting) or defensive positions (team just finished batting → now fielding); gold/green color themes per context; batting section shows lead-off, on deck, in hole with L/R badges and dugout cues
- **Game Mode**: half-completion gate — `End Defense →` / `End Batting →` button replaces `Next →` until both halves are marked done; pill shows green ✓ on each completed half; resets on inning advance
- **UX**: Graceful exit sheet when tapping Home tab or team logo while on Team or Game Day — slide-up bottom sheet shows team name, warns if lineup is dirty (`lineupDirty && !lineupLocked`), two actions: Keep Working (primary) or ← Go to Home Screen; tapping overlay dismisses
- **Fix**: Deleted teams no longer resurrected from Supabase on app reload — localStorage is authoritative when non-empty; Supabase only seeds an empty local store (new install / cleared storage)
- **Fix**: Duplicate Demo All-Stars teams — `Try Demo Team` button hidden when a demo team already exists; `loadDemoTeam()` guard opens existing demo instead of creating a duplicate

### v1.9.5 — March 30, 2026
- **Accessibility Phase 1** (`ACCESSIBILITY_V1` flag, localStorage override `flag_ACCESSIBILITY_V1=true`):
  - Font floor: section labels 12px min, advance/pill button text 13–14px min in Game Mode
  - Touch targets: advance button ≥44px (padding 13px), pill toggles wrapped in 44px hit area
  - Contrast uplift in InningModal (dark overlay): `#475569`→`#e2e8f0`, `#64748b`→`#cbd5e1`, `#334155`→`#94a3b8`
  - Aria labels: advance button (dynamic), defense/batting pill toggles (aria-pressed), modal (role=dialog), Cancel/Confirm buttons
  - Position abbreviation labels: `aria-label="Pitcher"` etc. on defensive position chips
  - Focus management: Confirm button focused on InningModal mount
  - **Full feature guide**: `docs/features/accessibility-v1.md`
- **Reduced motion**: `prefers-reduced-motion` media query in global CSS (`src/index.css`) — disables all animations/transitions when OS setting is active
- `isFlagEnabled(flagName)` utility exported from featureFlags.js with localStorage override support
- **Test coverage**: `src/tests/accessibility.v1.test.js` — 19 tests across 4 groups (POSITION_LABELS completeness, flag registry, isFlagEnabled defaults, localStorage overrides)

### v1.9.4 — March 30, 2026
- **UX**: Home screen — 'View/Update Lineup' button renamed to 'View Lineup'

### v1.9.3 — March 30, 2026
- **Create Team form**: labels darker and bolder, field text larger (14px) and near-black, borders more visible, placeholder shows example team name

### v1.9.2 — March 30, 2026
- **Game Mode**: now available for any team with roster + schedule set — no longer gated on having an upcoming game date
- **Demo All-Stars**: pre-seeded 12-player team loadable from home screen via "Try Demo Team" button — lets coaches explore all features without setup
- **Create Team form**: input fields now use white background with dark text for readability on the dark home screen

### v1.9.1 — March 30, 2026
- **Game Mode bench**: all bench players shown stacked in infield position box; batting hand badge visible on each bench card; duplicate bench strip removed
- **Batting strips**: `PlayerHandBadge` (L/R) shown inline in Now Batting, On Deck, In Hole pills — pulls from roster via `roster` prop on `NowBattingBar`
- **Game Ball**: Schedule tab Snack Note field replaced with Game Ball player picker (⚾); same field editable from Snacks tab with ✕ clear; persists via `gameBall` on game objects + `MERGE_FIELDS`
- **Snacks tab**: Note field removed; Game Ball row added below Snack Duty on every game card
- **Team tab / Roster**: redundant player count context bar removed (player count already in dashboard)
- **Fix**: `normalizeBattingHand` import error on Add Player resolved
- **Onboarding**: Steps 4 and 7 updated from "Season tab" to "Team tab" (nav restructure v1.8.0)

### v1.9.0 — March 30, 2026
- **Batting Hand attribute**: optional "L" / "R" capture per player; `normalizeBattingHand()` util normalizes all raw values; `migration 005` backfills existing roster; `PlayerHandBadge` inline badge component; displayed in roster list, batting order editor, Now Batting / On Deck / In Hole strips; `BattingHandSelector` toggle in Add Player form and player card Batting section

### v1.8.6 — March 30, 2026
- **TEAM tab dashboard**: stats row emoji icons (👥 Players · 🏆 Record · 📅 Next Game) with dividers; Next Game always visible; W/L record colors match Schedule tab; Needs attention box replaced with icon cards

### v1.8.5 — March 30, 2026
- **Home screen**: "View Lineup" renamed to "View/Update Lineup"; "Game View Mode" CTA added (always visible when lineup locked) — navigates directly to Game Mode

### v1.8.4 — March 30, 2026
- **PWA**: autoUpdate service worker — new versions apply immediately, no manual update step required; `skipWaiting` + `clientsClaim` enabled

### v1.8.3 — March 30, 2026
- **Legal section**: Support tab → Legal sub-tab with 6 documents — Privacy Policy, Terms of Use, Child Safety, Content Standards, Access & Accounts, Report a Problem; drill-down reader with ‹ Back nav; no new dependencies

### v1.8.2 — March 30, 2026
- **Game Mode**: enabled for all users, feature flag gate removed; ▶ Game Mode button always visible on Game Day tab

### v1.8.1 — March 30, 2026
- **Team dashboard**: removed Add Player, Add Game, Snacks quick-action buttons (redundant to dedicated tabs)

### v1.8.0 — March 30, 2026
- **Nav restructure**: Roster + Season tabs merged into single **Team** tab with subtabs: Roster / Schedule / Snacks
- **Team dashboard**: header with player count, W/L record, and next game; status warnings for missing positions and unassigned snacks
- "Season" renamed to "Schedule" throughout

### v1.7.1 — March 29, 2026
- **React Error Boundaries**: `ErrorBoundary` class component at `src/components/Shared/ErrorBoundary.jsx`; 9 sections wrapped — Game Day (outer), Parent View, Now Batting, Lock Flow, Viewer Mode, Validation, Fairness Check, Offline Status, Team List; amber inline fallback card with tap-to-reset

### v1.7.0 — March 29, 2026
- **Backend health check**: `useBackendHealth` hook polls `/ping` on mount + every 5 min; cold-start pill in home screen header (amber "warming up" / red "unavailable" / gray "Connecting..." for first 3s only); inline warning in share sheet when server slow or down
- **Backend `/ping` + `/health`**: `/ping` returns `{ status, timestamp }` in <100ms; `/health` returns `{ status, uptime, timestamp, version }` — both no-DB, safe for external monitoring
- **UptimeRobot ops docs**: `docs/ops/UPTIME_MONITORING.md` with setup guide, frontend UX table, verification commands
- **Vitest regression suite**: 11 engine tests across 5 groups; 10 passing, 1 confirmed bug (sub-10 roster warning guard)

### v1.6.9 — March 29, 2026
- **Now Batting inning label**: "INNING N" label displayed above Now Batting pill strip in Game Day tab; syncs with active inning selection; shows "INNING —" when no inning selected
- **Fairness Check card**: post-finalization card in Defense tab showing three checks — every player benched ≥1 inning, no player pitched/caught >2× average, no back-to-back P/C assignments; green border when all pass, amber when any fail
- **Offline Ready indicator**: connectivity pill in app header — "Offline Ready" (green, local cache present + online), "Offline Mode" (amber, offline but cached), "No Connection" (red, offline + no cache); text hidden in landscape, dot always visible
- **Parent View Mode**: "👪 Parent View" toggle in Game Day innings strip; player picker scrollable pill row; per-player card showing batting slot + inning-by-inning positions with color-coded left borders; "← Full View" to return

### v1.6.8 — March 29, 2026
- **Home screen actionable roster button**: "Missing Roster" badge replaced with "Add Players →" (0 players) or "Complete Roster (N/10) →" (1–9 players); tapping navigates directly to team roster; shown for all teams with fewer than 10 players
- **Home screen empty states**: when no teams exist or search returns no results, show contextual empty state with icon, copy, and "+ Create Team" CTA

### v1.6.7 — March 29, 2026
- **Viewer Mode** *(feature-flagged OFF)*: read-only swipeable inning cards for parents/players; opened via `?s=…&view=true`; shows inning header, field positions, bench, batting order; Prev/Next footer; dark themed
- **Feature flag system**: `featureFlags.js` for global compile-time toggles; localStorage per-user override (`flag:<name>`); URL param bootstrap (`?enable_flag=<name>` / `?disable_flag=<name>`) for zero-deploy per-user rollout; full How-To in `docs/features/feature-flags.md`
- **Share link fallback**: both "Share as Link" and "Share Viewer Link" fall back to base64 URL encoding when Supabase is unavailable (local dev parity)
- **Team batting totals**: G / AB / H / AVG / R / RBI mini-block at top of Season Batting Stats box in Batting subtab
- **Finalization guards**: Suggest Order + 6/7 innings selector disabled when lineup finalized; Generate Lineup blocked on all surfaces (home card shows ✓ View Lineup instead); Finalize CTA blocked until batting order is saved
- **Batting order Undo**: snapshot captured before Suggest Order OR first ▲▼ arrow move; ↩ Undo button appears; clears on Save/Finalize/manual drag

### v1.6.6 — March 29, 2026
- **Now Batting Bar**: sticky strip above bottom nav on Game Day tab; 3-pill layout (Now Batting / On Deck / In Hole); ‹ › buttons to navigate backward/forward; current batter index persisted to localStorage
- **Player Filter Toggle**: viewer mode (share link) horizontal pill list; selecting a player highlights their position boxes, table row, and batting order card in amber

### v1.6.5 — March 28, 2026
- **Lineup Finalized — all 4 Game Day subtabs**: locked experience now consistent across Defense, Batting, Lineups, and Songs
- **Lineups tab**: ✓ Finalize button added to print/share toolbar (was only accessible from Defense)
- **Songs tab (Game Day)**: Edit mode hidden when lineup is locked — read-only Game Day View enforced

### v1.6.4 — March 27, 2026
- **Defense tab warnings**: per-warning Accept + Ignore All/Restore All; ignored warnings persisted to localStorage by game date; panel header turns green when all accepted
- **Sub-tab consistency**: all 4 sub-tab bars now use label-width buttons (flex:0 0 auto); no more 2-tab vs 4-tab size mismatch
- **Layout centering**: S.body capped at 600px centered; inner content wrapper 480px — fixes left-alignment on all tabs
- **Home background**: cream background correctly applied to all tabs; dark gradient reserved for More tab only
- **Team cards**: refactored to single flex row (name zone / Open / Ellipsis); status badge fixed at 120px width; name truncates with ellipsis
- **Hydration merge**: snackDuty + snackNote now protected from Supabase overwrite during cold-start window
- **Supabase backfill**: extended to cover all merge fields (scoreReported, snackDuty, snackNote)

### v1.6.3 — March 27, 2026
#### Defense Tab — Inning Completion Indicators + Position Lock
- UX: Defense tab — inning column headers show green ✓ indicator (green text + green border wash) when all 10 field positions + at least 1 bench are filled for that inning
- UX: Defense tab (By Player view) — position dropdowns disable already-taken positions for that inning; Bench option locks after 1 player is assigned to bench

### v1.6.2 — March 27, 2026
#### Home Screen Icon Cleanup
- UX: Status badges use 6px CSS colored circles instead of emoji dots (product-grade look)
- UX: Team card game alert date uses ▸ symbol instead of 📅 emoji
- UX: Per-card Generate Lineup button — removed ⚡ emoji prefix

### v1.6.1 — March 27, 2026
#### Home Screen Polish + scoreReported Persistence Fix
- Fix: scoreReported flag no longer resets on team reopen — Supabase hydration now merges local `scoreReported: true` instead of overwriting it
- UX: Home screen team card — "Missing Schedule" badge (consistent with "Missing Roster"); italic CTA hints below card for each missing item
- UX: Home screen — per-team ⚡ Generate Lineup button on every Ready team card that has an upcoming game
- Fix: Generate Lineup CTA filtered to Ready teams only (both roster + schedule must be present)

### v1.6.0 — March 27, 2026
#### Share Links + Team Management + Quick Summary Enhancements
- Feat: Short share links — 8-character Supabase-backed IDs (`?s=xxxxxxxx`) replace long URL-encoded payloads; mobile share sheet (navigator.share) supported; Supabase `share_links` table with public read + insert RLS
- Feat: Quick Summary enhancements — sortable Player / R / AVG columns; Games (G) column; AVG color coding matches season stats table
- Feat: County score report checkbox — per completed game "I have reported the score to the County" checkbox; persisted to schedule state + Supabase
- Feat: Home screen team search bar — appears at 3+ teams; real-time filter by team name, age group, or sport
- Feat: Create team sport + age group — Baseball/Softball dropdown; 5U–12U age group dropdown; form fully resets on open, cancel, or save
- Feat: Edit team — ··· context menu on any team card opens edit modal to update name, sport, and age group; saved to localStorage + Supabase
- Feat: Backup export completeness — coachPin now included in backup JSON; restores on import
- Fix: homeMode resets to 'welcome' on all Home nav paths (Home tab click, logo click, delete team)
- Fix: stale schedule closure no longer overwrites battingPerf when county checkbox is toggled
- Fix: app-shell layout — replaced position:fixed bottom nav with flex column to fix scroll and iOS keyboard push-up

### v1.5.1 — March 26, 2026
#### Quick Summary Season Stats Bug Fix
- Fix: Quick Summary AB/H/R/RBI totals now calculate correctly — values were stored as strings from input fields and being string-concatenated instead of summed
- Fix: parseInt applied to all batting stat accumulations in Quick Summary (`getRosterSeasonStats`)
- Fix: only completed games (result logged) counted toward season totals, matching Season tab behavior

### v1.5.0 — March 27, 2026
#### Coach PIN Protection + Locked Roster + Batting Improvements
- Feat: coach PIN protection — 4-digit PIN gates Finalize and Unlock; set/change/remove from Game Day → Lineups tab; PIN persisted per team to localStorage + Supabase (`coach_pin` column, migration 007)
- Feat: locked roster read-only — all player cards auto-collapse when lineup finalized; expand toggle disabled; Add Player and Remove buttons hidden; attribute editing blocked with locked notice
- Feat: batting Save Order button — appears only after manual drag reorder; amber "● Unsaved changes" indicator; "✓ Saved" confirmation fades after 2s; Suggest Order auto-clears dirty state
- Feat: sortable season stats table — tap Player / R / AVG column headers to sort; ↑ ↓ ↕ direction indicators; 0 AB players always sort to bottom on AVG sort; AVG color coding preserved
- UX: home screen redesign — compact greeting + date header; gold Open button per team card; left-strip game alert (red = today, amber = tomorrow, muted = upcoming); dot-separated metadata row; "Tap Open to add your roster" hint on empty teams

### v1.4.0 — March 26, 2026
#### Nav Overhaul + About Tab + Lineups UX
- UX: primary tabs moved to fixed bottom nav bar (portrait) — standard iOS/Android pattern, 4 primary tabs (Roster, Game Day, Season, More), gold active indicator
- UX: Roster tab — Players and Songs sub-tabs; walk-up song management moved from Game Day to Roster → Songs
- UX: Game Day — Songs sub-tab replaced by Lineups sub-tab (print/PDF view absorbed into Game Day)
- UX: More tab — Updates sub-tab added; What's New version history moved there; sub-tabs reordered to About / Updates / Links / Feedback
- UX: About tab — coach/parent-friendly description at top; sections reordered; version badge inline; Open in Browser link; Getting Started → Share App Now
- UX: What's New — previous versions collapsed by default, current version auto-expanded
- UX: Songs tab — Game Day View is first and default landing; redundant Edit button removed
- UX: Lineups (Print) — Bench displays as X in grid; position legend added; buttons renamed Download as PDF / Share as Link / Share as PDF; Backup CTA removed; Grid/Diamond toggle moved to top row
- Fix: onboarding guide updated with correct tab references for new 4-tab nav structure
- Fix: game day pill shows GAME DAY not TOMORROW — Math.round → Math.floor for day diff

### v1.3.9 — March 26, 2026
#### Bug Fixes + Nav Restructure
- Fix: Open button on Home tab unclickable when ··· context menu overlay was active — zIndex fix
- Fix: data persistence audit — migrateSchedule spread preserves future game fields; snackDuty consolidated onto game objects (game.snackDuty / game.snackNote); importTeamData now restores locked state from backup
- UX: nav restructure — 5 primary tabs with nested sub-tabs (Game Day: Defense/Batting/Songs; Season: Schedule/Snacks; More: Feedback/Links/About)
- Fix: migrateBattingPerf — remaps old initial+lastName batting stat keys (e.g. "A Hwang" → "Aiden Hwang") to full player names on load
- Fix: roster players sorted alphabetically by firstName at render time in Roster tab, Snacks tab dropdown, and Schedule tab snack dropdown

### v1.3.8 — March 26, 2026
#### Snack Duty Tab
- New Snacks tab — per-game player assignment with roster dropdown and optional note field
- TODAY badge + gold border highlight on game day card
- Past games de-emphasized (opacity), canceled games hidden
- Summary header: assigned count out of total games
- snackDuty persisted to localStorage, Supabase (snack_duty JSONB column), export backup, and import restore
- Fix: game time strips leading zero (7:00 PM not 07:00 PM)

### v1.3.7 — March 26, 2026
#### Walk-Up Song Links + Smart Time Printing + Print Enhancements
- Snack duty field on game card — add/edit in schedule form, shown with 🍎
- Walk-up song link field — URL per player, clickable in Game Day View, included in share text and PDF
- Smart time printing — default times (0:00/0:10) suppressed in PDF and Game Day View; asterisk note added when applicable
- Songs tab opens in Game Day View by default with sync warning banner
- Batting order note added to all print views (on-screen print card and generated PDF)
- Team context menu (···) on home screen — backup and delete available for any team, not just active
- Restore from backup file available on empty roster screen (no Supabase required)
- Fix: battingPerf migration merge checks localStorage before Supabase — prevents empty {} overwriting local stats

### v1.3.6 — March 26, 2026
#### Walk-Up Songs + Player Data Preservation
- Walkup songs — per-player field with title, artist, start/end time, coordinator notes
- Walkup song display on player card (hidden when empty)
- Walkup song edit form in player profile editor
- Fix: migrateRoster now spreads all existing player fields before normalizing — any future player fields are no longer silently dropped on app load, team switch, or Supabase hydration
- Fix: walkup song and all V2 attributes now survive full round-trip through migrateRoster

### v1.3.5 — March 25, 2026
#### Diamond View Inning Fix
- Diamond view all-innings mode now shows all coach-configured innings (4, 5, or 6)
- Removed hardcoded Math.min(4) cap that silently cut display to 4 innings regardless of config
- Position box height and SVG viewBox now scale dynamically with inning count

### v1.3.4 — March 25, 2026
#### Batting Stat Display Fixes
- Batting averages no longer show leading zero (.333 not 0.333)
- Zero at-bats now shows --- instead of 0.000 or NaN
- Counting stats (AB, H, R, RBI) always display as integers, never as decimals
- `fmtAvg` and `fmtStat` helpers applied across all 6 display locations: player cards, Quick Summary table, batting tab season stats, batting order card, schedule game-entry AVG

### v1.3.3 — March 25, 2026
#### Roster Protection System
- Migration fix: schedule-only update for existing teams — roster never overwritten by re-seed
- `roster_snapshots` Supabase table with auto-prune trigger (keeps last 10 per team)
- Auto-snapshot on every player add, remove, and edit (`auto_save` event)
- Snapshot on Supabase hydration at app load (`app_load` event)
- In-app roster recovery UI: "Restore previous roster" link visible when roster is empty
- Recovery modal shows up to 5 snapshots with timestamp, player count, and trigger event
- Resolves Bananas roster loss incident

### v1.3.2 — March 25, 2026
#### UX Restructure + Data Integrity Guards
- Navigation: two-row portrait nav (team tabs / global tabs), explicit ← Home button
- Home screen: collapsible What's New, dark-styled Links section
- Quick Summary table: AB/H/R/RBI columns
- Add Player form: collapsible (hidden by default)
- Supabase hydration race fix: loading indicator, Auto-Assign disabled until roster loads
- Data-loss guard: empty roster never overwrites Supabase; persist helpers skip cloud sync during hydration

### v1.3.1 — March 25, 2026
- Fixed V2 lineup engine: LC/RC positions now assign correctly
- Batting order updates automatically after every auto-assign

### v1.3.0 — March 25, 2026
#### Player Profile & Scoring Engine Rebuild
- Rebuilt player profile UI with V2 collapsible card system
- New sections: Fielding (Reliability, Reaction Timing, Arm Strength, Ball Type, Field Awareness), Batting (Contact, Power, Swing Discipline, Batting Awareness), Base Running, Effort, Lineup Constraints, Development Focus
- Lineup Constraints card: Skip Bench flag, Out This Game flag, Preferred Positions, Avoid Positions — all in one place, expanded by default
- Removed legacy Skills, Coach Notes, and Batting Skills sections from player card UI (data preserved, engine still uses for V1)
- Add Player form: split into separate First Name + Last Name fields with capitalization
- `firstName`/`lastName` stored as separate fields on player object
- Last Updated timestamp on each player card
- V2 lineup engine (`lineupEngineV2.js`): position-specific scoring with 9 position formulas
- `scoringEngine.js`: 11 shared scoring functions (fieldScore, battingScore, runningScore, battingOrderScore, positionScore, benchCandidateScore, getBallTypeFit, awareness scores)
- `playerMapper.js`: safe V1→V2 field mapping with defaults for all missing fields
- `migrateRoster()` updated to preserve all V2 fields across team switches
- `featureFlags.js`: `USE_NEW_LINEUP_ENGINE=true` (V2 active, V1 fallback on error)
- Auth system (parallel, not yet gated): request access, email magic-link login, admin approval, admin UI at `/admin.html`

### v1.2.1 — March 24, 2026
- Added Sharon Springs Athletics link to Links tab (sharonspringsathletics.org)

### v1.2.0 — March 24, 2026
- Redesigned diamond view: SVG field with green background, outfield arc, dirt infield ellipse, base diamond, pitcher mound, and realistic position coordinates
- Dual-zone position boxes: dark header band (per position group color) + low-opacity player name area
- Single-inning mode: large name (14px bold), inning badge pill, bench player pill at bottom-right
- All-innings mode: compact first names per inning slot, taller 82px boxes, dynamic 680×680 viewBox
- First-name display enforced in all views — bench strips, grid, print tab, share link
- About tab: onboarding guide expanded by default, sections reordered (guide → app info → version history)
- Vercel Analytics + Mixpanel event tracking
- Schedule tab: computed batting average replaces BB column; stats legend added

### v1.1.0 — March 24, 2026
- Replaced Practice tab with Feedback tab (free-form feedback + bug reporting with localStorage persistence)
- Added About tab (app info, version history, inline onboarding guide)
- APP_VERSION constant + VERSION_HISTORY array in codebase
- Fixed LC/RC position colors (blue/purple, high contrast)
- Schema v2 + CF→LC migration
- 10-player field configuration (LC + RC replace CF)
- First-time coach onboarding modal (5-step)

---

## 🔴 P1 — Bugs / Critical Gaps

| # | Item | Notes |
|---|------|-------|
| 1 | **Mobile drag-to-reorder (batting)** | Touch drag is fragile — number circle as drag handle exists, but tap up/down arrow fallback is not yet implemented |
| 2 | **Sticky player name column (field grid)** | Horizontal scroll on mobile loses player names — original fix deferred in single-file build |
| 3 | **`Confident` vs `goodCoachability` weight parity** | Both tags have identical scoring mods — `Confident` should boost high-pressure positions (P, SS, C) more aggressively; `goodCoachability` should distribute more evenly |
| 4 | ✅ **Player absent flag (per game)** | Resolved in v1.3.0 — Out This Game flag in Lineup Constraints card |
| 5 | **Mud Hens g2 batting stats** | SQL restore in Supabase pending — two-query fix identified, not yet applied |

---

## 🟡 P2 — High-Value Enhancements

| # | Item | Notes |
|---|------|-------|
| 1 | **Print card metadata** | Team name, date, and opponent are hardcoded — should be pulled from team/game context |
| 2 | **"Revert to Generated" button** | After manual grid edits, no way to revert to the last auto-assigned state without full regeneration |
| 3 | **"Avoid Positions" collapsed by default** | 9 buttons per player adds excessive height on mobile; should be a disclosure, collapsed by default |
| 4 | **Reset Roster confirmation prompt** | Currently destructive with no warning dialog |
| 5 | **Per-game batting order** | Order should be regeneratable after each game using latest cumulative stats; stat-to-order feedback loop needs polish |
| 6 | **Practice Tab** | Session log with date, focus area, drill notes, and player attendance checkboxes — fully specced, not yet built |

---

## 🟢 P3 — Code Quality / Observability

| # | Item | Notes |
|---|------|-------|
| 1 | **`autoAssign` / `autoAssignWithRetryFallback` contract** | Output should explicitly carry: final grid, warnings, attempts used, fallback-invoked flag — enables observability and easier future debugging |
| 2 | **UI component tests (React Testing Library)** | Engine unit + integration tests exist; UI layer has zero test coverage |
| 3 | **E2E tests (Playwright or Cypress)** | No end-to-end coverage — critical before auth ships |
| 4 | **File split — renderSchedule and large render functions** | `renderSchedule` is ~593 lines doing the work of 4–5 components; blocking future feature velocity |
| 5 | **TypeScript migration** | Still `.jsx`, no types — lower priority but growing tech debt |
| 6 | **ESLint config** | No linting enforcement in the repo |

---

## 🚧 Blocked

| # | Item | Notes |
|---|------|-------|
| 1 | **Auth Phase 4 cutover** | Add requireAuth middleware to existing routes. Auth: email magic-link + Google OAuth (Twilio removed). |

---

## ✅ Resolved / Won't Fix

- **Android PWA screenshot restriction** — OS-level security policy on standalone PWA windows. Not fixable in web code without breaking Game Mode UX. Workaround: Share Link. iOS unaffected. Closed April 2026.

---

## 🅿️ Parking Lot / Future Considerations

### PIN Reset Flow
**Problem:** If a coach forgets their PIN, there is currently no recovery path — the lineup stays locked indefinitely.

**Proposed solution:** Add a "Forgot PIN?" link in the unlock modal. Since the app has no auth yet, recovery options are limited:
- **Option A (simple):** "Forgot PIN?" clears the PIN and unlocks after a `confirm()` dialog — accepts that anyone with the phone can bypass, but unblocks the coach.
- **Option B (better, post-auth):** Send a reset code to the coach's phone via Supabase OTP — only available after Phase 3 auth ships.
- **Option C (middle ground):** Show the team name + a prompt to contact the app admin, with an admin override endpoint that clears the PIN via the backend.

**When to do it:** Option A can be added in ~30 min at any time. Options B/C depend on Phase 3 auth.

---

### Theme System (Phase 3 — Post-Component Refactor)
**Recommended approach:** Design tokens + ThemeContext + localStorage persistence
**Why deferred:** App.jsx is a 5,000+ line monolith with hundreds of hardcoded hex colors. A proper theme system requires finding and replacing every hardcoded color — a 2-3 day refactor with high regression risk. Best done alongside the planned App.jsx component split.

**When to do it:** After App.jsx is broken into components. Theme tokens and component split can be done together cleanly.

**Proposed themes:**
- Classic Navy (default) — current branding, #0f1f3d background
- Slate + Teal (recommended for usability) — #0f172a background, #14b8a6 primary
- Field Green (sports vibe) — #0d2818 background, #27ae60 primary

**Implementation plan (ready to execute when timing is right):**
1. /src/theme/themes.ts — design token definitions
2. /src/context/ThemeContext.tsx — React context + useState
3. localStorage persistence for user preference
4. Theme selector UI in Settings/About tab
5. Replace all hardcoded colors with theme.colors.* references

---

## 📦 Backlog — Ready to Implement

### iOS PWA Install Coaching Overlay

**Status:** Ready to implement (spec complete)
**Effort:** Small — frontend only, no new packages, no backend changes
**Priority:** Medium — high-value for first-time iOS coaches
**Spec doc:** [`docs/features/ios-pwa-install-overlay.md`](../features/ios-pwa-install-overlay.md)

**Summary:** iOS Safari has no `beforeinstallprompt` event. Users must manually tap Share → Add to Home Screen. Without coaching UI, most iOS users never install the PWA. This feature adds a bottom-sheet overlay that guides coaches through the steps at the right moment.

**Trigger conditions:**
- iOS Safari only (detected via UA string)
- NOT already in standalone mode
- NOT previously dismissed
- Show on 2nd+ visit OR after lineup generation completes (intent signals)

**Files to create/modify when implementing:**

| File | Action |
|------|--------|
| `frontend/src/hooks/useIOSInstallPrompt.js` | CREATE |
| `frontend/src/components/IOSInstallBanner.jsx` | CREATE |
| `frontend/src/App.jsx` | MODIFY — hook + render + window trigger |
| `frontend/package.json` | MODIFY — bump version |

---

## 🔵 Phase 3 — Auth + Multi-Coach

> **Backend infrastructure deployed as of v1.3.0. Auth: email magic-link + Google OAuth (Twilio removed).**

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Email magic-link auth** | ✅ Backend live | No-password flow; magic link via Supabase + Resend; `request-access` → admin approval → magic-link login |
| 2 | **Admin UI** | ✅ Live at `/admin.html` | 4-tab UI: Pending Requests, Members, Feedback, Settings |
| 3 | **access_requests + profiles + team_memberships tables** | ✅ Deployed | RLS policies active; `activate_membership` Postgres function atomic |
| 4 | **Feedback backend endpoint** | ✅ Live | `POST /api/v1/feedback` → `feedback` table in Supabase |
| 5 | **Coach backfill** | ✅ Done | Kaushik (admin) + Stan Hoover (coach) seeded in `team_memberships` |
| 6 | **Phase 4 cutover** | 🔴 Blocked | Add `requireAuth` middleware to existing routes |
| 7 | **Role system (frontend)** | ❌ Not started | Head Coach / Assistant (edit) / Viewer (read-only) — requires Phase 4 cutover first |
| 8 | **Invite flow (frontend)** | ❌ Not started | Coach → Settings → Invite by email → magic-link → auto-assigned to team |
| 9 | **Viewer-mode shell** | ❌ Not started | Stripped tab bar; skill/tags hidden from viewer role |
| 10 | **Supabase Realtime** | ❌ Not started | Lineup lock → live push to assistant and viewer phones |
| 11 | **Season-end skill calibration report** | ❌ Not started | Compare auto-assigned vs actual played positions |
| 12 | **iCal / calendar import** | ❌ Not started | Alternate path alongside AI photo/text import |

---

## 🟣 Phase 4 — Quality & Automation

| # | Item | Notes |
|---|------|-------|
| 1 | **Automated pre-deploy test suite** | Run on every push to main before Vercel deploy triggers. Must cover: Chrome + Safari on Android and iOS (BrowserStack or Playwright cloud), desktop Chrome + Safari (Mac + PC), portrait and landscape orientations, all 7 tabs smoke-tested, LC/RC position colors validated, first-name display rules enforced, 1-bench-per-inning rule checked, PDF generation, share link, export/import backup, Supabase sync |
| 2 | **CI/CD pipeline (GitHub Actions)** | Trigger on every PR and push to main: run build, run unit tests (engine.test.js), run E2E suite (Playwright), block deploy if any step fails — Vercel deploy only triggers on green pipeline |
| 3 | **UI component tests (React Testing Library)** | Cover: tab navigation, auto-assign trigger, manual grid override, batting order drag, share link generation, feedback form submission |
| 4 | **Engine regression tests — LC/RC + 10-player** | Validate every auto-assign run produces exactly 1 bench slot per inning for 11-player roster, no CF in output, LC and RC both assigned across 6 innings, no outfield repeats per player |
| 5 | **Visual regression testing** | Screenshot diffs on diamond view after any layout change — catches position box drift, color regressions, and broken field background |
| 6 | **Cross-browser matrix via BrowserStack** | Automated runs on: Chrome Android, Safari iOS, Chrome Windows, Safari macOS, portrait + landscape — triggered on every version bump |

---

## 🗓 Recommended Next Sprint (Sequenced)

0. ✅ **v1.2.0 shipped** — diamond view redesign, responsive position boxes, first-name enforcement, analytics
1. ✅ **Verify 10-player auto-assign on live roster** — open Mud Hens, run Auto-Assign across 6 innings, confirm 1 bench/inning and no CF
2. **Player absent flag** — ~2–3 hrs, high game-day utility
3. **Mobile batting reorder arrow fallback** — ~1–2 hrs, biggest UX gap at the field
4. **Print card metadata** (team name, date, opponent) — ~1 hr
5. **`Confident` vs `goodCoachability` weight fix** — ~30 min, correctness issue
6. **"Revert to Generated" button** — ~1–2 hrs
7. ✅ **Verify onboarding modal on live app** — open app in a fresh browser session (or clear localStorage), create a new team, confirm 5-step modal appears; complete it and confirm it does not reappear on reload; confirm "Getting Started" button reopens it on demand
8. **Set up GitHub Actions CI** — block Vercel auto-deploy unless build + engine tests pass; 2-hour setup, eliminates broken deploys

> **Note:** File split (P3 code quality) should happen in parallel with or just before Phase 3 auth work. It will reduce new feature implementation time by ~40%.

---

## Phase 5 — Security Hardening

### Approve-Link Token Security
- Current approve/deny links in admin emails are unsecured (UUID only)
- Phase 5: implement HMAC-signed tokens with 24hr expiry
- See docs/TODO_approve_link_security.md for full implementation plan
- Blocks: none — implement before opening to multiple teams

---

## Phase 5 — Multi-Team & Delegated Access

### Phase 5A — Self-service team creation
- Head coaches can create their own team without platform_admin involvement
- Team creation flow: name, age group, sport, division
- Auto-assigns creator as team_admin of the new team

### Phase 5B — Delegated approval
- team_admin can approve coach/coordinator requests for their own team
- platform_admin only receives and approves team_admin requests
- Notification routing: team_admin requests → platform_admin, 
  coach/coordinator requests → team_admin of that team

### Phase 5C — Team switcher UI
- Multi-team users see team switcher on home screen
- Favourite badge to pin primary team
- Search bar to find other teams
- One Supabase user, multiple team_memberships rows

### Phase 5D — Team join links
- Head coach generates QR code / shareable link for their team
- Pre-fills team ID and role in RequestAccessScreen
- Separate links per role (head coach link, assistant link, coordinator link)

### Phase 5E — Head coach onboarding flow (replaces manual Supabase creation)
- Platform admin sends "Create your team" invite link to new head coach
- Head coach fills out team details + their own profile
- Team is created, head coach gets team_admin membership automatically

---

## Backlog

### Automated Score Reporting (County Integration)
**Status:** Architecture finalized, implementation pending
**Trigger:** Coach taps "Report Score" on a completed game

**Approach — n8n webhook orchestration (Option C):**
The county uses Microsoft Forms (anonymous, no login required). Direct URL pre-fill does not work (Microsoft Forms ignores query parameters). Direct backend submission is blocked by a session-bound CSRF token (`__RequestVerificationToken`) tied to a `FormsWebSessionId` cookie.

Solution: n8n workflow that:
1. GETs the form page fresh to obtain a live session cookie + CSRF token
2. Extracts `__RequestVerificationToken` from the HTML response
3. Immediately POSTs the submission to the Microsoft Forms API using the live token + cookie
4. Returns success/failure to the Dugout Lineup backend
5. Backend responds to app → app marks `scoreReported: true`

**Why not other approaches:**
- URL pre-fill: Microsoft Forms ignores query parameters (tested and confirmed)
- Direct backend POST: Blocked by CSRF token tied to browser session
- Form scraping: Fragile, against ToS
- Option deferred: Ask county to set up Power Automate webhook on their tenant (cleanest long-term solution — added as fallback if n8n approach becomes unstable)

**Microsoft Forms endpoint:**
```
POST https://forms.office.com/formapi/api/b9c4fdbd-efb6-477a-9fb3-32624a22cd70/users/fac416ea-6b9a-4181-b609-5ed2b010e9b0/forms('vf3EubbvekefszJiSiLNcOoWxPqaa4FBtgle0rAQ6bBURVExSDNDNEFTTkRaMVlRR0lNUDVGOUtFVy4u')/responses
```

**Field ID map (confirmed from live form API):**
| Field | ID | Type | Notes |
|---|---|---|---|
| Game Date | `rb77e5417b7f24d67a8e51b867cbc7253` | DateTime | Format: `YYYY-MM-DD` |
| Game Time | `ra3fc47859a864e21bf157e99e63df454` | Choice | Format: `"6:00 pm"` lowercase |
| Athletic League | `rae553b14cd27469d834903d9c1177096` | Choice | Static: `"Baseball"` |
| Age Group | `rbe7503c08cfa4e6da8e64582985cfedb` | TextField | Static: `"8U"` |
| Park Name | `rde02039428f3478a9b23fc134bab08cd` | Choice | Exact form values (see park map) |
| Field # | `r9eca2d2679a548ffbdbd6f5759d84d16` | Choice | Format: `"Field 1 "` (note trailing space) |
| Visitor Team | `r2163ab1a2bbd45d3b6a6a0b87b08504d` | TextField | |
| Visitor Score | `r000f1369832b4a3d89a4a6012f5e37f0` | TextField | |
| Home Team | `r26ac0e710b5446ac80a1a39c1ff88ff9` | TextField | |
| Home Team Score | `rc13b3be1dd6f4a23b82d8e9dd7a73e90` | TextField | |

**Home/Away logic:** `game.home === true` → Mud Hens are Home Team, opponent is Visitor. Flip when false.

**Park abbreviation map** (from existing `location` field):
| Abbreviation | Full Name |
|---|---|
| JV | Joint Venture |
| FP | Fowler Park |
| SS | Sharon Springs Park |
| BP | Bennett Park |
| CP | Central Park |
| CM | Coal Mountain Park |
| LP | Lanierland Park |
| MP | Midway Park |
| SMP | Sawnee Mountain Park |

**Schema changes needed before implementation:**
- Add `parkName` and `fieldNumber` as explicit fields on game objects (currently encoded in `location` string e.g. `"JV 2"`)
- Write migration to backfill from existing location values
- Update Add/Edit Game form UI to use dropdowns for Park Name (9 options) and Field # (1–9)

**n8n workflow to build:**
- Webhook trigger → HTTP GET form page → Code node extract token/cookie → HTTP POST submission → Respond to webhook
- Add webhook URL to smoke test Category 5 reachability check
- Add error alerting if POST returns non-201

**Risk:** Token extraction pattern could change if Microsoft updates their form page HTML. Mitigate with error alerting and Power Automate (county-side) as fallback.

---

## Architecture Notes

- **Storage:** Supabase (primary) + localStorage (offline cache with sync-on-connect)
- **AI backend:** Render free tier — keep warm via UptimeRobot 5-min ping at `https://lineup-generator-backend.onrender.com/ping`
- **Frontend:** Vercel — auto-deploys on push to `main`
- **Auth backend deployed (Phase 3):** Email magic-link auth live on Render (Twilio removed). Frontend cutover pending. Until then, all routes remain open (no `requireAuth` middleware on existing routes).
