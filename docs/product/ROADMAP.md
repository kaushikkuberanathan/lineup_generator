# Lineup Generator — Product Roadmap

> Last updated: April 28, 2026 (v2.5.3 staged on develop; v2.5.1 shipped to production via PR #27, commit `aadddcd`)
> MVP launched: March 24, 2026

---

## v2.5.3 — 2026-04-28 (develop staged; awaiting prod merge)

Meta-governance patch. No user-facing changes.

- `VERSION_HISTORY` extracted to `frontend/src/data/versionHistory.js` (same pattern as `migrations.js`, `formatters.js`, `flagBootstrap.js`)
- New test: `frontend/src/__tests__/versionHistory.test.js` — 3 tests, enforces all `techNote` values are in the approved set
- 24 historical `techNote` strings corrected (v2.1.x–v2.4.0) to use the approved set
- Named `### UPDATES TAB CONTENT RULE` heading added to `CLAUDE.md` for grep auditability
- `versionHistory.js` added to extracted-modules list in `CLAUDE.md`; non-approved `'Meta-governance release.'` techNote example in deploy checklist replaced with approved string

## v2.5.2 — 2026-04-28 (develop staged; awaiting prod merge)

Game Mode polish release + VERSION_HISTORY content governance patch:

**VERSION_HISTORY governance patch (this session)**
- `VERSION_HISTORY` extracted to `src/data/versionHistory.js` (mirrors `migrations.js`, `formatters.js`, `flagBootstrap.js` pattern)
- New test: `frontend/src/__tests__/versionHistory.test.js` — enforces all `techNote` strings are one of the four approved values
- 24 non-approved `techNote` strings corrected across VERSION_HISTORY (v2.4.0, v2.3.4, and 22 older entries that pre-dated the rule)
- Named `### UPDATES TAB CONTENT RULE` heading added to CLAUDE.md — grep-auditable

**Game Mode polish release covering three themes:**

Game Mode polish release covering three themes:

**Count strip overhaul**
- Two scope-grouped pills separate count (BALLS / STRIKES) from outs
- Stacked label-above-value cells: INNING / BALLS / STRIKES / OUTS — full label parity
- Outs pill uses warm tint (#FF8C42) to signal half-inning advancement
- Single render surface: top pill binds dynamically to active batter via `isHomeBatting`
- Removed legacy bottom opponent count strip (eliminated duplicate render surface)

**Toast primitive + half-inning notification**
- New Toast UI primitive: top-anchored, dismissable, auto-clearing
- Half-inning notifications migrated to Toast — appear at top, one-tap dismiss

**Mercy banner symmetry**
- Banner now renders symmetrically for both home and opponent halves

## v2.5.1 — 2026-04-27 (prod ship; develop merge 2026-04-24)
- ACCESSIBILITY_V1 follow-up + UX consolidation + v2.4.0 home/away preservation.
- `truncateTeamName()` upgraded: word-boundary-aware abbreviation ("Timber Rattlers" → "T. Rattlers"), unicode ellipsis for single-word overflow, default cap 12.
- `GameContextHeader` component removed; game number relocated as inline `Game N` chip in all 3 scoring header strips (conditional — hidden in practice/orphan games).
- New: `HomeAwayChip` component — amber `@ Away` chip for away games, neutral `Home` chip for home games; rendered adjacent to `Game N` chip at all 3 render sites. Guard: `typeof selectedGame.home === 'boolean'`.
- STATE 1 splash subtitle: home/away connector restored (was hardcoded `vs`; now `@ teamName` for away games); contrast: 12px `#64748b` → 14px `#cbd5e1` (12.21:1 ratio, AA+).
- `ScoreboardRow` typography: team labels 10px → 16px, `#aaa` → `#e2e8f0`, weight 700; gold `borderTop` accent added.
- `ScoreboardRow` overflow guardrail: cap=10 for label props, `minWidth:0` + `overflow:hidden` on container.
- `deriveGameHeader()`: `connector` and `homeIndicator` fields marked deprecated in JSDoc — no longer consumed in production after `GameContextHeader` removal.
- Tests: `opponentNameLabel.test.js` and `gameHeader.test.js` updated to new word-boundary expectations; 2 net new tests; suite 419 → 421.

## v2.5.0 — 2026-04-24
- Feature: Scoring outcome sheet semantic cleanup — gated behind SCORING_SHEET_V2 flag (default true).
- Strikeout button removed from at-bat outcomes — 3 Strike pitch buttons handle K automatically.
- Foul moved to dedicated PITCH OUTCOME section in outcome sheet with its own header.
- Out @ 1st and Flyout promoted to 2-button top row in AT-BAT OUTCOME section.
- Home Run preserved as full-width row (unchanged).
- Opp-half +1 Run buttons hidden (replaced by ScoreboardRow +1 chips from v2.4.0).
- New: SCORING_SHEET_V2 feature flag in featureFlags.js (default true); flag-off path preserves original OUTCOME_ROWS unchanged for rollback.
- New: OUTCOME_ROWS_V2 exported from LiveScoringPanel.jsx.
- Tests: scoringSheetV2.test.js (8 tests); suite 411 → 419.
- Story 29 resolved. Story 30 logged (isFlagEnabled DB-read refactor, deferred).

## v2.4.0 — 2026-04-24
- Feature: Game context header at top of scoring (STATE 1/2/3) —
  "GAME N · {MY TEAM} vs/@ {OPP} 🏠" format; home "vs" + 🏠, away "@";
  hidden in practice; truncates long names (10+"..").
- Feature: Scoreboard extracted to dedicated ScoreboardRow with per-team +1 buttons
  (addManualRun calls directly). Global +1 button and "Add run for which
  team?" modal removed.
- Feature: Home team name replaces "Us"/"US" throughout scoring;
  teamShort consolidated onto truncateTeamName.
- Util: deriveGameHeader(input) — pure function, null fallback.
- Tests: gameHeader.test.js (10 tests); suite 401 → 411.
- Stories 27 and 28 resolved.

## v2.3.4 — 2026-04-24
- Feature: Opponent team name shown throughout scoring — BATTING header + team
  name primary (e.g. "Bananas #1"), "+1 {Team} Run" button, {TEAM} scoreboard
  label replace generic "Opponent"/"OPP"/"Player #N".
- Util: truncateTeamName(name, max=12) — 10+".." truncation when >12; "Team"
  fallback on null/empty/non-string.
- Tests: opponentNameLabel.test.js (6 tests).

## v2.3.3 — 2026-04-23
- Fix: Runner placement broken since v2.3.2 — roster entries have no .id field; player ID now falls back to name throughout scoring state, resolving runner placement, run scoring, and diamond display
- Fix: Runner-on-3rd marked Out now increments outs counter and triggers half-inning flip correctly
- Fix: Runner pills anchored to base coordinates on DiamondSVG (absolute positioning); no longer rendered as a floating row below the diamond
- Fix: Diamond centered horizontally and vertically; Section 6 layout uses flex:1 + flex-column to eliminate dead space and 2B label collision with pitch info
- Feature: Practice mode — full scoring session with no Supabase writes; claimScorerLock sets isScorer locally; heartbeat suppressed; Realtime subscription skipped
- Fix: Realtime race condition — lastAppliedAtRef + updated_at timestamp guard rejects stale and echo events (<=); stamped async-after-success in persist() and claimScorerLock() seed upsert
- Fix: Opponent batter card unified with home-team card (gold border, OPPONENT BATTER header, Player #N primary, Pitches: X of 5); duplicate label removed from fixed pitch bar
- Tests: 354 → 395 passing (3 new files: realtimeRaceGuard.test.js, practiceModeIsolation.test.js, liveStateMerge additions)

## v2.3.2 — 2026-04-21
- Feature: Opposing pitcher pitch counts — per-batter, per-inning, per-game counters in opponent half; opponent batter number (#1–#11); color-coded pitch buttons (Ball blue, Strike red, Foul amber, Out grey, Contact green); Foul counts as pitch not strike; inning totals reset on half-flip, game total persists across innings. Schema: 6 new columns on live_game_state (opp_balls, opp_strikes, opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches). EXPECTED_LGS_KEYS expanded 15→21; 6 new contract tests; suite: 377 passing.

## v2.3.1 — 2026-04-21
- Fix: Runner duplication — `advanceRunners()` helper uses base-map (back-to-front 3B→1B) guaranteeing no player ID occupies two bases after any hit
- Feature: Runner conflict prompt — when two runners would land on the same base, `RunnerConflictModal` presents three choices: Score blocking runner / Hold incoming runner / Cancel play (restores pre-play state via snapshot)
- Fix: `confirmRunnerAdvancement()` detects base collision and surfaces `runnerConflict` state instead of silently auto-scoring the pending runner
- Fix: Exit Scoring moved from header ← into gear menu (neutral styling); header ← now pauses (lock retained)
- Tests: 10 tests in `runnerAdvancement.test.js` — advanceRunners (1-5), conflict detection (6), SCORE_BLOCKING (7), HOLD_INCOMING (8), CANCEL_PLAY (9), analytics spy (10); jsdom `matchMedia` stub added via `setupFiles`

## v2.3.0 — 2026-04-21
- Feature: Game Mode action clarity + schedule finalization — X (pause) keeps scorer lock; gear menu with Hand off / Finish Game; FinishGameModal with score preview; endGame() writes final score to team_data.schedule before releasing lock; undoHalfInning + 10s undo toast; MERGE_FIELDS extended (usScore, oppScore, gameStatus, finalizedAt); 13 new tests (finalizeSchedule, undoHalfInning, newGameTemplate regression guard)

## v2.2.45 — 2026-04-21
- Feature: Live scoring — full game tracking with opponent half; track opponent B/S/O count; 5-run mercy banner for both teams; End Inning / End Game buttons; "We bat: Top/Bottom" toggle at game start; runner names on diamond; debug logs removed

## v2.2.44 — 2026-04-20
- Fix: Scoring pitch buttons (Ball/Strike/K/Foul/Contact) now position:fixed at bottom:60px — always visible regardless of content height; paddingBottom:160px on outer container prevents overlap

## v2.2.43 — 2026-04-20
- Fix: Scoring screen layout — explicit flex spacer replaces marginTop:auto; dead space eliminated
- Fix: Empty batting order state — clearer two-line message directing coach to Game Day → Lineups
- Fix: Restore Scorebook UUID error — `p_actor_id` now passes null for local-xxx IDs to satisfy Postgres uuid type on `restore_game_state` RPC

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
| 6 | **Absent player auto-assign** | Out Tonight players (e.g. Aiden) occasionally still assigned to a field position when auto-assign runs — `activeBattingOrder` filters batting order correctly but engine absent exclusion may have a gap |
| 7 | **Game Ball "—" display bug** | Schedule card shows "—" dash instead of recipient names after multi-player game ball selection — read path may not be normalizing the `gameBall` array at render |

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
| 7 | **OOM contract test** | `useLiveScore.contract.test.js` (untracked on main, committed on develop) causes pre-push hook worker OOM on Windows — fix vitest worker allocation or add to exclude list |

---

## 🚧 Blocked

| # | Item | Notes |
|---|------|-------|
| 1 | **Auth Phase 4 cutover** | Add requireAuth middleware to existing routes. Auth: email magic-link + Google OAuth (Twilio removed). |
| 2 | **Scoring: Phase 4C cleanup** | Remove AUTH TESTING SHIM from `useLiveScoring.js` and `index.jsx`; enforce RLS with `auth.uid()` policies on all three scoring tables; restore `scorer_user_id` and `actor_user_id` to uuid + FK. |
| 3 | **Scoring: persist myTeamHalf** | `myTeamHalf` (top/bottom) currently lives only in ScoringMode React state — lost on page reload. Persist to `live_game_state` and hydrate on mount. |
| 4 | **Scoring: real-time multi-device sync** | Realtime subscription is wired but only viewers see state changes passively. Scorer and viewer full sync validation needed before broader rollout. |

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

### v2.6.0 — Critical bugs (user-impacting, ship first)

- [ ] **Diagnose share/print not working in prod** — confirmed broken on April 24, 2026 (game day) and April 27, 2026 (production smoke test post-v2.5.1 deploy). Root cause UNKNOWN. NOT caused by `renderSharedView` hooks violation — that fix shipped in v2.1.6 (commit `46f071a`, `SharedView` component at App.jsx:2560). Investigation needed: reproduce locally, check browser console errors on `?s=` URLs, verify share/print buttons render, check whether share payload generation is failing or share view rendering is failing.
- [ ] **Audit `snack_duty` codebase usage** before dropping the column. Column verified present in Supabase on April 27, 2026 (jsonb type). Prerequisite for dropping — grep frontend/ and backend/ for any read/write references; if clean, run `ALTER TABLE team_data DROP COLUMN snack_duty;` in Supabase SQL Editor.

### v2.6.0 — Infrastructure (complete before next feature sprint)

- [ ] **CI workflow `BACKEND_URL` audit** — backend job + smoke job both hardcode prod URL (verified April 27, 2026). Evaluate whether to point at a dev/preview backend or make tests environment-aware. Note: smoke job has misleading variable named `DEV_BACKEND_URL` that points to prod URL — fix or rename.
- [ ] **Verify `RESEND_DOMAIN_VERIFIED=true`** in Render production environment variables (local `.env` confirmed April 27, 2026; Render dashboard not checked this session).
- [ ] **Investigate Windows Vitest pre-push hook OOM cascade** — currently mitigated by warm-up workaround in CLAUDE.md. Real fix paths: reduce vitest worker count for hook runs, skip pre-push test (rely on CI gate), configure pool to avoid worker-thread cold-start, or move hook to pre-commit instead of pre-push.

### v2.6.0 — Quality of life

- [ ] Install `gh` CLI on Windows machine (`winget install --id GitHub.cli` then `gh auth login`)
- [ ] Fix `LockFlow.jsx` duplicate `fontSize` lint warning
- [ ] Bundle size investigation (1681 kB chunk → code splitting)
- [ ] Enable "Auto-delete head branches" GitHub repo setting

### v2.6.0+ — Auth migration cleanup (was: docs/TODO_activate_membership_rpc.md)

- [ ] **Fix `activate_membership` RPC for email auth (Migration 013)** — The Supabase RPC was originally built for phone-only auth (signature: `activate_membership(p_user_id uuid, p_phone_e164 text, p_first_name text, p_last_name text)`). Phase 4B added email auth without an RPC update; current code uses a direct `.update()` workaround on `team_memberships` in `backend/src/routes/auth.js`.
  - **Migration:** Add `backend/src/db/migrations/013_fix_activate_membership.sql` updating the RPC signature to accept email + team_id parameters.
  - **Code:** Restore RPC call in `backend/src/routes/auth.js`, remove the direct update workaround.
  - **Blocks on:** Nothing — safe to run anytime after Phase 4B is stable. Phase 4B has been stable since v2.x.
  - **Source:** Originally tracked in `docs/TODO_activate_membership_rpc.md` (now deleted, content migrated here April 27, 2026).
  - **Target:** v2.6.0 P3 or v2.7.0

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

### Current Sprint (v2.2.46+)
1. **Absent player auto-assign bug** (P1) — investigate lineup engine absent exclusion path; confirm Out Tonight players are never field-assigned
2. **Game Ball "—" display bug** (P1) — fix gameBall array read/normalize on schedule card render
3. **OOM contract test** (P3) — fix or exclude `useLiveScore.contract.test.js` from vitest so pre-push hook is clean on main
4. **Scoring: persist myTeamHalf** — write `myTeamHalf` to `live_game_state` and hydrate on mount
5. **Phase 4C auth cutover** (Blocked) — auth gate, RLS enforcement on scoring tables, HMAC-signed approve/deny links

### Historical (Completed)
0. ✅ **v1.2.0 shipped** — diamond view redesign, responsive position boxes, first-name enforcement, analytics
1. ✅ **Verify 10-player auto-assign on live roster** — open Mud Hens, run Auto-Assign across 6 innings, confirm 1 bench/inning and no CF
2. ✅ **Player absent flag** — Out Tonight panel, activeBattingOrder, engine exclusion (v2.2.21+)
3. ✅ **Multi-player game ball** — gameBall migrated to array, edit modal with search + multiselect (v2.2.25–v2.2.26)
4. ✅ **My Team tab rename** (v2.2.25)
5. ✅ **V1→V2 skill bridge** — playerMapper.js shim (v2.2.26)
6. ✅ **Live scoring** — pitch tracking, B/S/O counts, runner names, opponent half tracking, mercy rule, team batting half selection (v2.2.37–v2.2.45)
7. **Mobile batting reorder arrow fallback** — ~1–2 hrs, biggest UX gap at the field
8. **Print card metadata** (team name, date, opponent) — ~1 hr
9. **`Confident` vs `goodCoachability` weight fix** — ~30 min, correctness issue
10. **"Revert to Generated" button** — ~1–2 hrs
11. ✅ **Verify onboarding modal on live app** — confirmed working
12. **Set up GitHub Actions CI** — block Vercel auto-deploy unless build + engine tests pass; 2-hour setup, eliminates broken deploys

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

## scoring-updates — completed in v2.3.2

### ✅ Bug: Opponent B/S display clobbered by Realtime echo (shipped v2.3.2)
- Root cause confirmed: oppBalls/oppStrikes were ephemeral — not persisted,
  reset on every Realtime echo.
- Fix: added opp_balls + opp_strikes to live_game_state (schema migration
  20260421_add_opponent_pitch_tracking.sql); both now included in every
  persist() upsert payload. EXPECTED_LGS_KEYS expanded 15→21 to lock
  full-row invariant in contract tests.

### ✅ Feature: Opponent pitch counts + batter identity (shipped v2.3.2)
- Opponent batter number (#1–#11) displayed above B/S/O pips.
- Pitch count totals: per-batter, per-inning, per-game ("Pitches — Batter: X · Inn: X · Gm: X").
- Batter advances (number increments, per-batter count resets) on: out, contact/hit; K triggers an out.
- Inning totals reset on half-flip; game total persists across all innings.
- 4 new columns: opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches.

---

## scoring-updates — completed in v2.3.3

### ✅ Story 1: Runner placement (shipped v2.3.3)
- Root cause: roster entries have no .id field; scoring code used player.id which produced undefined for every entry.
- Fix: player ? (player.id || name) : name fallback throughout advanceRunners(), runner state, and scoring math.

### ✅ Issue 1: Runner-out increments outs (shipped v2.3.3)
- confirmRunnerAdvancement() out-branch now increments outs and calls endHalfInning() correctly.

### ✅ Issue 2: Runner pill positioning (shipped v2.3.3)
- DiamondSVG renders runner pills via absolute positioning at base coordinates; floating row below diamond removed.

### ✅ Story 9: Layout polish — diamond centering + dead space (shipped v2.3.3)
- Section 6 layout: flex:1 + flex-column; diamond centered horizontally and vertically; pitch info below diamond without 2B collision.

### ✅ Story 11: Practice mode — local-only scoring path (shipped v2.3.3)
- isPractice=true bypasses all Supabase writes; claimScorerLock sets isScorer locally; heartbeat suppressed; Realtime subscription skipped.
- 7 tests in practiceModeIsolation.test.js verify Supabase isolation contract.

### ✅ Story 13: Realtime race condition guard (shipped v2.3.3)
- lastAppliedAtRef + updated_at timestamp guard (<= comparison) rejects stale and echo Realtime events.
- persist() and claimScorerLock() seed upsert stamp ref in .then() success branch (async-after-success).
- 3 tests in realtimeRaceGuard.test.js.

### ✅ Story 14: Opponent batter card placement (shipped v2.3.3)
- Opponent batter card unified with home-team card style (gold border, OPPONENT BATTER header, Player #N, Pitches: X of 5); moved above diamond.
- Duplicate Player #N label removed from fixed pitch bar.

---

## scoring-updates — v2.4.x candidates

### Feature: Opponent runners on base
- Diamond UI parity with home-team runner display during opponent half.
- Schema: opp_runners jsonb column on live_game_state.
- Handler: hit/walk advancement in recordOppPitch() (single/double/triple/HR/walk branches).
- Bundle with 10U+ walk/strikeout rule logic for opponent half.
- Surfaced from v2.3.2 dev-test coach feedback (KK, April 2026).

### Story 27 (P2) — Home team name replaces "Us" / "US" throughout scoring
Status: Resolved — v2.4.0 (2026-04-24)
Discovered: 2026-04-24, during v2.3.4 opponent-name sweep local smoke
Target: v2.4.x
Symptom: After v2.3.4, opponent-side labels use the real team name (e.g.,
  "Bananas #1", "+1 Bananas Run", "BANANAS" scoreboard column). Our-side
  labels still show generic "US" / "Us" / "+1 US". Asymmetry reads as
  incomplete.
Impact: Coach and dugout parents using the scoring view. Minor but
  visible inconsistency; undermines the v2.3.4 clarity improvement.
Root cause: known — v2.3.4 scope was limited to opponent labels. The
  companion "Us → home team name" work was not included.
Proposed fixes:
  - Option A: Sweep LiveScoringPanel.jsx for all "US"/"Us" display strings,
    replace with truncateTeamName(activeTeam.name). Matches v2.3.4 pattern,
    reuses existing formatter. Known spots: scoreboard "US" label (STATE
    1/2/3), "+1 US" button, manual run prompt "Us" button, FinishGameModal
    my-side label. ~5-7 substitutions.
  - Option B: Consolidate on a single home-side label variable
    (homeLabel = truncateTeamName(activeTeam.name)) and replace the existing
    teamShort helper (first-word-only, pre-dates truncateTeamName). More
    churn (~3 additional touch points) but eliminates dual-format risk
    long-term.
Recommendation: Option B. teamShort was a pre-v2.3.4 hack; consolidating
  on one formatter now keeps the scoring view consistent and means we never
  revisit this tension. Extra churn is minimal and proportionate.
Notes: Could bundle with Story 28 (game context header) since both edit
  LiveScoringPanel.jsx — ~half the PR overhead.

### Story 29 (P2) — Scoring sheet semantic cleanup (SCORING_SHEET_V2)
Status: Resolved — v2.5.0 (2026-04-24)
Discovered: 2026-04-24, post v2.4.0 scoring review
Target: v2.5.0
Symptom: Outcome sheet had Strikeout as a tap target alongside genuine contact
  outcomes, but 3-strike auto-ending made it redundant. Foul was buried in the
  contact sheet (wrong conceptual section). Out@1st and Flyout shared a 3-button
  row with Strikeout, making them harder to tap under pressure.
Resolution: SCORING_SHEET_V2 feature flag (default true). OUTCOME_ROWS_V2
  removes Strikeout, splits sheet into PITCH OUTCOME (Foul, full-width) and
  AT-BAT OUTCOME sections (Out@1st + Flyout in 2-button row, Home Run
  full-width). Opp-half +1 Run buttons hidden (superseded by ScoreboardRow chips).
  8 tests in scoringSheetV2.test.js.

### Story 28 (P2) — Game context header at top of scoring screen
Status: Resolved — v2.4.0 (2026-04-24)
Discovered: 2026-04-24, coach observation during v2.3.4 scoring review
Target: v2.4.x
Symptom: The scoring view shows team header, batter card, and scoring
  controls, but no explicit "which game am I scoring" context. A coach
  returning to the screen after a break, or a second scorer joining, has
  no quick anchor to confirm the right game is loaded.
Impact: Scorer (coach + assistant coaches), especially on multi-game
  weekends. Medium — risk of scoring the wrong game is low because game
  selection is required at entry, but context loss is real and painful
  when it happens.
Root cause: known — game context was de-prioritized in the initial
  scoring UI to maximize batter/pitch area.
Proposed fixes:
  - Option A: Compact single-line header at the very top of
    LiveScoringPanel (above the team header strip). Format:
    "Game N · Mud Hens vs Bananas 🏠" for home,
    "Game N · Mud Hens @ Bananas" for away.
    12-14px font, muted color so it doesn't compete with active scoring
    zone. ~32px vertical added.
  - Option B: Fold into the existing team header strip — single
    consolidated top row reads "Mud Hens (8U) · Game 4 vs Bananas 🏠 ·
    Offline Ready". Saves ~32px vertical but crowds the existing strip.
  - Option C: Show game context only in STATE 1 (entry / no scorer)
    where space is available; hide in STATE 2 to protect active scoring
    density.
Recommendation: Option A. Clean, non-disruptive, gives coach a durable
  "where am I" anchor without crowding the batter card. Defer Option B
  to a later layout consolidation — preferably once a future half-aware
  canvas story lands and the shared game-context concern can be solved
  across Scoring + Game Mode in one pass.
Open questions to resolve during implementation:
  - Game numbering basis: 1-indexed position in full season schedule
    (stable across the season), or index among unfinalized games (shifts
    as games are played)? Recommend stable — "Game 4 vs Bananas" stays
    meaningful all season.
  - Home/away visual: "vs" / "@" connector + 🏠 emoji (recommend), or a
    "HOME" / "AWAY" pill, or Option C's color-coded background.
  - Should the header also appear in Game Mode for parity? Likely yes —
    covered when a future half-aware canvas story consolidates the two
    views.

---

## Backlog

### Story 15 (P1): RLS policy blocking saveTeamData calls in real-game mode
**Surfaced:** April 23, 2026 (real-game smoke test)
- Supabase RLS policy on team_data table rejecting writes from scoring session (anon key, pre-auth).
- Affects roster/schedule sync to Supabase. Does not block in-session scoring (three-layer pattern protects local state).
- Investigation: is RLS policy `allow_scorer_writes` correct? Is anon key auth state set on the Supabase client at write time?

### Story 16 (P1): "No batting order set" in real-game mode despite localStorage data
**Surfaced:** April 23, 2026
- "No batting order set" UI message appears in real-game mode even though localStorage has full roster and batting order.
- Likely cause: team_data Supabase READ also failing (per Story 15 RLS), so React state stays empty on mount; localStorage hydration not reached.
- Fix Story 15 first, then re-test. If READ and WRITE both fail under same policy, a single RLS fix resolves both.

### Story 19 (P2 / Phase 2+): Opponent runners on bases
- Diamond UI parity during opponent batting half — full runner advancement tracking.
- Schema: opp_runners jsonb column on live_game_state.
- Handler: hit/walk advancement branches in recordOppPitch().
- Currently only outs and runs tracked for opponent half; no runner visibility for coach.

### Story 20 (P2): Half-flip helper extraction
- 4 code sites independently reset half-inning state: resolveAtBat 3-out, endHalfInning, recordOppPitch 3-out, confirmRunnerAdvancement 3-out.
- Extract to flipHalfInning(gs, cause) shared helper to prevent state drift across these paths.

### Story 21 (P2): "No pitches yet" stale copy
- Minor UX bug — stale copy shown in pitch area when pitches have already occurred.

### Story 22 (P3): GitHub Actions CI queue delays
- CI runs occasionally queue for 30+ min. Investigate: runner availability, billing limits, workflow configuration.
- Document whether intermittent or reproducible; add to Known Issues if environmental.

### Story 23 (P3): feature_flags table missing migration file
- feature_flags table exists in Supabase but has no migration in supabase/migrations/.
- Capture DDL in supabase/migrations/ for proper schema versioning and reproducibility.

### Story 24 (P3): Orphan backend test files
- backend/scripts/tests/ contains test-runner.js, suite-rate-limits.js, suite-validation.js.
- Cleanup decision needed: keep (document purpose) or delete (reduce confusion with CI_SAFE suite).

### Story 30 (P2): isFlagEnabled — no DB-read path; DB flip has no runtime effect without redeploy
- **Surfaced:** April 24, 2026 (post-v2.5.0 merge; DB row flipped expecting user-facing change)
- `isFlagEnabled(flagName)` is synchronous: reads `FEATURE_FLAGS[flagName]` from the JS bundle default + `localStorage.getItem('flag_' + flagName)`. It does NOT query the Supabase `feature_flags` table at runtime.
- Current rollout method: code deploy (change default in featureFlags.js) or localStorage override per device.
- Desired: DB-driven flag evaluation so ops can flip flags without a redeploy.
- Fix candidates: (A) async `isFlagEnabled` that reads Supabase `feature_flags` at app boot and caches; (B) `flagBootstrap.js` extended to fetch DB flags and merge into a runtime registry; (C) add a startup fetch in App.jsx hydration path, similar to team data load.
- Recommend (B) — keeps the evaluation function synchronous at the call site while moving the async fetch to bootstrap. Matches existing `flagBootstrap.js` pattern.
- Blocks nothing directly; current localStorage override remains available as workaround.

### Story 26 (P2): Backend RATE-01a test flakiness — stateful against prod rate limiter
- **Surfaced:** April 24, 2026 (PR #17 CI run — admin-bypassed because only CLAUDE.md changed).
- `backend/scripts/tests/suite-rate-limits.js` RATE-01a expects `403 NOT_AUTHORIZED` but gets `429 TOO_MANY_ATTEMPTS` when prior CI runs have burned through the prod backend's rate-limit cap.
- Update 2026-04-28: VAL-09 (validation, no email) is also affected by this rate limit issue, not just RATE-01a.
- Fix candidates: (A) throwaway random email per test run, (B) mock rate limiter at test boundary, (C) use dev backend instead of prod. (D) Cleanest structural fix: key loginLimiter by email instead of IP. Eliminates cross-run pollution from CI runner IPs. Side benefit: rate limit becomes meaningful for real abuse patterns (per-account) instead of per-source-IP.
- Recommendation: (D) addresses root cause; combine with throwaway-email per run from original recommendation as defense in depth.
- Blocks nothing directly but masks real regressions if NOT_AUTHORIZED behavior ever breaks.

### Story 31 (P2) — package.json version sync gate
Status: Open
Discovered: 2026-04-28, during v2.5.2 release recon
Target: v2.5.3 or earlier
Symptom: The v2.5.2 version bump (commit 0c005e1) updated frontend/package.json
  and APP_VERSION constant in App.jsx but missed backend/package.json — caught
  only by manual recon during the release deploy. A version-mismatched ship
  would have made it to prod silently.
Impact: Production version drift between frontend and backend services. Breaks
  any client that does version-pinning. Breaks any analytics or telemetry that
  joins on app_version. Hard to detect without a manual audit.
Root cause: Known — manual three-file sync (App.jsx APP_VERSION +
  frontend/package.json + backend/package.json) with no automated guard. Easy
  to miss one.
Proposed fixes:
  A) Vitest test asserting frontend/package.json.version ===
    backend/package.json.version === APP_VERSION constant. Fails CI if drifted.
    Cheap.
  B) Pre-commit hook validating the same. Fails locally before commit. More
    invasive.
  C) Single source of truth — one VERSION file imported by all three. Bigger
    refactor.
Recommendation: A — test gate runs in CI, blocks PR merge if drifted, doesn't
  change developer workflow. Lowest cost, highest reliability.

### Story 32 (P3) — Pre-push hook retry hides OOM failures
Status: Open
Discovered: 2026-04-28 (re-flagged across multiple sessions)
Target: Next infra patch
Symptom: .husky/pre-push runs `cd frontend && npm test || npm test`. The retry
  exists to mask Windows Vitest cold-start OOM cascades, but it also masks
  legitimate test failures — a real failure on first run gets a free retry on
  warm cache, and the hook reports green.
Impact: Test failures can slip past the local pre-push gate to develop,
  surfacing only in GitHub Actions CI. Slower feedback loop. CLAUDE.md
  explicitly states the hook should be `cd frontend && npm test` only.
Root cause: Known — workaround for Windows Vitest cold-start OOM that was never
  reverted after the underlying issue was supposed to be addressed.
Proposed fixes:
  A) Remove retry. Accept that pushes occasionally fail and need re-run.
    Restores the explicit gate per CLAUDE.md.
  B) Increase Vitest worker memory to eliminate the OOM root cause, then remove
    retry. Stable but requires tuning.
  C) Switch to Vitest --pool=forks --poolOptions.forks.singleFork. Slower but
    no OOM. Then remove retry.
Recommendation: B if straightforward to tune; otherwise A. Either way, restore
  the explicit gate. Status quo violates CLAUDE.md.

### Story 33 (P3) — VERSION_HISTORY techNote validation
Status: Open
Discovered: 2026-04-28, during v2.5.2 release recon
Target: Next infra patch
Symptom: A prior v2.5.2 docs commit used a non-compliant techNote string
  ("UX improvement and new reusable Toast component") instead of one of the four
  pre-approved generic strings. Caught only by manual review during release recon.
Impact: Release notes lose their generic-string firewall — internal-detail
  leakage into user-facing release notes. The four-string convention exists to
  keep release notes coach-friendly; nothing currently enforces it.
Root cause: Known — convention documented in CLAUDE.md but no automated check.
Proposed fixes:
  A) Vitest test asserting every VERSION_HISTORY entry has a techNote in the
    approved set: 'Bug fixes and performance improvements' / 'Under-the-hood
    stability improvements' / 'Performance and reliability improvements' /
    'Minor fixes and internal improvements'. Fails CI if violated.
  B) ESLint custom rule on VERSION_HISTORY array literal. More invasive.
  C) Pre-commit hook check on App.jsx changes. Local-only; CI still vulnerable.
