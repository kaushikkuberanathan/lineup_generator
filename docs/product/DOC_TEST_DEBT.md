# Dugout Lineup — Documentation & Test Debt Ledger

> Running ledger of known gaps in documentation accuracy and test coverage.
> P0 items block the next code release touching that feature.
> Owner: KK | Last updated: April 2026 (v2.2.33)

---

## How to Use This Ledger

- **P0** — Must resolve before next code change to that feature. No exceptions.
- **P1** — Target: resolve within 2 sprints (next 4 sessions).
- **P2** — Nice to have. Resolve opportunistically.

Resolved items: add `✅ Resolved vX.X.X — [what fixed it]` before removing from this file.

Log format:
```
### D000 — [Feature] — [Gap Type]
**Priority:** P0 / P1 / P2
**Gap:** What is missing or wrong.
**Fix:** What needs to happen to close this.
**Effort:** S / M / L
**Opened:** vX.X.X (Month YYYY)
```

---

## P0 — Block Next Code Release for This Feature

### D001 — Live Scoring — No Test Coverage
**Priority:** P0
**Gap:** The entire live scoring feature (scorer lock, inning-by-inning run entry, Supabase Realtime sync, claim/release flow, audit trail) has zero automated test coverage. A regression in any of these paths is invisible until a coach reports it mid-game.
**Fix:** Add Vitest tests for `useLiveScoring.js` hook — at minimum: claim lock succeeds, duplicate claim is rejected, inning entry writes correctly, release clears state. Use a mock Supabase client.
**Effort:** L
**Opened:** v2.2.33 (April 2026)

### D002 — engine.v2 test 2.3 — Known Skipped Test
**Priority:** P0
**Gap:** `engine.v2.test.js` test 2.3 "7-player roster produces a warning" is known-failing (7-player roster produces no warning). This test is skipped in CI. The underlying behavior (fewer than 9 players should surface a warning) is not enforced.
**Fix:** Fix the lineup engine to surface a warning when roster < 9, then unskip the test. Or document a deliberate decision to not warn at 7 players and remove the test.
**Effort:** M
**Opened:** Before v2.2.33 (known at v2.2.31)

---

## P1 — Fix Within 2 Sprints

### D003 — Auth System — No Automated Tests
**Priority:** P1
**Gap:** `backend/src/routes/auth.js` — the magic link request, callback, and `/me` endpoints have no automated test in the backend integration suite. The login limiter (15-min window, max 5) is also untested.
**Fix:** Add backend integration tests for `POST /api/v1/auth/request-magic-link` (rate-limit enforcement) and `GET /api/v1/auth/me` (valid token returns profile, invalid token returns 401). Can run in CI_SAFE mode using a test account.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D004 — Walk-up Songs — No Test Coverage
**Priority:** P1
**Gap:** The Songs sub-tab (Out Tonight filtering, batting order ordering, Play button behavior) has no automated test. Deep-link behavior (Spotify/Apple Music/YouTube intercept) is OS-mediated and cannot be unit-tested, but the filtering logic can be.
**Fix:** Add Vitest tests for the Songs tab data derivation — given a roster with Out Tonight players, confirm they're excluded from the Songs list; confirm ordering matches batting order.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D005 — Share Links — No Automated End-to-End Test
**Priority:** P1
**Gap:** No automated test confirms that share links render correctly for unauthenticated users. The health-check.yml cron is the only coverage, and it doesn't validate link content.
**Fix:** Add a health-check test that fetches `?s=<known-test-link>` and confirms: HTTP 200, no redirect to login, defense grid content present in response.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D006 — Game Mode — No Automated Tests
**Priority:** P1
**Gap:** Game Mode (full-screen view, inning advance, batting strip, Quick Swap) has zero automated coverage. All validation is manual via the game-day validation checklist.
**Fix:** Add Vitest component tests for `GameModeScreen.jsx` — at minimum: renders for given lineup data, inning advance increments correctly, Out Tonight players appear in the strip.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D007 — Admin UI (admin.html) — No Automated Tests
**Priority:** P1
**Gap:** `frontend/public/admin.html` is a standalone HTML/JS page with no test coverage. Approval routing, member management, and feedback tabs are all manually validated only.
**Fix:** Add backend integration tests for the admin routes (`/admin/requests`, `/admin/approve`, `/admin/reject`, `/admin/members`) covering the happy path and auth guard (requireAdmin).
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D008 — Out Tonight Attendance — No Dedicated Test File
**Priority:** P1
**Gap:** Out Tonight is covered indirectly by engine bench tests (absent player exclusion) but there is no test for the UI-layer behavior: attendance toggle, localStorage persistence, auto-clear on next game day, or Supabase sync.
**Fix:** Add a dedicated `attendance.test.js` or extend `engine.v2.test.js` with an explicit Out Tonight section covering: toggle persists to localStorage, auto-clear logic runs on next game day date, absent players excluded from all 11 surfaces.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D009 — CLAUDE.md `Frontend Structure` — App.jsx Line Count Stale
**Priority:** P1
**Gap:** `CLAUDE.md` § Frontend Structure still reads "All UI and business logic lives in `frontend/src/App.jsx` (~5,000 lines)." Actual line count is ~9,834. The Key sections block also references tabs (Defense, Batting) that have been restructured.
**Fix:** Update CLAUDE.md Frontend Structure to reflect current line count (~9,834) and current tab structure (Lineups, Songs, Game Mode).
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D010 — MASTER_DEV_REFERENCE.md — Vitest CI Target Stale
**Priority:** P1
**Gap:** `MASTER_DEV_REFERENCE.md` doesn't mention the Vitest test count. `CLAUDE.md` Test Suite section says "CI target: 257 passed / 1 skipped / 0 failed" but actual result is 261 passed / 1 skipped / 0 failed (as of v2.2.31).
**Fix:** Update `CLAUDE.md` Test Suite section CI target to "261 passed / 1 skipped / 0 failed".
**Effort:** S
**Opened:** v2.2.33 (April 2026)

