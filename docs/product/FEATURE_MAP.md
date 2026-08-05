# Dugout Lineup — Feature Map

> Authoritative mapping of every shipped feature to its documentation and test coverage.
> Update this file whenever a feature ships, changes behavior, or gains new tests.
> Owner: KK | Last updated: 2026-08-05 (DOC_TEST_DEBT.md P1 "Missing Feature Rows" closure, #576 -- added rows 36 Analytics + 37 PWA Setup, renamed row 22 "Governance infrastructure" -> "Governance" for exact Area-value match, Coverage Summary recounted 30/5/0/10/14/11 -> 32/5/0/10/14/13 over 37; previously updated 2026-08-04 for Doc Audit Spike Story 6)

---

## How to Read This Table

| Column | Values |
|--------|--------|
| **Status** | `MVP` · `Pilot` · `Phase 2` · `Phase 3` · `Removed` |
| **Doc Status** | `✅ Current` · `⚠ Stale` · `❌ Missing` |
| **Test Status** | `✅ Yes` · `⚠ Partial` · `❌ None` |
| **Debt** | ID(s) in `DOC_TEST_DEBT.md` — blank if clean |

---

## Feature Registry (37 features)

| # | Feature | Status | Primary Doc | Doc Status | Test File(s) | Test Status | Debt |
|---|---------|--------|-------------|------------|--------------|-------------|------|
| 1 | **Auto-assign lineup engine (V2)** | MVP | `SOLUTION_DESIGN.md` § Scoring Engine | ✅ Current | `engine.v2.test.js`, `lineupEngineV2-unit.test.js`, `bench-equity.test.js`, `scoring.test.js` | ✅ Yes | — |
| 2 | **Manual grid overrides + cell lock** | MVP | `SOLUTION_DESIGN.md` § Field Layout | ✅ Current | `engine.v2.test.js` (partial — lock not unit tested) | ⚠ Partial | — |
| 3 | **Batting order (drag, stats, season AVG)** | MVP | `PERSONAS.md` § Head Coach features | ✅ Current | None | ❌ None | — |
| 4 | **Schedule management + AI import** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | — |
| 5 | **Game result logging + batting stats** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | — |
| 6 | **Walk-up songs per player** | MVP | `SOLUTION_DESIGN.md` § Walk-up Songs Architecture; `CHARTER.md` § Scope | ✅ Current | None | ❌ None | — |
| 7 | **Out Tonight attendance tracking** | MVP | `CLAUDE.md` (as "Out Tonight"); `ROADMAP.md` § v2.2.30 | ✅ Current | `engine.v2.test.js` Group 6, `lineupEngineV2-unit.test.js` Group X, `bench-equity.test.js` absent-player | ⚠ Partial | — |
| 8 | **Game Mode (full-screen dugout view)** | Removed | `SOLUTION_DESIGN.md` § Navigation Structure | ⚠ Stale | None | ❌ None | ScoringMode render block + Scoring tab removed in Slice 3 (v2.5.9); legacy `ScoringMode/index.jsx` deleted in Slice 4 (v2.5.11). Superseded by #25. |
| 9 | **Share links (8-char Supabase-backed)** | MVP | `SOLUTION_DESIGN.md` § RLS Policy Map; `CLAUDE.md` Auth Principle | ✅ Current | None | ❌ None | Share CTA restored to Lineups tab — Story 67 (PR #99, v2.5.15) |
| 10 | **PDF export + print view** | MVP | `ROADMAP.md` § v1.x | ⚠ Stale | None | ❌ None | — |
| 11 | **Live scoring (scorer lock, inning entry, game finalization)** | MVP | `ROADMAP.md` § v2.2.29–v2.3.3; `PERSONAS.md` § Scorekeeper; `MASTER_DEV_REFERENCE.md` § Game Object Shape | ✅ Current | `finalizeSchedule.test.js`, `undoHalfInning.test.js`, `newGameTemplate.test.js`, `practiceModeIsolation.test.js`, `realtimeRaceGuard.test.js`, `runnerPlacement.test.js` | ⚠ Partial | Scoring surfaces through Combined Game View (#25) only. Slice 4 (v2.5.11) deleted legacy `ScoringMode/index.jsx`; the 7 live child components (`ScoringModeEntry`, `LiveScoringPanel`, `RestoreScoreModal`, `FinishGameModal`, `GameModeGearMenu`, `LiveScoreViewer`, `RunnerConflictModal`) remain in `components/ScoringMode/` and are imported by `DugoutView.jsx`. Optional follow-up: relocate to `components/game-mode/scoring/`. |
| 25 | **Combined Game View (DugoutView — unified scoring surface)** | MVP | `docs/SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `BattingOrderStrip.test.jsx` (6), `DugoutView.test.jsx` (5), `ScoreboardRow.test.jsx` (4), `DugoutView.viewport.test.jsx` (3) | ⚠ Partial | GA default-on as of Slice 3 (v2.5.9); mutual-exclusion invariant untested (legacy ScoringMode removed) |
| 26 | **ACCESSIBILITY_V1 — Game Mode a11y enhancements** | MVP | `CLAUDE.md` § Feature Flags; `docs/product/A11Y_AUDIT.md`; `SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `a11y-component-fixes.test.jsx` (11), `accessibility.v1.test.js` (23) | ⚠ Partial | Game Mode font/touch/contrast untested at component level; F1-F7 fixes covered |
| 27 | **Design Tokens — semantic token foundation** | Phase 2 | `docs/product/DESIGN_AUDIT.md`; `SOLUTION_DESIGN.md` § Design Tokens Architecture | ✅ Current | `theme.tokens.test.js` (34) | ⚠ Partial | Shape contract tested; no consumer tests (zero consumers in Phase 1a). Story 102 (v2.5.25, PR #271): App.jsx OUT-row error tint migrated to `tokens.color.overlay.error*`; `errorMid` token added (`rgba(220,38,38,0.12)`) — zero visible change, contract covered by `theme.tokens.test.js`. |
| 28 | **UI primitives — Badge / Button / Card / Stack / Text** | Phase 2 | `ROADMAP.md` § v2.5.10; `CLAUDE.md` § UI Primitives | ✅ Current | `Badge.test.jsx`, `Button.test.jsx`, `Card.test.jsx`, `Stack.test.jsx`, `Text.test.jsx` (107 total) | ⚠ Partial | Primitives covered in isolation; 2 consumers migrated as of v2.5.11 (PlayerHandBadge via PR #62, EmptyState via PR #68); more queued for Phase 3 Step 3+. Badge gained `context='light'\|'dark'` prop in v2.5.12 (PR #73); dark variants are token-driven. |
| 12 | **Practice Mode** | MVP | `CLAUDE.md` § Live Scoring Architecture; `ROADMAP.md` § v2.3.3 | ✅ Current | `practiceModeIsolation.test.js` | ✅ Yes | — |
| 13 | **Runner Placement on Diamond** | MVP | `CLAUDE.md` § Roster identity; `ROADMAP.md` § v2.3.3 | ✅ Current | `runnerPlacement.test.js` | ✅ Yes | — |
| 14 | **Opponent Half Tracking** | MVP | `CLAUDE.md` § Live Scoring Architecture; `ROADMAP.md` § v2.3.2–v2.5.0 | ✅ Current | `liveStateMerge.test.js` (opp integration) | ⚠ Partial | Status corrected 2026-08-04 (Pilot → MVP): no gating flag exists for this feature — it's part of core live-scoring behavior, same as row 11. |
| 15 | **Feature flag system** | MVP | `CLAUDE.md` § Feature Flags; `SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `flagBootstrap.test.js`, `accessibility.v1.test.js`, `scoringSheetV2.test.js`, `useFeatureFlags.test.js` (7 tests, PR #426) | ⚠ Partial | D-S30 — useFeatureFlags.test.js covers fetchRuntimeFlags' 4 branches + hook end-states; D-S30's isFlagEnabled DB-read-path gap needs re-verification against current source before closing |
| 23 | **Scoring outcome sheet (SCORING_SHEET_V2)** | MVP | `ROADMAP.md` § v2.5.0; `CLAUDE.md` § Current Version | ✅ Current | `scoringSheetV2.test.js` | ⚠ Partial | D-S30; Status corrected 2026-08-04 (Pilot → MVP): `SCORING_SHEET_V2` is `true` in `frontend/src/config/featureFlags.js` — GA default-on with a kill-switch, not a limited pilot. |
| 16 | **Auth system (magic link + Google OAuth)** | MVP | `SOLUTION_DESIGN.md` § Auth Architecture; `CLAUDE.md` § Auth Strategy | ✅ Current | None | ❌ None | Informally tracked under DOC_TEST_DEBT.md's "D003 auth umbrella" (prose reference, not a numbered tracked item — see that file's D-S428b entry). Status corrected 2026-08-04 (Phase 2 → MVP): the auth gate has been live in prod since v2.6.0, not a future phase. |
| 17 | **Admin UI (admin.html)** | MVP | `SOLUTION_DESIGN.md` § Admin UI; `PERSONAS.md` § Administrator | ⚠ Stale | None | ❌ None | #338: !! admin.html writes DIRECTLY to Supabase via the client SDK. It bypasses normalizeRole, requireAuth, requireAdmin, reviewed_by attribution, and auth-event logging. A fix to a backend route DOES NOT FIX THE PANEL. |
| 18 | **Roster backup/restore** | MVP | `SOLUTION_DESIGN.md` § Data Protection | ✅ Current | `backend/src/__tests__/teamData.guard.test.js` (12), `teamData.routes.test.js` (6) | ⚠ Partial | Test Status corrected 2026-08-04 (None → Partial): the wipe-guard and recovery/history endpoint are covered on the backend (PR #282, Story 99 tranche 1). Frontend "Restore Previous Roster" UI itself remains untested. |
| 19 | **Multi-team support** | MVP | `CLAUDE.md` § Architecture | ✅ Current | `migrations.test.js` (partial — migration only) | ⚠ Partial | — |
| 20 | **Fairness Check + violation warnings** | MVP | `SOLUTION_DESIGN.md` § Scoring Engine | ✅ Current | `engine.v2.test.js` (violations surfaced) | ⚠ Partial | — |
| 21 | **Player profiles (V2 attributes)** | MVP | `SOLUTION_DESIGN.md` § Player Attributes; `PERSONAS.md` § Head Coach | ✅ Current | `scoring.test.js`, `lineupEngineV2-unit.test.js` | ✅ Yes | — |
| 22 | **Governance** | MVP | `CHARTER.md`, `ONE_PAGER.md`, `ROADMAP.md`, `PERSONAS.md`, `faqs.js`, `FEATURE_MAP.md`, `MASTER_DEV_REFERENCE.md`, `CLAUDE.md` | ✅ Current | — | ❌ None | — |
| 24 | **Toast UI primitive** | MVP | `CLAUDE.md` § UI Primitives | ✅ Current | `src/components/ui/Toast.test.jsx` | ✅ Yes | — |
| 29 | **BottomSheet UI primitive** | MVP | `CLAUDE.md` § UI Primitives | ✅ Current | `src/components/ui/BottomSheet.test.jsx` (7 tests, BS1–BS7); `theme.tokens.test.js` (+6 tests for `radius.sheet` + `shadow.sheetTop`) | ✅ Yes | LockFlow is the sole consumer today (v2.5.21); future modals/pickers expected to migrate. Pill + ListRow (v2.5.14) and the Phase 2 primitives row (#28) cover other shipped primitives — pre-existing gaps where this map lags shipped primitives. |
| 30 | **DefenseDiamond — Game Day diamond view** | MVP | `ROADMAP.md` §§ Stories 92, 93; `SOLUTION_DESIGN.md` § Design Tokens (v2.5.22 + v2.5.24 additions) | ✅ Current | None at component level; token contract covered by `theme.tokens.test.js` | ❌ None | Tier A+B token migration shipped v2.5.22 (Story 92, PR #218). Tier D shipped v2.5.24 (Story 93, PR #259): position.* (22 keys), field.* (7 keys), overlay.error* (4 tints); POS_COLORS prop drilling removed from App.jsx → ParentView; DefenseDiamond, App.jsx renderFieldSVG, and ParentView unified on identical token contract. |
| 31 | **MaintenanceScreen — error / maintenance surface** | MVP | `ROADMAP.md` § Story 94; `SOLUTION_DESIGN.md` § Design Tokens (v2.5.22 additions) | ✅ Current | `MaintenanceScreen.test.jsx` (5 render/smoke tests, PR #426) | ✅ Yes | Token migration shipped v2.5.22 (Story 94, PR #220). Self-styled via design tokens — see CLAUDE.md § Self-styled Support components convention. |
| 32 | **sync-stories-to-issues.js — ROADMAP → GitHub Issues automation** | MVP | `ROADMAP.md` § Story 97; `CLAUDE.md` § Issue & Backlog Hygiene | ✅ Current | `scripts/__tests__/sync-patch.test.js` (4 tests: parseStories CRLF, patchHeading marker replace, idempotency, byte-level CRLF integrity) | ✅ Yes | CRLF byte-corruption fix shipped v2.5.22 (Story 97, PR #234). Both patch sites collapsed to shared `patchHeading()`; `findExistingOpenIssue` dead-code bug fixed. CI guard via `sync-script` job. |
| 33 | **Backend test foundation** | ✅ Resolved | `ROADMAP.md` §§ Story 99; `backend/CLAUDE.md` § Test Suite | ✅ Current | `backend/src/__tests__/` — `admin.auth.test.js` (9), `teamData.guard.test.js` (12), `teamData.envGuard.test.js` (2), `teamData.routes.test.js` (6), `aiProxy.test.js` (6), `auth.happy.test.js` (4), `approve.role.test.js` (6), `approveLink.role.test.js` (7), `requestAccess.role.test.js` (7), `normalizeRole.test.js` (13), `loginLimiter.test.js` (3), `auth.session.test.js` (8), `feedback.test.js` (7) = 111 | ✅ Yes — #252 fully closed | #252 closed 2026-08-01: unit suite 39 → 111. Closure pass added `GET/PATCH /me`, `POST /logout`, and `POST /feedback` coverage (all previously untested), plus a real loginLimiter fix (Story 26, IP→email re-keying). Writing `feedback.test.js` surfaced a live production bug — `admin.js`'s catch-all auth gate was mounted before `feedback.js`, so every non-admin coach's feedback submission was silently returning 403 — fixed via mount-order in `app.js` (v2.8.3). Remaining gap (admin.js's 7 other routes still rejection-only coverage) tracked separately as Story 112 (#474), not blocking this row's resolution. |
| 34 | **About tab (Builder profile + AboutTab extraction)** | MVP | `ROADMAP.md` § Story 105 | ✅ Current | `AboutTab.test.jsx` (13 tests, AT1–AT13) | ✅ Yes | `status.warning` eyebrow contrast ~3.4:1 documented debt; Support tab reorder pending (#285 / Story 107) |
| 35 | **Demo All-Stars team (Try Demo Team onboarding)** | MVP | `ROADMAP.md` § v2.5.30 | ✅ Current | `demoSeed.test.js` (8 data-shape assertions, PR #426; DS8 tightened to exact-match by PR #430) | ⚠ Partial | D-S332 remains open — demoSeed.test.js covers the seed data's shape only, not `loadDemoTeam()`'s fresh-create/upgrade/dedup behavior, which is what D-S332 tracks; seeded from `frontend/src/data/demoSeed.js` (frozen clone of real team data, all names remapped); per-user local copy; `demoSeedVersion` upgrade path (Story 332, v2.5.30) |
| 36 | **Analytics (Mixpanel + Vercel Analytics + UTM)** | MVP | `docs/analytics/ANALYTICS.md`; `SOLUTION_DESIGN.md` § Analytics Architecture | ✅ Current | None | ❌ None | Analytics track() Wrapper + SSR Guards — no test covers the window/navigator SSR guard branches (DOC_TEST_DEBT.md P2) |
| 37 | **PWA Setup (install prompt + service worker)** | MVP | `SOLUTION_DESIGN.md` § PWA Setup | ✅ Current | None | ❌ None | PWA Install Prompt Logic — Android/iOS/already-installed platform branches untested (DOC_TEST_DEBT.md P2) |

---

## Coverage Summary

| Status | Count |
|--------|-------|
| ✅ Doc Current | 32 / 37 |
| ⚠ Doc Stale | 5 / 37 |
| ❌ Doc Missing | 0 / 37 |
| ✅ Tests Exist | 10 / 37 |
| ⚠ Tests Partial | 14 / 37 |
| ❌ No Tests | 13 / 37 |

> **Recounted 2026-08-05** (DOC_TEST_DEBT.md P1 "Missing Feature Rows" closure, #576): rows 36 (Analytics) and 37 (PWA Setup) added, both Doc Current / No Tests — denominator 35→37, Doc Current 30→32, No Tests 11→13, all other categories unchanged. Row 22 renamed "Governance infrastructure" → "Governance" for exact Area-value string match (mechanical-lookup fix, no count change). Direct recount against the table above, not propagated arithmetic.
>
> **Recounted 2026-08-04** (Doc Audit Spike Story 6): the Test Status row previously read 8/12/15, which didn't match a direct tally of the table above even before this pass's Row 18 fix (a real count gave 10/13/12; Row 18's fix then moved one row from None to Partial, landing on 10/14/11). Recount before editing this summary block in the future — it has drifted from the table's actual contents more than once (see also D-S31 in `DOC_TEST_DEBT.md` for the same failure mode on the row-count denominator).

> The test gap is large but expected — the engine is the highest-risk surface and is well-covered. Features with no test are all UI-layer or integration paths with no engine logic.

---

## Update Rules

> **Known gap (April 27, 2026):** Feature rows for v2.4.0 (Game context header, home/away semantic), v2.5.0 (SCORING_SHEET_V2 default-on, GameContextHeader consolidation prep), and v2.5.1 (truncateTeamName upgrade, ScoreboardRow typography promotion, Game N + Home/Away chip pattern, SharedView component name) are not yet registered. To be added in a focused session — requires reading existing row schema first. Tracked in DOC_TEST_DEBT.md.

See `CLAUDE.md` § Feature Map Update Rules for the full protocol. Quick reference:

1. New feature ships → add a row, set status, fill doc/test status honestly
2. Feature behavior changes → update Doc Status to `⚠ Stale` until docs are fixed
3. Docs repaired → flip Doc Status to `✅ Current`
4. Tests added → flip Test Status to `✅ Yes` or `⚠ Partial`
5. Debt item created → add the ID to the Debt column
6. Debt item resolved → remove the ID and update Test/Doc status