Recommendation: A — test gates are cheaper than hooks and run in CI for both
  local and PR pushes.

### Story 34 (P3) — FEATURE_MAP row numbering audit
Status: Open
Discovered: 2026-04-28, during v2.5.2 docs gap closure
Target: Next docs cleanup patch
Symptom: docs/product/FEATURE_MAP.md row numbering has out-of-sequence rows.
  Row 23 sits between rows 15 and 16 (confirmed insertion-order artifact, not a
  deletion gap). Future inserts may compound the disorder.
Impact: Cosmetic. Makes the table harder to navigate and audit. Coverage summary
  math depends on accurate row count, so a future delete or insert without full
  renumber could silently corrupt the totals.
Root cause: Known — row 23 was inserted out of position rather than appended;
  no renumber applied at the time.
Proposed fixes:
  A) Audit and renumber rows sequentially 1..N. Update all backreferences.
    Confirm coverage summary still accurate.
  B) Switch to a different row identifier scheme — section.subsection (1.1,
    1.2) or feature codes — and stop relying on monotonic integers.
  C) Leave as-is, accept the cosmetic debt.
Recommendation: A in a focused docs cleanup commit — low risk, restores
  consistency. Defer B unless A surfaces deeper structural issues.

### Story 35 (P3) — CLAUDE.md docs drift on rate limiter state
Status: Open
Discovered: 2026-04-28, during PR #29 diagnostic
Target: Next infra patch
Symptom: CLAUDE.md (and the RATE-01b comment in suite-rate-limits.js line 41-44)
  state the magic-link rate limiter was removed in v2.3.3. Backend code shows the
  limiter has been live continuously since commit 91aaf43 (April 6, 2026).
  Documentation was factually incorrect.