---

## P2 — Fix Opportunistically

### D011 — PDF Export — No Automated Tests
**Priority:** P2
**Gap:** PDF generation (lineup card, batting order, diamond) has no automated test. jsPDF is loaded on demand and the output is binary — hard to unit test. At minimum, the data preparation before `jsPDF()` could be tested.
**Fix:** Extract PDF data-prep functions from App.jsx into a testable module; add unit tests for data shape (player count, inning count, position labels).
**Effort:** L
**Opened:** v2.2.33 (April 2026)

### D012 — Fairness Check — No UI-Layer Test
**Priority:** P2
**Gap:** The Fairness Check violation warnings (catcher twice, back-to-back position, benched more than once) are surfaced in the UI but there is no test that the warning display logic fires correctly given a lineup with known violations.
**Fix:** Add a test that generates a lineup with known violations and asserts `warnings.length > 0` with the right violation types.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D013 — Roster Backup/Restore — No Automated Tests
**Priority:** P2
**Gap:** The in-app backup (download file) and restore (from file) flows have no automated test. The `team_data_history` snapshot trigger and recovery endpoint are covered by the backend integration suite, but the frontend restore UI is not.
**Fix:** Add a Vitest test that mocks a backup file, calls the restore handler, and confirms roster state matches the backup payload.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D014 — Multi-Team Support — Limited Test Coverage
**Priority:** P2
**Gap:** Team switching, team creation, and team deletion flows have no dedicated test. `migrations.test.js` covers data migration but not the team management UI logic.
**Fix:** Add Vitest tests for team CRUD state transitions — create team → loadTeam → delete team confirms state resets.
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D015 — Schedule AI Import — No Automated Tests
**Priority:** P2
**Gap:** The AI import flow (`POST /api/ai` → parse response → merge into schedule) has no automated test. The Claude API call is proxied through the backend and the parsing logic lives in App.jsx.
**Fix:** Extract the schedule-parse response handler into a testable utility; add Vitest tests with fixture responses (valid schedule, malformed response, empty response).
**Effort:** M
**Opened:** v2.2.33 (April 2026)

### D016 — Batting Stats Calculations — No Dedicated Tests
**Priority:** P2
**Gap:** AVG, AB, H, R, RBI calculations and `fmtAvg` / `fmtStat` helpers are tested in `formatters.test.js` but the batting order sort logic and stat aggregation across games is not separately tested.
**Fix:** Add Vitest tests for batting order stat derivation — given game results, confirm computed AVG/AB/H/R/RBI are correct; confirm sort order is deterministic.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D017 — Coach PIN — No Automated Tests
**Priority:** P2
**Gap:** The Coach PIN lock/unlock flow (finalize lineup, PIN prompt, locked state enforcement) has no automated test coverage.
**Fix:** Add Vitest tests for the PIN state machine — set PIN → lineup locked → wrong PIN rejected → correct PIN unlocks.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D018 — Feature Flags — Supabase Table Integration Untested
**Priority:** P2
**Gap:** `flagBootstrap.test.js` covers localStorage and URL param bootstrap but not Supabase `feature_flags` table queries. If the table query fails silently, flags default to the compile-time value with no warning.
**Fix:** Add a test (mock Supabase client) that confirms flag values from the Supabase table override the compile-time default, and that a table query failure falls back gracefully to the compile-time value.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D019 — SOLUTION_DESIGN.md — `snack_duty` Deprecation Note is Outstanding
**Priority:** P2
**Gap:** `SOLUTION_DESIGN.md` notes `snack_duty jsonb — deprecated as of v1.4.0`. The drop-column action (`ALTER TABLE team_data DROP COLUMN snack_duty`) is listed in `MASTER_DEV_REFERENCE.md` Outstanding Manual Actions but has not been executed.
**Fix:** Execute the column drop in Supabase SQL Editor, remove the deprecation note from SOLUTION_DESIGN.md, and remove the action from MASTER_DEV_REFERENCE.md Outstanding Actions.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D020 — PERSONAS.md Cadence Note Stale in MASTER_DEV_REFERENCE.md
**Priority:** P2
**Gap:** `MASTER_DEV_REFERENCE.md` § Document Governance table shows `PERSONAS.md` with cadence note "Refresh pending v2.2.32". The refresh happened in v2.2.31.
**Fix:** Update the PERSONAS.md cadence note to remove "Refresh pending" language.
**Effort:** S
**Opened:** v2.2.33 (April 2026)

### D021 — Analytics — No Event-by-Event Test Coverage
**Priority:** P2
**Gap:** `trackingUrl.test.js` covers `outboundLinkProps` and CAMPAIGNS registry but there is no test that each of the 32+ Mixpanel events actually fires in the correct context with the expected properties.
**Fix:** Add a Vitest test with a mocked `mixpanel.track` spy; trigger each tracked user action and assert `track` was called with the right event name and properties. Start with the 5 highest-value events: `lineup_generated`, `share_link_opened`, `game_mode_opened`, `player_marked_out`, `song_play_tapped`.
**Effort:** L
**Opened:** v2.2.33 (April 2026)

---

## Resolved Items

*None yet. First entry goes here when a debt item is closed.*

Format: `✅ D000 — Resolved v2.2.XX — [what fixed it]`