Impact: Misleads future debugging. The PR #29 diagnostic took longer than
  necessary because operators had to disprove the "limiter was removed" claim
  before reaching root cause. Doc trust degraded.
Root cause: Known — claim was made in code comments when the limiter was
  apparently planned for removal but the removal commit never landed. No
  subsequent doc correction.
Proposed fixes:
  A) Audit CLAUDE.md and any related docs/comments for "rate limiter removed"
    claims; correct to current state with the loginLimiter spec (5 req per
    15 min, IP-keyed).
  B) Add the limiter spec to the "## Auth Strategy" section of CLAUDE.md as a
    permanent reference.
  C) Update RATE-01b comment in suite-rate-limits.js to reflect actual code
    state.
Recommendation: All three — small focused docs commit. Pair with Story 26 fix
  for one clean PR.

### Story 36 (P3) — CI backend integration tests don't account for double-trigger request volume
Status: Open
Discovered: 2026-04-28, during PR #29 CI failure
Target: Next infra patch
Symptom: Commit b92fdb3 (April 22, 2026) added pull_request triggers to backend
  integration tests without updating the tests for the doubled request volume.
  Push event hits /magic-link 3x; PR open event re-runs minutes later, totaling
  6+ requests within the 15-minute rate-limit window. Multi-commit develop
  branches compound the count further (n commits × 3 = 3n requests).
Impact: PRs systematically fail CI on the rate-limit tests when develop has had
  recent activity. False positives erode trust in CI as a real merge gate. PR
  #29 was merged with red CI on this basis — establishes a precedent that should
  not become routine.
Root cause: Known — workflow trigger expansion without corresponding test
  infrastructure update.
Proposed fixes:
  A) Skip backend integration tests on pull_request events when the same commit
    was already tested on push (deduplication via commit SHA cache).
  B) Add a wait-for-rate-limit-window step before running magic-link tests on
    PR events.
  C) Fix at the test layer per Story 26 — make tests rate-limit-aware so the
    trigger volume doesn't matter.
  D) Run integration tests against a separate test backend with a higher rate
    limit (was deleted April 27 per memory — would require standing it back up).
Recommendation: C as primary (tests should be robust regardless of trigger
  pattern), A as bonus (doesn't hurt to deduplicate). Skip D unless other
  reasons emerge to revive a test backend.

### Story 37 (P2) — Branch strategy enforcement gap
Status: Open
Discovered: 2026-04-28, during v2.5.2 retrospective
Target: Next infra patch
Symptom: Documented branch strategy requires feature/fix branches → develop →
  main, but v2.5.2 work bypassed the feature branch layer entirely. Code
  committed directly to develop, mixing three concurrent work streams (count
  strip, Toast, mercy banner) before promotion to main. PR #29 diff was noisy;
  rollback unit was the entire develop diff rather than isolated features.
Impact: Three concrete costs already paid: noisy PR review, no isolated rollback
  unit per feature, prior v2.5.2 docs commit was incomplete because work streams
  committed to develop without changelog coordination. Pattern will repeat under
  any momentum-heavy session.
Root cause: Known — discipline-only enforcement of branch strategy. No local or
  remote guard rejects direct commits to develop.
Proposed fixes:
  A) Discipline-only: Claude proposes feature branch as first action of every
    session. Will fail under high-momentum sessions.
  B) Local pre-push hook rejecting direct pushes to develop/main without
    ALLOW_DIRECT_PUSH=1 override. Hard local guard, soft escape hatch for
    hotfixes. Pairs with Story 32 hook cleanup.
  C) GitHub branch protection on develop. Strongest enforcement but changes
    routine workflow significantly.
Recommendation: B. Hard guard for the failure mode we demonstrated, escape
  hatch for genuine hotfixes, no remote workflow change. Bundle with Story 32
  (pre-push hook fix) so we touch the hook once.

---

### Story 38 (P2) — userChanges token scanner
Status: Open
Discovered: April 2026 — v2.5.3 techNote guard release closed the techNote
  leak vector but left userChanges freeform prose with only documentation as
  guard
Target: v2.6.x
Symptom: Technical jargon, component names, internal tooling references can
  land in coach-facing userChanges bullets with no automated catch. v2.4.0
  surfaced "LiveScoringPanel", "ScoreboardRow", "GameContextHeader" before
  techNote-side mitigation; userChanges has the same exposure.
Impact: Coaches see jarring developer language. Product polish degrades. Trust
  erodes over time as a fixed-pool techNote sits next to a leaky userChanges
  layer.
Root cause: Known. CLAUDE.md UPDATES TAB CONTENT RULE is
  documentation-as-fence. No automated enforcement on userChanges authoring.
Proposed fixes:
  A. Token denylist scan — Vitest assertion against banned substrings:
     refactor, middleware, hook, RPC, migration, CI, *Panel, *Row, *Header,
     /component$/, /^Add(ed)? \w+$/. Per-entry override allowed via inline
     comment for legitimate edge cases. Low complexity, fits existing Vitest
     pattern. Risk: false positives on legit copy ("refactored to one-tap
     workflow").
  B. Allowlist of coach-language patterns — too restrictive, brittle, will
     reject legitimate copy.
  C. LLM-grade review at build time — overkill, slow, introduces external
     dependency on every CI run.
Recommendation: A. Ship a tight banned-token list (≤10 patterns), per-entry
  escape hatch via // override comment, mutation-test the guard before merge.

---

### Story 39 (P3) — Typed VERSION_HISTORY schema validator
Status: Open
Discovered: April 2026 — pattern recognized after two structural regressions
  (v2.2.12/13 missing entries killed the Current badge; v2.4.0/v2.3.4
  techNote violations slipped past)
Target: v2.7.x or later
Symptom: Missing required fields, malformed entries, structural drift can
  land in VERSION_HISTORY without test coverage. Updates tab silently
  degrades — missing badge, missing headline, malformed bullets.
Impact: Coach-facing tab loses signal. Same regression class as the techNote
  leaks: documentation-only fences fail under deploy pressure.
Root cause: Hypothesis. Pattern across two distinct regressions suggests
  structural validation gap, not authoring discipline gap.
Proposed fixes:
  A. JSDoc + Vitest schema check — assert every entry has version (semver),
     date (string), headline (string), userChanges (array), techNote (in
     approved set or null), internalChanges (array). Pragmatic, no new deps,
     fits current Vitest pattern. Augments the existing techNote test.
  B. Migrate versionHistory.js to TypeScript — real type safety, but
     introduces TS to a JS-only codebase for one file. Big surface area for
     small payoff.
  C. Zod schema with parse-on-import — runtime validation, catches drift at
     app boot. Adds dependency for one file. Fail-loud at boot is risky for
     a PWA.
Recommendation: A. Stay in Vitest, no new deps, no language migration.
  Revisit B only if TS adoption broadens elsewhere.

---

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
- **AI backend:** Render Starter plan ($7/mo) since April 27, 2026 — no spin-down. UptimeRobot monitor #802733786 pings `https://lineup-generator-backend.onrender.com/ping` every 5 minutes for availability monitoring; alerts via email + push notification.
- **Frontend:** Vercel — auto-deploys on push to `main`
- **Auth backend deployed (Phase 3):** Email magic-link auth live on Render (Twilio removed). Frontend cutover pending. Until then, all routes remain open (no `requireAuth` middleware on existing routes).
