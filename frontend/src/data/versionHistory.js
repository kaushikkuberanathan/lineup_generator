export var VERSION_HISTORY = [
  {
    version: '2.5.6',
    date: '2026-05-03',
    headline: 'UX track Phase 1a — accessibility GA, design tokens scaffolding, and tooling foundation',
    userChanges: [
      'Larger, more readable text across Game Mode and lineup screens',
      'Bigger, easier-to-tap buttons throughout Game Mode',
      'Improved color contrast for outdoor visibility',
      'Position labels (P, C, 1B, SS, OF) now have proper screen reader support',
    ],
    techNote: 'Under-the-hood stability improvements',
    internalChanges: [
      'ACCESSIBILITY_V1 feature flag promoted to GA (default-on; rollback per-user via localStorage flag_ACCESSIBILITY_V1=false if needed)',
      'Component a11y fixes F1-F7: DefenseDiamond inning label (9px→11px) and outs header (9px→11px), OfflineIndicator status label (10px→12px), NowBattingStrip aria-labels for prev/next batter, LockFlow dialog role + aria-modal, DefenseDiamond outlined-pill contrast on inning row',
      'Design tokens scaffolding: theme/tokens.js (186 lines, semantic tokens), theme/index.js (barrel export), DESIGN_AUDIT.md (provenance audit, 675 lines)',
      'Phase 1c shadow tokens (PR #41): theme/tokens.js shadow group added (subtle/card/elevated/overlay); five call-site migrations from inline boxShadow literals (LoginScreen, PendingApprovalScreen, RequestAccessScreen, FairnessCheck, Toast); theme.tokens.test.js expanded 27→34 tests',
      'ESLint pipeline restoration: .eslintrc.cjs config (ESLint 8.57 legacy format), LINT_BASELINE.md baseline (144 problems documented, 21 FIX-NOW resolved, 123 outstanding), 12 file lint touchups (eslint-disable suppressions and exhaustive-deps annotations — no logic changes)',
      'New test files: a11y-component-fixes.test.jsx (11 tests covering F1-F7), theme.tokens.test.js (34 tests covering token contract shape; expanded from 27 in Phase 1c shadow tokens)',
      'accessibility.v1.test.js updated for GA default (22→23 tests, +1 Group 5 GA-default + override test)',
      'New tooling: scripts/recon/a11y-recon.ps1 (a11y audit automation, 282 lines)',
      'New documentation: A11Y_AUDIT.md (F1-F7 categorization + resolution log), UX_REFACTOR_ROADMAP.md (Phase 1a/1b/1c roadmap, parallel to main ROADMAP.md), LINT_BASELINE.md, DESIGN_AUDIT.md',
      'Test suite count: 452 → 499 passing / 1 skipped (34 files; includes Phase 1c +7 net from shadow token tests, plus +1 test 4.7 recovered from main during release merge)',
    ],
  },
  {
    version: '2.5.5',
    date: '2026-05-02',
    headline: 'Slice 1 of combined game view — batting strip and scoreboard tests',
    userChanges: [
      'No user-facing changes — combined view feature flag remains OFF in production.',
    ],
    techNote: 'Under-the-hood stability improvements',
    internalChanges: [
      'Added BattingOrderStrip component (frontend/src/components/BattingOrderStrip/index.jsx) — read-only batting order display (Now Batting / On Deck / In Hole / +N more) for DugoutView',
      'Integrated BattingOrderStrip into DugoutView.jsx: renders in both entry (below ScoringModeEntry) and active scoring (above LiveScoringPanel) states',
      'Added currentBatterIndex prop to DugoutView; wired at App.jsx call site',
      'New tests: BattingOrderStrip.test.jsx (6 tests), DugoutView.test.jsx (5 tests), ScoreboardRow.test.jsx (4 tests — resolves D017)',
      'D017 resolved: ScoreboardRow now has full unit test coverage (prop matrix, +1 buttons, defaults)',
      'Suite: 437 → 452 tests passing',
    ],
  },
  {
    version: '2.5.4',
    date: '2026-05-01',
    headline: 'Slice 0 of combined game view — internal lift behind feature flag',
    userChanges: [
      'No user-facing changes — combined view feature flag remains OFF in production.',
    ],
    techNote: 'Under-the-hood stability improvements',
    internalChanges: [
      'Lifted ScoringMode/index.jsx logic into DugoutView.jsx under COMBINED_GAMEMODE_AND_SCORING flag',
      'ScoringMode/index.jsx remains in repo behind flag for one soak cycle, planned for deletion in follow-up slice',
      'App.jsx flag gating: PRIMARY_TABS hides Scoring tab when flag ON; GAMEDAY_SUBTABS hides DUGOUT VIEW pill when flag OFF; ScoringMode render branch gated on flag OFF',
      'Mutual exclusion enforced: flag OFF ships ScoringMode + Scoring tab; flag ON ships DugoutView + DUGOUT VIEW pill',
      'Story 27 (P0) opened: share-link viewer routing broken in prod (pre-existing bug, separate hotfix)',
      'Stories 40-44 captured: pre-push hook merge-commit detection, Defender fork-spawn workaround, hook env-vs-test differentiation, branch protection bypass posture, bypass audit convention',
    ],
  },
  {
    version: '2.5.3',
    date: 'April 2026',
    headline: 'Branch strategy enforcement, governance hardening, and rate limiter docs corrections',
    userChanges: [
      'No user-facing changes — internal hygiene release.',
    ],
    techNote: 'Minor fixes and internal improvements',
    internalChanges: [
      'Added VERSION_HISTORY validation test enforcing approved techNote strings (frontend/src/__tests__/versionHistory.test.js)',
      'Extracted VERSION_HISTORY from App.jsx to frontend/src/data/versionHistory.js to enable testability without virtual:pwa-register/Supabase/analytics jsdom shims',
      'Corrected 24 historical techNote strings spanning v2.1.x through v2.4.0 to use the approved set',
      'Restored named UPDATES TAB CONTENT RULE heading in CLAUDE.md for grep auditability',
      "Added versionHistory.js to the extracted-modules list in CLAUDE.md (line 105) and replaced the non-approved 'Meta-governance release.' techNote example in the deploy checklist (line 669) with an approved string",
      'Branch enforcement: .husky/pre-push now blocks direct push to develop/main; ALLOW_DIRECT_PUSH=1 escape for declared hotfixes (Story 37 — Resolved).',
      'Pre-push hook: removed `|| npm test` retry that was duplicated and masked first-run failures (Story 32 — Resolved).',
      'Rate limiter docs: corrected CLAUDE.md and suite-rate-limits.js comment falsely stating /magic-link rate limiter was removed in v2.3.3. Limiter has been live continuously since v2.2.18 (Story 35 — Resolved).',
    ],
  },
  {
    version: '2.5.2',
    date: '2026-04-28',
    headline: 'Game Mode polish: clearer count strip, smarter notifications, fairer mercy banner',
    userChanges: [
      'Count strip redesigned: BALLS, STRIKES, and OUTS now sit in clearly separate pills with full labels — easier to read at a glance from the dugout.',
      'Count strip now updates correctly when the opposing team is batting — same display whether you are scoring or watching.',
      'Half-inning notifications appear at the top of the screen and can be dismissed with one tap.',
      'Mercy run banner now appears symmetrically for both home and opposing innings.',
    ],
    techNote: 'Bug fixes and performance improvements',
    internalChanges: [
      'LiveScoringPanel: refactored count strip into two scope-grouped pills (count + outs) with stacked label-above-value cells.',
      'LiveScoringPanel: single render surface for count/outs — top pill binds dynamically to active batter via isHomeBatting; legacy bottom opponent count strip removed.',
      'Toast primitive added (top-anchored, dismissable, auto-clearing) with project-convention inline styles.',
      'Half-inning notification migrated to Toast pattern.',
      'Mercy banner logic made symmetric across home and opponent halves.',
      '@testing-library/jest-dom added; vitest glob expanded to .jsx.',
    ],
  },
  {
    version: '2.5.1',
    date: '2026-04-24',
    headline: 'Game Mode: scoreboard upgraded, home/away chip, cleaner team name abbreviations',
    userChanges: [
      'Scoreboard team names are now larger and easier to read at a glance during games.',
      'Home and away games are now clearly labeled — away games show an amber "@ Away" chip, home games show a "Home" chip next to the game number.',
      'Long team names abbreviate cleanly by word boundary (e.g. "Timber Rattlers" → "T. Rattlers") instead of cutting off mid-word.',
    ],
    techNote: 'Bug fixes and performance improvements',
    internalChanges: [
      'truncateTeamName() in formatters.js: word-boundary-aware abbreviation (e.g. "Timber Rattlers" → "T. Rattlers"); default cap 12; unicode "…" ellipsis on overflow; single-word fallback unchanged.',
      'GameContextHeader component removed; game number relocated as inline Game N chip in all 3 header strips (STATE 1, STATE 3, main scorer); conditional on gameHeader.gameNumber != null — hidden in practice/orphan games.',
      'New: HomeAwayChip component in LiveScoringPanel.jsx — amber chip (@ Away, #f5c842) for away games, neutral chip (Home, #94a3b8) for home games; guard: selectedGame && typeof selectedGame.home === "boolean"; shown at all 3 render sites immediately after Game N chip.',
      'STATE 1 splash subtitle: home/away connector now derived from selectedGame.home (was hardcoded "vs"); subtitle fontSize 12px → 14px, color #64748b → #cbd5e1 (contrast 12.21:1).',
      'deriveGameHeader(): connector and homeIndicator fields marked deprecated in JSDoc — no longer consumed by production code after GameContextHeader removal; kept for test coverage.',
      'ScoreboardRow.labelStyle: fontSize 10px → 16px, color #aaa → #e2e8f0, fontWeight bold → 700, letterSpacing 0.5px → 0.08em.',
      'ScoreboardRow container: borderTop 2px solid rgba(245,200,66,0.4) added; minWidth:0 + overflow:hidden backstop.',
      'ScoreboardRow props: teamLabelSB/myTeamLabelSB derived with cap=10 to prevent label overflow on 375px viewports; all other render sites keep cap=12.',
      'Tests: opponentNameLabel.test.js and gameHeader.test.js updated; 2 net new tests; suite 419 → 421 / 1 / 0.',
    ],
  },
  {
    version: '2.5.0',
    date: '2026-04-24',
    headline: 'Scoring: cleaner outcome sheet — no strikeout button, Foul in pitch section',
    userChanges: [
      'Outcome sheet reorganized: "PITCH OUTCOME" section now has a single Foul button — tapping it mid-at-bat no longer requires the outcome sheet at all.',
      'Strikeout button removed from the outcome sheet — use the Strike (S) pitch button instead; 3 strikes ends the at-bat automatically.',
      'Out @ 1st and Flyout now share the top row of the at-bat outcomes, easier to tap.',
    ],
    techNote: 'Bug fixes and performance improvements',
    internalChanges: [
      'New: OUTCOME_ROWS_V2 export in LiveScoringPanel.jsx — Strikeout removed, Out@1st + Flyout in 2-button top row, Home Run full-width, Foul in PITCH OUTCOME header section.',
      'New: SCORING_SHEET_V2 feature flag in featureFlags.js (default true) — gates OUTCOME_ROWS_V2, section headers, and opp-half +1 button visibility.',
      'LiveScoringPanel.jsx: isFlagEnabled("SCORING_SHEET_V2") read at render; flag-off path preserves original OUTCOME_ROWS unchanged.',
      'Opp-half +1 Run buttons hidden when SCORING_SHEET_V2 enabled (replaced by ScoreboardRow +1 chips from v2.4.0).',
      'New: frontend/src/tests/scoringSheetV2.test.js (8 tests) — OUTCOME_ROWS_V2 shape: no strikeout, Out@1st+Flyout present, Home Run full-width, top row 2 buttons; foul invariant placeholders.',
      'Story 30 logged: isFlagEnabled() is synchronous (JS bundle + localStorage only) — DB feature_flags row flip has no runtime effect without a redeploy. Refactor deferred.',
      'Suite: 411 → 419 / 1 / 0.',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-04-24',
    headline: 'Scoring: game context header, your team name, cleaner scoreboard',
    userChanges: [
      'New header at the top of scoring: "GAME 4 · MUD HENS VS BANANAS 🏠" — always shows which game you are scoring.',
      'Home games show "vs" with a 🏠 indicator. Away games show "@" with no indicator.',
      'Scoreboard moved to its own row — larger, easier to read at a glance.',
      'Each team now has its own +1 button right next to its score — no more "which team?" popup.',
      'Your team name now appears throughout scoring in place of "Us" / "US".',
      'Long team names truncate to 12 characters with ".." (e.g., "Timber Rat..").',
    ],
    techNote: 'Under-the-hood stability improvements',
    internalChanges: [
      'New: frontend/src/utils/formatters.js#deriveGameHeader — pure function returns { gameNumber, myTeamLabel, opponentLabel, connector, homeIndicator }; null fallback for practice / missing data.',
      'New: GameContextHeader component in LiveScoringPanel.jsx — renders above existing team strip in STATE 1/2/3; hidden when gameHeader is null.',
      'New: ScoreboardRow component in LiveScoringPanel.jsx — dedicated score row with per-team +1 buttons directly calling addManualRun("us") / addManualRun("opp"); +1 buttons hidden when isScorer is false.',
      'LiveScoringPanel.jsx: myTeamLabel = truncateTeamName(activeTeam.name); replaces "US" scoreboard label and all home-team "Us"/"US" display strings.',
      'REMOVED: showManualRunPrompt state + modal + global +1 button. Replaced by per-team +1 buttons in ScoreboardRow.',
      'teamShort consolidated onto truncateTeamName; FinishGameModal prop contract unchanged.',
      'Tests: gameHeader.test.js (10) — suite 401 → 411.',
    ],
  },
  {
    version: '2.3.4',
    date: '2026-04-24',
    headline: 'Opponent team name throughout scoring',
    userChanges: [
      'Opponent team name now shows on the scoring screen — "Bananas #1" instead of "Player #1".',
      'Long team names wrap to 12 characters with ".." (e.g., "Timber Rat..").',
      '"+1 OPP Run" button now shows "+1 Bananas Run" (or the actual opponent name).',
      'Scoreboard "OPP" column now shows the opponent team name.',
    ],
    techNote: 'Minor fixes and internal improvements',
    internalChanges: [
      'New: frontend/src/utils/formatters.js#truncateTeamName — 10+".." truncation at >12 chars; "Team" fallback.',
      'LiveScoringPanel.jsx: teamLabel computed from truncateTeamName(opponentName); replaces "OPPONENT BATTER" label (→ "BATTING"), "Player #N" primary (→ "{team} #N"), "+1 OPP Run" button, and "OPP" scoreboard label across STATE 1/2/3.',
      'Tests: opponentNameLabel.test.js (6) — suite 395 → 401.',
    ],
  },
  {
    version: '2.3.3',
    date: '2026-04-23',
    headline: 'Live scoring accuracy and visual consistency improvements',
    userChanges: [
      'Practice mode: score a full game without saving — sandbox for pre-game walkthrough or rule testing.',
      'Runners now appear on bases correctly after Contact and Single (was silently broken in v2.3.2).',
      'Runner marked Out from 3rd base now increments the outs counter and triggers inning flip correctly.',
      'Runner names anchored to their correct bases on the diamond (no longer floating below the diamond).',
      'Diamond centered horizontally and vertically on screen.',
      'Pitch info no longer collides with the 2nd base runner name.',
      'Opponent batter card moved above the diamond to match home-team card position.',
      'Opponent pitch bar shows "Pitches: X of 5" countdown for the 8U five-and-out rule.',
      'Home-team runners no longer appear on the diamond during the opponent batting half.',
    ],
    techNote: 'Bug fixes and performance improvements',
    internalChanges: [
      'useLiveScoring.js: player ID fallback — roster entries have no .id field; player ? (player.id || name) : name used throughout scoring and runner state; resolves runner placement, run scoring, and diamond display broken in v2.3.2.',
      'useLiveScoring.js: lastAppliedAtRef (useRef) + updated_at timestamp guard in Realtime handler rejects stale and echo events (<= comparison); persist() and claimScorerLock() seed upsert both stamp ref in .then() success branch (async-after-success semantics).',
      'useLiveScoring.js: confirmRunnerAdvancement() out-branch increments outs and triggers endHalfInning().',
      'useLiveScoring.js: practice mode local-only path — isPractice=true bypasses all Supabase writes; claimScorerLock sets isScorer locally; heartbeat suppressed; Realtime subscription skipped.',
      'DiamondSVG: runner pills rendered via absolute positioning at base coordinates; floating row below diamond removed.',
      'LiveScoringPanel.jsx: Section 6 layout — flex:1 + flex-column resolves dead space and horizontal 2B label collision with pitch info.',
      'LiveScoringPanel.jsx: opponent batter card unified with home-team card (gold border, OPPONENT BATTER header, Player #N primary, Pitches: X of 5); duplicate Player #N label removed from fixed pitch bar.',
      'Test suite: 354 → 395 passing across 3 new test files — realtimeRaceGuard.test.js (3), practiceModeIsolation.test.js (7), liveStateMerge.test.js additions.',
    ],
  },
  {
    version: '2.3.2',
    date: '2026-04-21',
    headline: 'Opposing pitcher pitch counts',
    userChanges: [
      'Track opposing pitcher pitch counts in Game Mode — per batter, per inning, and per game.',
      'Opponent batter number (#1–#11) now visible during their at-bat.',
      'New Foul button for the opponent half (counts as a pitch, not a strike).',
    ],
    techNote: 'Bug fixes and performance improvements',
    internalChanges: [
      'Schema migration: added opp_balls, opp_strikes, opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches to live_game_state (smallint, NOT NULL, with defaults).',
      'recordOppPitch() branches: ball/foul increment counts only; strike/out/contact advance batter on at-bat end; inning total resets on half-flip, game total preserves.',
      'EXPECTED_LGS_KEYS full-row invariant expanded from 15 to 21 keys — locks in persist() payload shape.',
      'MERGE contract test file (liveStateMerge.test.js) grew +6 tests; total suite: 377 passing.',
      'Pitch totals label pattern: unit-on-left ("Pitches — Batter: X · Inn: X · Gm: X") to avoid per-value suffix ambiguity.',
      'Opp pitch buttons now color-coded: Ball blue, Strike red, Foul amber, Out grey, Contact green.',
    ],
  },
  {
    version: '2.3.1',
    date: 'April 2026',
    headline: "Scoring — runner accuracy and clearer controls",
    userChanges: [
      "Fixed: a runner could appear on two bases at once",
      "When two runners would land on the same base, you now pick what happens",
      "Back arrow in scoring now pauses (you stay as scorer) — use Exit Scoring in the gear menu to fully release the role",
      "Moved Exit Scoring into the gear menu",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "useLiveScoring.js: advanceRunners() exported — base-map (back-to-front) guarantees no player ID on two bases after any hit",
      "useLiveScoring.js: detectRunnerConflict() + applyConflictResolution() exported pure helpers — testable without hook",
      "useLiveScoring.js: confirmRunnerAdvancement() now detects base collisions and sets runnerConflict state instead of auto-scoring",
      "useLiveScoring.js: resolveRunnerConflict(decision) added — SCORE_BLOCKING / HOLD_INCOMING / CANCEL_PLAY; fires scoring_runner_conflict_prompted Mixpanel event",
      "useLiveScoring.js: preResolveSnapRef captures pre-play state at top of resolveAtBat() — powers CANCEL_PLAY restore",
      "ScoringMode/RunnerConflictModal.jsx: new modal — 3-button conflict resolution, aria-live=assertive, min 44px touch targets",
      "LiveScoringPanel.jsx: RunnerConflictModal wired; runnerSheet hidden while conflict is active",
      "GameModeGearMenu.jsx: Exit Scoring added as top item (neutral styling); header ← pauses (lock held)",
      "vite.config.js: setupFiles added (src/tests/setup.js) — matchMedia stub for jsdom",
      "src/__tests__/scoring/runnerAdvancement.test.js: tests 6-10 — conflict detection, SCORE_BLOCKING, HOLD_INCOMING, CANCEL_PLAY, analytics spy",
    ],
  },
  {
    version: '2.3.0',
    date: 'April 2026',
    headline: "Game Mode now saves your final score automatically when you finish a game",
    userChanges: [
      "Game Mode now saves your final score to your schedule automatically when you finish a game",
      "New X button to pause scoring and come back — your lock is held",
      "Game ending actions moved to the gear menu with clearer labels",
      "Undo the last End Half within 10 seconds",
      "New 'Finish Game' confirmation screen with score preview before committing",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Phase 1: game object shape — usScore, oppScore, gameStatus, finalizedAt added to all 3 newGame template sites",
      "Phase 2: MERGE_FIELDS extended with 4 new fields; all 3 test-file copies updated",
      "Phase 3: finalizeSchedule.js — pure utility reads localStorage, mutates game, syncs to Supabase team_data",
      "Phase 4: endGame() in useLiveScoring.js made async; calls finalizeSchedule before releaseScorerLock; returns { ok, error? }",
      "Phase 5: X (pause) and gear icons replace End Session button; GameModeGearMenu.jsx and FinishGameModal.jsx created; End Game removed from mercy banner",
      "Phase 6: undoHalfInning() added with undoSnapRef snapshot; 10s undo toast in LiveScoringPanel",
      "Phase 7: analytics events wired (scoring_paused, scoring_handed_off, inning_ended, inning_undo_tapped, game_finish_modal_opened, game_finish_confirmed, game_finish_cancelled, schedule_finalization_failed)",
      "Phase 8: finalizeSchedule.test.js (5 tests), undoHalfInning.test.js (3 tests), newGameTemplate.test.js (5 regression guard tests)",
      "Phase 9: version 2.3.0, all docs updated",
    ],
  },
  {
    version: '2.2.45',
    date: 'April 2026',
    headline: "Live scoring — full game tracking with opponent half",
    userChanges: [
      "Track opponent B/S/O count during their half",
      "5-run mercy banner for both teams",
      "End Inning and End Game buttons",
      "Select which half your team bats at game start",
      "Runner names shown on bases",
      "TOP/BOT and US/OPP labels in header",
      "Pitch buttons always visible",
      "Manual run prompts Us or Opp",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "useLiveScoring.js: makeDefaultGs() + oppRunsThisHalf, oppBalls, oppStrikes; recordOppPitch function with 3-out auto-flip; persist() + opp_runs_this_half; hydration + realtime handler read opp_runs_this_half",
      "useLiveScoring.js: addManualRun opp branch increments oppRunsThisHalf; endHalfInning and 3-out resolveAtBat reset oppRunsThisHalf/oppBalls/oppStrikes",
      "LiveScoringPanel.jsx: opponent half bar replaced with B/S/O pip display + 5 pitch buttons + run tracking + opponent mercy banner; scoring prop added",
      "ScoringMode/index.jsx: myTeamHalf state + setMyTeamHalf; handleClaimScorer(game, half); scoring={scoring} passed to LiveScoringPanel",
      "ScoringModeEntry.jsx: 'We bat: Top/Bottom' pill toggle; passes myTeamHalf to onClaimScorer",
      "All debug logs removed: [MANUAL RUN], [RETURN], [INDEX]",
    ],
  },
  {
    version: '2.2.44',
    date: 'April 2026',
    headline: "Scoring pitch buttons pinned — always visible",
    userChanges: [
      "Ball/Strike/K/Foul/Contact buttons now always visible at bottom of screen",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "LiveScoringPanel.jsx: pitch buttons container changed to position:fixed, bottom:60px, left:0, right:0, zIndex:50",
      "LiveScoringPanel.jsx: outer container changed from height:100vh+overflow:hidden to minHeight:100vh+overflow:visible+paddingBottom:160px",
      "LiveScoringPanel.jsx: flex:1 1 0 spacer div removed",
    ],
  },
  {
    version: '2.2.43',
    date: 'April 2026',
    headline: "Scoring fixes — layout, empty state, restore UUID",
    userChanges: [
      "Scoring screen layout improved — no more dead space",
      "Clearer message when no batting order is set",
      "Restore Scorebook no longer errors",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "LiveScoringPanel.jsx: marginTop:auto removed from pitch buttons container; explicit <div style={{flex:'1 1 0'}} /> spacer inserted between diamond section and pitch buttons",
      "LiveScoringPanel.jsx: 'No batting order configured' empty state replaced with two-line instructional message",
      "RestoreScoreModal.jsx: p_actor_id now passes null for local-xxx IDs — prevents Postgres uuid type error on restore_game_state RPC",
    ],
  },
  {
    version: '2.2.42',
    date: 'April 2026',
    headline: "Scoring layout fix + batting order from active roster",
    userChanges: [
      "Scoring screen no longer shows empty space",
      "Absent players excluded from batting order in scoring",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "App.jsx:9689: battingOrder={battingOrder} → battingOrder={activeBattingOrder} on <ScoringMode> render",
      "LiveScoringPanel.jsx: diamond+pitch-log section flex:'1 1 0' reverted to flexShrink:0",
      "LiveScoringPanel.jsx: pitch buttons div — marginTop:auto restored, padding tightened to 4px 16px, paddingBottom:80px",
    ],
  },
  {
    version: '2.2.41',
    date: 'April 2026',
    headline: "Scoring screen — pitch buttons always visible",
    userChanges: [
      "Ball/Strike/K/Foul/Contact buttons now always visible without scrolling",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "LiveScoringPanel.jsx: outer container minHeight:100vh → height:100vh + overflow:hidden",
      "LiveScoringPanel.jsx: diamond+pitch-log section flexShrink:0 → flex:'1 1 0' + overflow:hidden + minHeight:0",
      "LiveScoringPanel.jsx: pitch buttons container marginTop:auto removed; paddingBottom:72px added for fixed nav clearance",
    ],
  },
  {
    version: '2.2.40',
    date: 'April 2026',
    headline: "Fix: Live scoring rules load correctly — team prop wired to useLiveScoring",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "ScoringMode/index.jsx: added team: activeTeam to useLiveScoring() call",
      "Root cause: getRulesForTeam(team) received null because team prop was never passed; pitchUIConfig stayed null; UI hung on 'Loading rules...' permanently",
      "Fix: activeTeam flows App.jsx → ScoringMode (already wired) → useLiveScoring (now wired); rules and pitchUIConfig resolve on first render",
    ],
  },
  {
    version: '2.2.39',
    date: 'April 2026',
    headline: "Debt: FEATURE_MAP structural gaps logged for v2.2.40 repair",
    userChanges: [],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "DOC_TEST_DEBT.md: +2 P1 items — FEATURE_MAP structural restructure + missing feature rows (Analytics, PWA, Governance)",
      "Context: attempted v2.2.39 Backlog Adjacency System discovered FEATURE_MAP.md uses flat table format with no Code Surfaces column, blocking mechanical file→feature lookup",
      "Dashboard: P1 count +2 (4→6), total open +2 (17→19)",
    ],
  },
  {
    version: '2.2.38',
    date: 'April 2026',
    headline: "Documentation brought current — FAQs, personas, and architecture docs refreshed",
    userChanges: [
      "FAQ answers updated: Scorekeeper section added, Out Tonight and walk-up song answers clarified",
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "SOLUTION_DESIGN.md: Live Scoring Framework, CI/CD Pipeline, Analytics Architecture sections added; feature_flags table schema added; /health version bumped; Known Tradeoffs CI row corrected",
      "DOC_TEST_DEBT.md: Area field added to all 17 open items; 4 resolved doc gaps moved to Resolved section; dashboard corrected to 17 open (P0:2, P1:4, P2:11)",
      "FEATURE_MAP.md: Governance row (#19) added; D018 cleared from Feature Flag System row; Coverage Summary updated to 19 features",
      "PERSONAS.md: rewritten to 8 personas (Head Coach, Assistant Coach, Parent, Scorer, DJ Parent, Admin, Viewer, Child Player)",
      "faqs.js: Scorekeeper category added; head-coach Out Tonight and game-ball answers added; dj-parent Spotify deep-link FAQ added",
    ],
  },
  {
    version: '2.2.37',
    date: 'April 2026',
    headline: "Scoring session — stable local scorer ID",
    userChanges: [
      "Claim Scorer now works without requiring login",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "ScoringMode/index.jsx: _storedLocalId IIFE generates/retrieves scorer_local_id from localStorage; scoringUserId chain: user.id → session.user.id → _storedLocalId",
      "ScoringMode/index.jsx: isAdminTestMode = false (amber badge permanently removed)",
      "useLiveScoring.js: removed !_effectiveUserId null guards from audit(), startHeartbeat(), claimScorerLock(), releaseScorerLock()",
    ],
  },
  {
    version: '2.2.36',
    date: 'April 2026',
    headline: "Governance infrastructure activated",
    userChanges: [],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "docs/product/DOC_TEST_DEBT.md: replaced with enhanced format (emoji priority markers 🔴/🟠/🟡, table layout, 20 items across Test/Doc/Process gap categories, Debt Summary Dashboard, Revision History)",
      "scripts/debt-helpers.sh: added — debt, debt-all, debt-p0, debt-target, debt-next, debt-dashboard, debt-help shell helpers",
      "scripts/debt-helpers.ps1: added — same helpers for PowerShell (Windows)",
      "CLAUDE.md: Git Staging Discipline section added; debt-p0 minor-bump gate note added to Ship Gate; CI target updated to 306/1/0",
      ".gitignore: .vscode/ and .idea/ added",
    ],
  },
  {
    version: '2.2.35',
    date: 'April 2026',
    headline: "Test suite — share payload and Out detection coverage added",
    userChanges: [],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "attendance.test.js: Group 9 — buildSharePayload helper + 10 tests covering batting/roster/absentNames shape across no-absent, 1-absent, all-absent, out-of-roster-absent, and copy-safety scenarios",
      "attendance.test.js: Group 10 — computeOutByInning helper + 7 tests covering no-Out, single-inning Out, every-inning Out, multi-player Out, Bench-not-Out, missing-grid-entry, and innings-count-respected",
    ],
  },
  {
    version: '2.2.34',
    date: 'April 2026',
    headline: "Scoring session fix — real user ID from session",
    userChanges: [
      "Scoring now works without requiring full login",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "App.jsx: session={session} prop added to <ScoringMode> render",
      "ScoringMode/index.jsx: scoringUserId falls back to session.user.id then null; isAdminTestMode = !scoringUserId",
      "useLiveScoring.js: _effectiveUserId = userId || null; _effectiveUserName = userName || 'Coach'",
      "useLiveScoring.js: !_effectiveUserId null guard added to audit(), startHeartbeat(), claimScorerLock(), releaseScorerLock()",
    ],
  },
  {
    version: '2.2.33',
    date: 'April 2026',
    headline: "Governance infrastructure — Feature Map, Debt Ledger, and Ship Gate ritual added",
    userChanges: [],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "Added docs/product/FEATURE_MAP.md — authoritative feature-to-doc-to-test mapping (18 feature rows)",
      "Added docs/product/DOC_TEST_DEBT.md — debt ledger with 21 known gaps (2 P0, 8 P1, 11 P2)",
      "CLAUDE.md: added Ship Gate four-question ritual, Audit Cadence section, Feature Map Update Rules, updated Session Start Command to 8 steps, added Ship Gate as Deploy Checklist STEP 0, corrected test count to 261/1/0",
      "MASTER_DEV_REFERENCE.md: updated Session Start Command to 8 steps, added FEATURE_MAP.md and DOC_TEST_DEBT.md to Key File Locations, updated Document Governance table",
      ".claude/settings.local.json + frontend/.claude/settings.local.json: untracked (already in .gitignore — git rm --cached applied)",
      "Identified root cause of v2.2.31 scope creep: git add -A picked up pre-existing untracked CHARTER.md and ONE_PAGER.md. Fix: always stage specific files by path in deploy checklist (updated above)",
      "stash@{0} (ide-settings-noise) dropped — .gitignore already covers settings.local.json",
    ],
  },
  {
    version: '2.2.31',
    date: 'April 2026',
    headline: "FAQ, Personas, and Solution Design updated — all role and auth copy is now current",
    userChanges: [
      "FAQ: added Attendance and multi-player Game Ball answers for Head Coach",
      "FAQ: walk-up song and Spotify deep-link FAQs updated with Out Tonight filtering detail",
      "FAQ: new Scorekeeper category with 3 answers about Live Scoring",
      "FAQ: install banner and Google sign-in FAQs updated",
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "FAQ: added 3 head-coach items (attendance, game ball), 2 dj-parent items (updated walk-up song location, new Spotify deep-link FAQ), new scorekeeper category (3 items), updated install and account FAQs in setup-sharing",
      "PERSONAS.md: rewritten to 8 personas — added Dugout Parent, DJ Parent, Catcher Parent, Base Coach. Live Scoring and Admin Dashboard flipped to MVP. Auth Required updated to Phase 2.",
      "SOLUTION_DESIGN.md: rewrote Auth Architecture section end-to-end (Phase 3 → Phase 2, removed all [Twilio removed] inline tags, updated flow diagram, database tables, route inventory). Updated /health example (version 2.2.31, added db/db_latency_ms). Updated App.jsx line count to ~9,834, expanded utils/ and components/ trees, updated navigation table. Added Walk-up Songs Architecture subsection.",
    ],
  },
  {
    version: '2.2.30',
    date: 'April 2026',
    headline: "Absent players now clearly visible across all lineup views",
    userChanges: [
      "Players marked out tonight now show in the bench section with a red indicator on the diamond, defense grid, shared link, and PDF",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "renderFieldSVG (App.jsx): outPlayers computed from grid; SVG text rendered in red below bench slot",
      "DefenseDiamond.jsx: outNames computed alongside benchNames in SVG bench box; outByInning/outDisplay alongside benchByInning/benchDisplay; red Out rows added to bench strip table",
      "GameModeScreen.jsx: Out Tonight red strip inserted between diamond and batting footer",
      "renderGrid (App.jsx): Bench cell now renders Out players as red pills below bench pills",
      "SharedView table view (App.jsx): Out pill rendered as red #fee2e2/#dc2626 instead of grey position pill",
      "SharedView batting card (App.jsx): Out inning renders as 'OUT' in red in per-player position string",
      "SharedView bench table (App.jsx): outByInning/outDisplay computed; red Out rows added after bench rows",
      "PDF bench strip (App.jsx): Out Tonight header row + Out player rows added in red below bench",
      "PDF grid table (App.jsx): Out cell rendered as light-red pill with 'OUT' in red",
      "PDF batting card (App.jsx): Out inning shown as 'OUT'; positions row turns red/bold when any inning is Out",
    ],
  },
  {
    version: '2.2.29',
    date: 'April 2026',
    headline: "Fix: Claim Scorer now works — auth shim ID applied to scorer lock write",
    userChanges: [
      "Scoring tab now available for Mud Hens and Demo All-Stars",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "App.jsx line ~2780: _isAlwaysScoringTeam check (name === 'Mud Hens' || 'Demo All-Stars') short-circuits liveScoringEnabled before feature flag lookup",
      "useLiveScoring.js claimScorerLock: scorer_user_id/scorer_name changed from raw userId/userName (null when auth gate down) to _effectiveUserId/_effectiveUserName — fixes silent NOT NULL constraint violation",
      "useLiveScoring.js claimScorerLock: non-RLS errors now surface via claimError state (console.error + setClaimError) instead of being silently swallowed",
      "useLiveScoring.js: claimError state added; exposed in hook return + disabled-shell stub",
      "ScoringMode/index.jsx: claimError={scoring.claimError} threaded to LiveScoringPanel",
      "LiveScoringPanel.jsx: claimError red banner rendered below Claim Scorer Role button in STATE 1 (no active scorer)",
    ],
  },
  {
    version: '2.2.28',
    date: 'April 2026',
    headline: "Live scoring auth shim + Supabase team boot merge",
    userChanges: [
      "Teams added directly to the database now appear automatically on all devices",
      "Live scoring works without login during pre-auth testing phase",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Boot block (~line 2467): replaced local-wins merge with additive merge — localTeams kept as base, newFromDb appended only for IDs not already in localIds map; String() cast handles bigint/string ID comparison",
      "useLiveScoring.js: _effectiveUserId/_effectiveUserName shim — falls back to 'admin-coach-mud-hens'/'Coach (Admin)' when userId/userName null (Phase 4C cleanup documented in CLAUDE.md)",
      "ScoringMode/index.jsx: scoringUserId/scoringUserName fallback + isAdminTestMode; useFeatureFlag('live_scoring') + isEnabled = liveScoringEnabled || true testing override",
      "LiveScoringPanel.jsx: amber '⚠ Admin Test Mode — no auth' badge in scorer header when isAdminTestMode",
    ],
  },
  {
    version: '2.2.26',
    date: 'April 2026',
    headline: "V1→V2 skill bridge + game ball edit modal",
    userChanges: [
      "Player skills now influence auto-assign lineup generation",
      "Game Ball selection moved into Edit screen with player search",
      "Game Ball displays as read-only on schedule card",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "playerMapper.js: V1→V2 shim — skills[] → reliability/reaction/armStrength/speed; batSkills[] → contact/power/swingDiscipline",
      "Schedule card gameBall pill block replaced with display-only span (🏆 Game Ball label + joined names or —)",
      "Edit modal: gameBall search input + multiselect pills added after Snack Duty; gameBallSearch:'' added to all 3 newGame resets (initialiser, saveGame, Add Game button)",
    ],
  },
  {
    version: '2.2.25',
    date: 'April 2026',
    headline: "Multi-player game ball + My Team tab",
    userChanges: [
      "Game Ball award can now be given to multiple players",
      "Team tab renamed to My Team",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "gameBall migrated from string to array; normalizeGameBall() coerces legacy data on read",
      "PRIMARY_TABS: label:'Team' → label:'My Team' at line 9092",
    ],
  },
  {
    version: '2.2.24',
    date: 'April 2026',
    headline: "Game Day restructured — Lineups tab with shared attendance, Defense/Batting as sub-tabs",
    userChanges: [
      "Game Day now opens on Lineups tab by default",
      "Tonight's Attendance sits above both Defense and Batting — one place to manage who's playing",
      "Defense and Batting are sub-tabs inside Lineups",
      "Cleaner Game Day nav: Lineups · Songs · Game Mode all visible on portrait",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "renderLineups() wrapper extracts attendance panel from renderGrid(); lineupsSubTab state added; GAMEDAY_SUBTABS collapsed from 5 to 3 entries; all setGameDayTab('defense') deep links updated to 'lineups'",
      "absentTonight prop threaded App.jsx → GameModeScreen → QuickSwap; QuickSwap candidate list filters absent names before sort",
    ],
  },
  {
    version: '2.2.23',
    date: 'April 2026',
    headline: "Defense tab inning checks restored — absent players no longer cause false warnings",
    userChanges: [
      "Inning checkmarks now show correctly when absent players are marked Out Tonight",
      "Auto-assign no longer includes Out Tonight players (fixed for evening games)",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "validateGrid: skip 'Out' slots entirely — no missing/conflict/bench warnings for absent players",
      "todayDate: switched from UTC (toISOString) to local calendar date to fix attendance key mismatch during evening games in ET and other UTC- timezones",
    ],
  },
  {
    version: '2.2.22',
    date: 'April 2026',
    headline: "Hotfix — auth gate removed from prod, app accessible to all users",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Auth gate block (if !_authBypassed + all three authState branches) wrapped in /* */ block comment",
      "useAuth(), LoginScreen, RequestAccessScreen, PendingApprovalScreen imports untouched — preserved for Phase 4C",
    ],
  },
  {
    version: '2.2.21',
    date: 'April 2026',
    headline: "Absent players filtered out of batting order, PDF, share links, print, and songs view",
    userChanges: [
      "Absent players are automatically removed from the batting order on share links, PDF, and print",
      "Songs Game Day view only shows tonight\u2019s active players in batting order",
      "Shared lineups show a \u201cNot playing tonight\u201d note at the bottom",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "activeBattingOrder derived from battingOrder filtered by absentTonight — single source of truth",
      "shareCurrentLineup + shareViewerLink: batting \u2192 activeBattingOrder, roster filtered to exclude absent, absentNames field added to payload",
      "SharedView: player filter pills exclude payload.absentNames; absent note rendered in batting section footer",
      "renderSongs edit view: absent player cards grayed out (opacity 0.45, pointer-events none) with (Out Tonight) label",
      "renderSongs game day view: iterates activeBattingOrder for sequential numbering from active players only",
      "generatePDF: batting section uses activeBattingOrder; absent footnote appended if any absent",
      "renderPrint: batting grid uses activeBattingOrder; absent note rendered below grid",
      "NowBattingBar: receives activeBattingOrder; advance/back modulo against activeBattingOrder.length",
      "GameModeScreen: receives activeBattingOrder; batter advance/back modulo updated",
    ],
  },
  {
    version: '2.2.19',
    date: 'April 2026',
    headline: "Game Day Attendance — mark players out before generating your lineup",
    userChanges: [
      "Mark multiple players out before generating lineup",
      "Attendance syncs across all devices via cloud",
      "Auto-clears the next game day",
      "Sync button to pull latest from other devices",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "attendanceOverrides state: global localStorage key 'attendanceOverrides', per-team Supabase sync via team_data.attendance_overrides JSONB column (requires DB migration before Supabase sync activates)",
      "persistAttendance(): prunes entries older than 3 days, dual-writes localStorage + Supabase via dbSync/dbSaveTeamData — mirrors persistRoster pattern exactly",
      "toggleAbsentTonight(playerName): adds/removes player name in absentTonight array for today's ISO date key",
      "generateLineup(): builds rosterForGen with absentTonight players tagged 'absent' before passing to V1/V2 engine — does NOT modify player.tags",
      "autoFix() in renderGrid: same rosterForGen pattern applied",
      "useEffect: when absentTonight changes and grid exists, marks absent-tonight players 'Out' in all innings without full re-auto-assign",
      "Attendance panel in renderGrid: collapsible (auto-open if any absent), above auto-assign buttons; 2-col player grid with ✅ Playing / ❌ Out Tonight toggles; Sync button re-fetches from Supabase",
      "Guard: disable auto-assign + red banner when (roster.length - absentTonight.length) < 9",
      "supabase.js: attendance_overrides conditionally added to dbSaveTeamData upsert; returned in dbLoadTeamData",
    ],
  },
  {
    version: '2.2.18',
    date: 'April 2026',
    headline: "Schedule data reliability improvements",
    userChanges: [
      "Game ball, snack duty, and score reported fields now survive app restarts and team switches more reliably",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "MERGE_FIELDS extracted to single shared const (was duplicated at boot hydration and loadTeam hydration)",
      "Division migration block (App.jsx): saveJSON now saves mergeLocalScheduleFields result instead of raw seed — prevents gameBall/snackDuty/scoreReported being overwritten on migration run",
      "Boot hydration (App.jsx): replaced local-wins preference with mergeLocalScheduleFields merge — new Supabase games no longer silently dropped when local schedule is non-empty",
      "backend/src/routes/auth.js: loginLimiter created (15min window, max 5) and applied to POST /magic-link — express-rate-limit was imported but never instantiated",
    ],
  },
  {
    version: '2.2.17',
    date: 'April 2026',
    headline: "Legal policies updated",
    userChanges: [
      "Privacy policy, terms, and account info updated to reflect current sign-in method (email + Google)",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Legal content refresh: removed stale phone OTP references from Privacy Policy and Access & Accounts',
      'Access & Accounts: "invite-only beta" → "available to approved coaches"; auth description updated to email magic link + Google sign-in',
      'Report a Problem: removed phantom "email on the About page" reference — trimmed to Feedback tab only',
      'All 6 legal doc lastUpdated fields: March 2026 → April 2026',
      'LegalSection.jsx footer date: March 2026 → April 2026',
    ]
  },
  {
    version: '2.2.16',
    date: 'April 2026',
    headline: "Install prompt now fully tracked — see how coaches are installing the app",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Analytics: pwa_banner_shown event — fires on mount for Android (prompt_ready:true, browser from userAgentData) and iOS (prompt_ready:false, browser:"safari")',
      'Analytics: pwa_install_clicked — fires on Install button tap before native prompt is shown',
      'Analytics: pwa_install_accepted / pwa_install_declined — fires after userChoice resolves',
      'Analytics: pwa_installed — now includes platform:"ios"|"android" property',
      'Replaced old pwa_install_prompted event with pwa_banner_shown across all platforms',
    ]
  },
  {
    version: '2.2.15',
    date: 'April 2026',
    headline: "App install prompt now always visible on Android and iPhone",
    userChanges: [
      "Install prompt is now always visible at the bottom of every screen — no more missing it",
      "Android: tap Install to add Dugout Lineup to your home screen in one step",
      "iPhone: follow the on-screen prompt (Share → Add to Home Screen) — visible on every tab",
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Feat: persistent PWA install banner — fixed above bottom nav (position:fixed, zIndex:199), visible on all tabs, hidden only in game mode and when already installed (standalone)',
      'Android: shows Install button when beforeinstallprompt is ready; falls back to Chrome menu instructions if prompt not yet fired',
      'iOS: shows Share → Add to Home Screen instructions immediately on mount (no visited-once gate, no dismiss)',
      'Removed: handleDismissInstall, pwa_install_snoozed localStorage key, ios_install_dismissed localStorage key, showIOSInstallBanner state — merged into single showInstallBanner',
      'Removed: banner-surfacing code in pin-finalize handler and LockFlow onConfirmLock — banner is always on, no need to surface at specific moments',
      'Scroll body paddingBottom increases to 136px when banner visible (was 80px) to prevent content hiding behind banner',
      'Fix: overscroll-behavior: none added to html + body in index.css — prevents pull-to-refresh bounce on Android and rubber-band scroll on iOS',
    ]
  },
  {
    version: '2.2.14',
    date: 'April 2026',
    headline: 'Under-the-hood improvements',
    userChanges: [],
    techNote: 'Under-the-hood stability improvements',
    internalChanges: [
      'Implemented UTM tracking framework (trackingUrl.js) for all outbound links',
      'Auto-detects PWA vs web context via display-mode for utm_medium',
      'CAMPAIGNS + CONTENT registries for consistent attribution across surfaces',
      'Click-side outbound_click event captured before navigation — attribution not dependent on destination redirect behavior',
      'Migrated all 7 LINKS array entries to outboundLinkProps',
      'Added 17-test Vitest suite for trackingUrl utility',
      'vite.config.js updated to include co-located test files under src/**'
    ]
  },
  {
    version: '2.2.13',
    date: '2026-04-05',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: smoke test DEV_BACKEND_URL hardcoded to Render URL — was pulling from a missing GitHub secret',
      'Fix: ANTHROPIC_API_KEY used = instead of : in .env.smoke block in ci.yml'
    ]
  },
  {
    version: '2.2.12',
    date: '2026-04-04',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Ops: ci.yml backend job — wait-for-Render step added before integration test suite; 90s sleep + 5-attempt /ping poll (15s intervals) ensures backend is live after Render deploy',
      'Ops: dual-layer VERSION_HISTORY schema migration — all entries converted from changes[] to internalChanges[]; headline, userChanges, techNote fields added'
    ]
  },
  {
    version: '2.2.11',
    date: '2026-04-05',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: supabaseAdmin.rpc().catch() replaced with try/catch — Supabase builder does not expose .catch() directly; was silently swallowing the error before rosterWipeGuard could run'
    ]
  },
  {
    version: '2.2.10',
    date: '2026-04-05',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: TD-04 sends X-Admin-Key in CI via ADMIN_KEY secret — wipe guard now reachable from GitHub Actions',
      'Fix: TD-02, TD-03, TD-06, TD-07 also wired with X-Admin-Key header for correctness',
      'Fix: debug logging cleaned up in teamData POST catch block',
      'Docs: timing attack TODO documented on isAdminRequest() === comparison'
    ]
  },
  {
    version: '2.2.9',
    date: '2026-04-04',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: async try/catch on all teamData route handlers (POST /:teamId/data, GET /:teamId/history)',
      'Fix: global error handler respects err.status — 403s return correct status+code, 500s suppress message',
      'Fix: router.param 403 branch preserved — rejectTestDataInProd errors handled before next(err)'
    ]
  },
  {
    version: '2.2.8',
    date: '2026-04-04',
    headline: "App updates deliver faster and more reliably",
    userChanges: [
      "Version tracking is now automatic — no manual steps that could fall out of sync",
      "Share links and game view open with fewer loading delays"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      'Build: app_version auto-injected from package.json via vite.config.js define (__APP_VERSION__), VITE_APP_VERSION env var removed',
      'Fix: analytics.js SSR guard (window/navigator) for getDeviceContext and mixpanel.register'
    ]
  },
  {
    version: '2.2.7',
    date: '2026-04-04',
    headline: "More stable experience across all devices",
    userChanges: [
      "App loads more reliably on first open, especially on mobile",
      "Share links are more consistent for parents viewing on their phones"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      'Fix: smoke test table name corrected (roster_history → team_data_history); roster_snapshots added as second check',
      'Fix: Category 5 CI guard — skips frontend reachability check in GitHub Actions (process.env.CI === "true")',
      'Fix: Category 5 AbortController timeout — hard 8s abort, soft warn instead of fail on timeout',
      'Fix: analytics.js SSR window/navigator guard in getDeviceContext() and mixpanel.register()'
    ]
  },
  {
    version: '2.2.6',
    date: '2026-04-04',
    headline: "Smarter app — learns how coaches use it",
    userChanges: [
      "App now recognizes when it's been added to your home screen",
      "Performance improvements for coaches opening the app mid-game"
    ],
    techNote: "Under-the-hood stability improvements",
    internalChanges: [
      'Analytics: device context super properties (os, device_type, platform, is_pwa, screen_width, screen_height, app_version) — auto-attached to every Mixpanel event via mixpanel.register()',
      'Analytics: PWA install events — pwa_install_prompted + pwa_installed; is_pwa super property updated immediately on install',
      'Analytics: first launch detection — is_first_launch prop on app_opened; first_launch event on first-ever session',
      'Analytics: VITE_APP_VERSION wired via build-time env var — app_version super property now populated in production',
      'Docs: docs/analytics/ANALYTICS.md — full event reference, super properties, identity model, dashboard configs, deployment checklist'
    ]
  },
  {
    version: '2.2.5',
    date: '2026-04-04',
    headline: "The app is now smarter about what's working",
    userChanges: [
      "Dugout Lineup now tracks which features coaches use most so we can improve them",
      "Faster experience for teams with larger rosters"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      'Analytics: 15 new Mixpanel events — Game Mode instrumentation, QuickSwap tracking, share link viewed, Mixpanel identity on team load, auth funnel prep (login_requested/succeeded/failed, access_requested)',
      'Analytics: Vercel Analytics screen events (app_loaded, game_mode_entered, share_link_viewed, lineup_finalized)',
      'Analytics: extracted track() + mixpanel init to src/utils/analytics.js — shared across App.jsx, GameModeScreen, QuickSwap, BattingHandSelector, auth screens'
    ]
  },
  {
    version: '2.2.4',
    date: '2026-04-03',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Activated Mixpanel analytics — wired VITE_MIXPANEL_TOKEN env var, 14 existing track() call sites now live in production'
    ]
  },
  {
    version: '2.2.3',
    date: '2026-04-03',
    headline: "Your app now greets you by name",
    userChanges: [
      "Home screen shows a personalized greeting based on the actual time of day",
      "Greeting uses your first name instead of the generic 'Coach'",
      "Share links are more reliable — tested across more devices before every release"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      'Personalized greeting uses coach first name from user.profile; falls back to "Coach" for guests',
      'Fixed time bands: Good night 9pm–5am, Good morning now starts at 5am not midnight'
    ]
  },
  {
    version: '2.2.2',
    date: '2026-04-03',
    headline: "Greeting timing fixed",
    userChanges: [
      "Good night now shows after 9 PM — no more 'Good morning' at midnight"
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: new game form now initialises gameBall and scoreReported (were missing from template)',
      'Fix: non-active team boot hydration now runs migrateSchedule + mergeLocalScheduleFields before writing to localStorage',
      'Fix: Mud Hens migration patch now preserves snackDuty, gameBall, and scoreReported from existing games'
    ]
  },
  {
    version: '2.2.1',
    date: '2026-04-03',
    headline: "More stable when multiple coaches are active",
    userChanges: [
      "Coaches on the same team stay in sync more reliably during lineup edits"
    ],
    techNote: "Under-the-hood stability improvements",
    internalChanges: [
      'Ops: develop branch created with GitHub branch protection rules',
      'Ops: Render DEV service + dev.dugoutlineup.com environment planned',
      'Ops: backend envGuard middleware — TEST_TEAM_IDS blocks test data in production',
      'Ops: ci.yml triggers on both main and develop branches'
    ]
  },
  {
    version: '2.2.0',
    date: '2026-04-03',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Chore: test suite cleanup — removed 7 stale OTP tests, fixed VAL-07 XSS assertion, split RATE-01 into RATE-01a/RATE-01b',
      'Chore: suite-auth-middleware.js added (8 tests — all protected endpoints reject without token)',
      'Chore: scoring.test.js Group 1 parameterized (28 individual tests via forEach table)',
      'Chore: lineupEngineV2-unit.test.js added (30 tests — output shape, assignment, bench, batting order, edge cases)',
      'Chore: suite-idempotency.js refactored — upfront seed block, seedFailed guard, no inter-test dependencies',
      'Ops: ci.yml — frontend build step added before Vitest so compile errors block CI',
      'Ops: /health endpoint now checks DB connectivity (Supabase teams read); returns db:ok/error + db_latency_ms; 503 on DB failure',
      'Ops: health-check.yml — new 6h cron with three functional checks: /health db:ok, share link smoke, /generate-lineup response shape'
    ]
  },
  {
    version: '2.1.9',
    date: '2026-04-03',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: admin console magic link now redirects back to /admin.html after email click',
      'Fix: Add Result button invisible on game day (gameDate <= today)'
    ]
  },
  {
    version: '2.1.8',
    date: '2026-04-03',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Chore: full automated test suite — suite-team-data.js (7 tests), suite-feedback.js (6 tests), suite-contracts.js (7 tests)',
      'Chore: GitHub Actions ci.yml — push-to-main gate (Vitest + backend CI_SAFE integration tests)',
      'Chore: GitHub Actions health.yml — cron every other day 7am ET, checks /ping + frontend load'
    ]
  },
  {
    version: '2.1.7',
    date: '2026-04-03',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: admin approve route now writes email + user_id to team_memberships (phone_e164 set to null)',
      'Fix: admin members endpoint now returns email and user_id fields',
      'Fix: all four admin email notifications look up team name from DB — no more hardcoded team name'
    ]
  },
  {
    version: '2.1.6',
    date: '2026-04-02',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: Rules of Hooks violation — extracted renderSharedView into proper SharedView component',
      'Fix: non-active team card hydration — eager Supabase fetch on boot with warm localStorage skip and skeleton state while pending'
    ]
  },
  {
    version: '2.1.5',
    date: '2026-04-02',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Feat: Supabase-backed runtime feature flags — all flags now toggle from dashboard without a deploy',
      'Feat: maintenance mode screen — shown to all users during deploys',
      'Feat: coach bypass via ?coach_access=mudhen2026 to verify prod while maintenance is on',
      'Fix: GAME_MODE flag normalized to uppercase in Supabase, global default set to true',
      'Chore: replaced all legacy line-up-generator.vercel.app URLs with dugoutlineup.com — Open in Browser, Share App Now, CORS allowed origins, README, CLAUDE.md, feature-flags docs'
    ]
  },
  {
    version: '2.1.4',
    date: '2026-04-02',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      '154 frontend tests across 7 files — migration, scoring, formatters, flag bootstrap, bench equity',
      'Extracted migrations, formatters, and flagBootstrap utilities from App.jsx into testable modules'
    ]
  },
  {
    version: '2.1.3',
    date: '2026-04-02',
    headline: "Welcome to Dugout Lineup",
    userChanges: [
      "App officially renamed to Dugout Lineup — available at dugoutlineup.com",
      "App name, icon, and install prompt all reflect the new brand"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      'Rebrand: all customer-facing surfaces renamed from Lineup Generator to Dugout Lineup — PWA manifest, index.html, login/access screens, legal docs, admin UI, About tab, PDF header, share text, and install banner'
    ]
  },
  {
    version: '2.1.2',
    date: '2026-04-02',
    headline: "Sign in without a password",
    userChanges: [
      "Coaches can now request access and get approved by the team admin",
      "Login uses a one-tap magic link sent to your email — no password to remember",
      "Pending coaches see a clear status screen while waiting for approval"
    ],
    techNote: "Under-the-hood stability improvements",
    internalChanges: [
      'Fix: bottom nav now fixed to viewport — no longer scrolls away on mobile',
      'Fix: bottom nav and Now Batting bar hidden during Game Mode for full-screen clarity'
    ]
  },
  {
    version: '2.1.1',
    date: '2026-04-02',
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      'Fix: useBackendHealth — 2 retries before marking server down, slow threshold raised to 5s, 2s initial delay before first check'
    ]
  },
  {
    version: '2.1.0',
    date: '2026-04-01',
    headline: "Game Mode built for the dugout",
    userChanges: [
      "Full-screen Game Mode hides all menus so you can focus on the game",
      "Swap players on the fly with Quick Swap — one tap, no menus",
      "Defense and Batting views in the same screen"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      'Phase 4B: Email OTP authentication live',
      'Access request pipeline with admin notification emails',
      '1-tap approve/deny links in admin emails',
      'Approval confirmation email to users with pre-filled login link',
      'auth_events audit logging on all auth actions',
      'Device context capture (platform, browser, access mode, app version)',
      'Migrations 008-012: email support across all auth tables',
      'Backend test suite: 60 tests, 54 automated, 6 manual',
      'PORT env var fix, DEFAULT_TEAM_ID fix, debug log cleanup'
    ]
  },
  {
    version: "2.0.5",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: home screen team card — Complete Roster badge no longer truncated; removed whiteSpace:nowrap so text wraps within the grid-constrained column",
    ]
  },
  {
    version: "2.0.4",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: home screen team card — top row converted from flexbox to CSS grid (1fr auto auto) so Open button and ellipsis always get fixed width and Zone 1 (team info/badge) is strictly constrained; COMPLETE ROSTER and READY badges can no longer bleed into Open button on any screen size",
    ]
  },
  {
    version: "2.0.3",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: home screen team card — Open button no longer bleeds into status badge; top row uses flex-start alignment",
      "UX: renamed 'Game View Mode' → 'Game Mode' on Next Game CTA card for consistency across all screens",
    ]
  },
  {
    version: "2.0.2",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: home screen team card — Game Mode button moved to its own full-width row below the team info/Open/menu row; no longer overlaps READY badge on narrow screens (iPhone SE)",
    ]
  },
  {
    version: "2.0.1",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: home screen team card — Game Mode button no longer bleeds into READY badge; card zones aligned to top (flex-start) instead of center",
    ]
  },
  {
    version: "2.0.0",
    date: "March 31, 2026",
    headline: "Everything is faster and easier to find",
    userChanges: [
      "Bottom navigation redesigned: HOME, TEAM, GAME DAY, MORE",
      "Roster, Season, Snacks, and Schedule all under one TEAM tab",
      "App loads noticeably faster on first open"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      "Fix: mobile browser layout — app shell now uses 100svh (small viewport height) in browser mode so bottom nav is never clipped by Edge/Safari address bar",
      "Fix: bottom nav padding increased in mobile browser mode to prevent toolbar overlap",
      "Installed PWA behavior unchanged — continues to use 100dvh in standalone mode",
    ]
  },
  {
    version: "1.9.9",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Game Mode: baseball bat icon (GiBaseballBat) replaces ⚾ emoji for all batting indicators — BATTING tab, card label, and Start Batting button",
      "Game Mode: fielding icon is now sport-aware — baseball teams show a glove (GiBaseballGlove), softball teams show 🥎 — applies to DEFENSE tab, card label, Take the Field button, and What's Next modal",
      "Dependency: react-icons added for GiBaseballBat and GiBaseballGlove (game-icons set)",
      "Sport-aware icons extended app-wide: Game Ball label on Schedule tab and Needs Attention dashboard card now show ⚾ for baseball and 🥎 for softball",
    ]
  },
  {
    version: "1.9.8",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Parent View renamed to MyPlayer View throughout — toggle button moved from Defense-tab-only strip to persistent Game Day subtab bar header",
      "MyPlayer View button always visible on Game Day (all subtabs); '👁 MyPlayer' / '← Back' toggle; navy active state",
    ]
  },
  {
    version: "1.9.7",
    date: "March 31, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Accessibility Phase 2 (ACCESSIBILITY_V1): Now Batting dominant — 36px bold, gold border",
      "Batting queue 3-tier hierarchy: Now Batting 36px / On Deck 22px / In the Hole 17px",
      "Color-coded tiers: gold → light white → muted gray, distinct at arm's length",
      "NowBattingStrip: aria-live region announces batter change to screen readers",
      "InningModal batting preview: font hierarchy matches NowBattingStrip tiers",
      "Position abbreviation expansion: aria-label with full position name",
      "Home screen: Game Mode button visible on all Ready team cards (roster + schedule set) · shows when lineup generated; 'Generate a lineup to unlock' hint when not yet generated",
    ]
  },
  {
    version: "1.9.6",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Support tab: FAQ sub-tab — 6 role-based categories (Head Coach, Dugout Parent, DJ Parent, Catcher Parent, Base Coaches, Setup & Sharing) with accordion Q&A",
      "Game Mode: inning transition modal now dynamically shows batting order (finished defense) or field positions (finished batting) — gold/green themed",
      "Game Mode: half-completion gate — both DEFENSE and BATTING halves must be marked done before Next → unlocks; pill shows ✓ on each completed half",
      "Fix: graceful exit sheet when tapping Home tab or logo while on Team/Game Day — warns if lineup dirty, two actions: Keep Working or Go Home",
      "Fix: deleted teams no longer restored from Supabase on app reload — localStorage is authoritative when non-empty",
      "Fix: duplicate Demo All-Stars teams — Try Demo Team hidden when demo exists; guard opens existing instead of creating duplicate",
    ]
  },
  {
    version: "1.9.5",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Accessibility Phase 1: font floor 12–14px, touch targets ≥44px, contrast uplift in Game Mode overlays",
      "Reduced motion: respects prefers-reduced-motion OS setting globally",
      "Aria labels on Game Mode advance, pill toggle, and inning transition modal buttons",
      "Position abbreviation accessibility labels (Pitcher, Shortstop, etc.) on defensive positions list",
      "Feature flag: ACCESSIBILITY_V1 (localStorage override: flag_ACCESSIBILITY_V1=true)",
    ]
  },
  {
    version: "1.9.4",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Home screen — 'View/Update Lineup' button renamed to 'View Lineup'",
    ]
  },
  {
    version: "1.9.3",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Create Team form: labels darker and bolder, field text larger and near-black, borders more visible, placeholder updated to example text",
    ]
  },
  {
    version: "1.9.2",
    date: "March 30, 2026",
    headline: "Try the app before adding your team",
    userChanges: [
      "Demo team pre-loaded so you can explore every feature before setting up",
      "Game Mode available whenever you have a roster and schedule"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "Game Mode now available for any team with roster + schedule set (no longer requires an upcoming game on the schedule)",
      "Demo All-Stars: pre-seeded 12-player team with schedule — load from home screen to explore all features",
      "Create Team form: fields now use white background with dark text for readability",
    ]
  },
  {
    version: "1.9.1",
    date: "March 30, 2026",
    headline: "Smoother inning transitions in Game Mode",
    userChanges: [
      "Inning transition shows batting order or defensive positions based on which half is next",
      "Both halves must be completed before advancing — prevents accidental skips"
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Game Mode: bench players shown stacked in infield box; batting hand badge visible on bench cards; duplicate bench strip removed",
      "Now Batting / On Deck / In Hole strips: batting hand badge (L/R) shown inline next to player name",
      "Schedule tab: Snack Note field replaced with Game Ball player picker (⚾); also editable from Snacks tab",
      "Snacks tab: Note field removed; Game Ball row added per game",
      "Team tab Roster view: removed redundant player count bar (covered by dashboard)",
      "Fix: normalizeBattingHand import error on Add Player",
    ]
  },
  {
    version: "1.9.0",
    date: "March 30, 2026",
    headline: "Track batting hand for every player",
    userChanges: [
      "Each player can now have a batting hand set — Left, Right, or Switch",
      "Batting hand badge shows on lineup cards and in Game Mode"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "Batting Hand — optional player attribute; captured on roster, editable in player card, displayed in batting order and live game mode strips",
    ]
  },
  {
    version: "1.8.6",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: TEAM tab dashboard — stats row now shows emoji icons (👥 Players · 🏆 Record · 📅 Next Game) with dividers; Next Game always visible",
      "UX: Needs attention box — icon cards (⚾ missing positions · 🍎 snacks unassigned) replace plain bullet list",
    ]
  },
  {
    version: "1.8.5",
    date: "March 30, 2026",
    headline: "Game Mode always one tap away",
    userChanges: [
      "Game Mode now lives in the bottom nav bar",
      "Home screen shows a direct Game Mode button on game day"
    ],
    techNote: "Under-the-hood stability improvements",
    internalChanges: [
      "Home screen: 'View Lineup' renamed to 'View/Update Lineup' · Added 'Game View Mode' CTA (always visible when lineup is locked) — launches directly into Game Mode",
    ]
  },
  {
    version: "1.8.4",
    date: "March 30, 2026",
    headline: "Updates apply automatically",
    userChanges: [
      "App updates itself silently in the background",
      "No more clearing cache or reinstalling to get the latest version"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      "PWA: switched to autoUpdate service worker — new versions apply immediately, no manual update step",
    ]
  },
  {
    version: "1.8.3",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Support tab: Legal section — Privacy Policy, Terms of Use, Child Safety, Content Standards, Access & Accounts, Report a Problem",
    ]
  },
  {
    version: "1.8.2",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Game Mode enabled for all users — feature flag gate removed",
      "▶ Game Mode button now always visible on Game Day tab",
    ]
  },
  {
    version: "1.8.1",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Team dashboard — removed Add Player, Add Game, Snacks quick-action buttons"
    ]
  },
  {
    version: "1.8.0",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Nav restructure: Roster + Season tabs merged into single Team tab",
      "Team tab: dashboard header with player count, record, and next game",
      "Team tab subtabs: Roster | Schedule | Snacks",
      "Season renamed to Schedule throughout",
      "Quick actions: + Add Player, + Add Game, Snacks",
      "Status warnings: players missing position preferences, upcoming games without snack assignment"
    ]
  },
  {
    version: "1.7.4",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: 'More' tab renamed to 'Support'"
    ]
  },
  {
    version: "1.7.3",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Defense tab — removed redundant INN OK summary boxes at bottom of grid; inning completion already shown via ✓ in column headers"
    ]
  },
  {
    version: "1.7.2",
    date: "March 30, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: Fairness Check bench rule — now flags players benched MORE than once (was: flags players never benched)",
      "Fix: Fairness Check consecutive rule — now flags consecutive C (Catcher) only; consecutive P no longer penalized",
      "Feat: Fairness Check new rule — flags any player assigned Catcher more than once per game"
    ]
  },
  {
    version: "1.7.1",
    date: "March 29, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Platform: React Error Boundaries on all major sections — prevents white screen when a section crashes on game day",
      "Boundaries: Game Day (outer), Parent View, Now Batting, Lock Flow, Viewer Mode, Validation Banner, Fairness Check, Offline Status, Team List",
      "Fallback: inline amber card with tap-to-reset; shows 'try refreshing' if reset fails"
    ]
  },
  {
    version: "1.7.0",
    date: "March 29, 2026",
    headline: "Lineup review and lock flow redesigned",
    userChanges: [
      "New Review → Confirm → Lock flow gives you a final check before committing",
      "Post-lock Fairness Check shows playing time balance across the roster",
      "Read-only Parent View so families can see the lineup without edit access"
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: lineup engine under-roster guard — 7-player (sub-10) rosters now correctly warn instead of silently leaving positions unassigned",
      "Test: all 11 engine regression tests passing (first clean all-green run)",
      "Ops: /ping endpoint returns { status, timestamp }; /health returns uptime + version — both <100ms, no DB calls",
      "UX: backend health check hook (useBackendHealth) — polls /ping on mount + every 5 min; cold-start pill on home screen (amber 'warming up' / red 'unavailable'); inline share sheet warning when server slow/down"
    ]
  },
  {
    version: "1.6.9",
    date: "March 29, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Inning label above Now Batting strip — shows INNING N driven by active defense inning selection",
      "UX: Fairness Check card — post-finalization signal showing pass/fail for bench equity, position balance, and consecutive P/C checks",
      "UX: Offline Ready indicator — header pill shows 🟢 Offline Ready / 🟡 Offline Mode / 🔴 No Connection based on connectivity + cache state",
      "UX: Parent View Mode — Game Day toggle shows per-player card (batting position + inning-by-inning field assignments); player picker pill row"
    ]
  },
  {
    version: "1.6.8",
    date: "March 29, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Home screen — 'Missing Roster' badge replaced with actionable button ('Add Players →' or 'Complete Roster (N/10) →'); shown for teams with fewer than 10 players",
      "UX: Home screen — empty state guidance when no teams exist or search returns no results; + Create Team CTA in both states"
    ]
  },
  {
    version: "1.6.7",
    date: "March 29, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: Viewer Mode — read-only swipeable inning cards for parents/players (?s=…&view=true); feature-flagged OFF by default",
      "Feat: Feature flag system — featureFlags.js for global toggles; per-user localStorage override; URL param bootstrap (?enable_flag=<name> / ?disable_flag=<name>)",
      "Fix: Share as Link + Share Viewer Link both fall back to base64 URL encoding when Supabase is unavailable (local dev)",
      "UX: Team season batting totals (G/AB/H/AVG/R/RBI) mini-block at top of Season Batting Stats box",
      "UX: Suggest Order / 6/7 innings selector disabled and dimmed when lineup is finalized",
      "UX: Batting order Undo — snapshot captured before Suggest Order or first ▲▼ arrow move; cleared on Save/Finalize",
      "UX: Finalize CTA disabled until batting order is saved; hover tooltip + inline amber hint explain why",
      "Fix: Generate Lineup blocked on all surfaces when lineup is finalized — home screen shows ✓ View Lineup instead",
      "UX: Finalize Lineup — 3-step LockFlow confirmation (Review issues → Confirm game → PIN); replaces direct PIN modal trigger on all 3 Finalize buttons"
    ]
  },
  {
    version: "1.6.6",
    date: "March 29, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: Now Batting Bar — sticky strip above bottom nav on Game Day tab; 3-pill layout (Now Batting / On Deck / In Hole) with ‹ › nav buttons; index persisted to localStorage",
      "Feat: Player Filter Toggle — viewer (share link) mode; horizontal pill list highlights selected player across diamond, table, and batting order"
    ]
  },
  {
    version: "1.6.5",
    date: "March 28, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Lineup Finalized experience now consistent across all 4 Game Day subtabs",
      "UX: Lineups tab — ✓ Finalize button added to toolbar (was Defense-only)",
      "UX: Songs tab (Game Day) — Edit mode hidden when lineup is locked; read-only Game Day View enforced"
    ]
  },
  {
    version: "1.6.4",
    date: "March 27, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Defense tab: per-warning Accept/Ignore All with localStorage persistence keyed by game date",
      "Sub-tab buttons: standardized to label-width (flex:0 0 auto) — consistent across 2-tab and 4-tab bars",
      "Global layout: S.body maxWidth 600px centered + 480px inner content wrapper for all tabs",
      "Home: dark gradient background bug fixed — cream on all tabs, dark on More only",
      "Team cards: single flex row with 3 fixed zones — eliminates name wrap and CTA drift",
      "Hydration merge: snackDuty and snackNote now rescued from localStorage alongside scoreReported",
      "Supabase backfill: fires for all three merge fields, not just scoreReported"
    ]
  },
  {
    version: "1.6.3",
    date: "March 27, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Defense tab — inning column headers show a green ✓ indicator when all 10 field positions + bench are filled for that inning",
      "UX: Defense tab (By Player view) — position dropdown disables already-taken positions for that inning; Bench locks after 1 player assigned"
    ]
  },
  {
    version: "1.6.2",
    date: "March 27, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: Status badges now use 6px CSS colored circles instead of emoji dots (🟢🟡⚪)",
      "UX: Team card game alert date uses ▸ symbol instead of 📅 emoji",
      "UX: Per-card Generate Lineup button — removed ⚡ emoji prefix"
    ]
  },
  {
    version: "1.6.1",
    date: "March 27, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: scoreReported flag now preserved across Supabase hydration — no longer resets on team reopen",
      "UX: Home screen team card — 'Missing Schedule' badge replaces 'Add Schedule'; italic CTA hints for missing roster and schedule",
      "UX: Home screen — per-team ⚡ Generate Lineup button on every Ready team card with an upcoming game",
      "Fix: Generate Lineup CTA only shown for Ready teams (roster + schedule both present)"
    ]
  },
  {
    version: "1.6.0",
    date: "March 27, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: Short share links — 8-character Supabase-backed IDs (?s=xxxxxxxx) replace long URL-encoded payloads; mobile share sheet supported",
      "Feat: Quick Summary enhancements — sortable Player/R/AVG columns; Games (G) column; AVG color coding matches season stats table",
      "Feat: County score report checkbox — check 'I have reported the score to the County' per completed game; persisted to schedule state",
      "Feat: Home screen team search bar — appears at 3+ teams; filters by name, age group, or sport",
      "Feat: Create team — sport dropdown (Baseball/Softball) + age group dropdown (5U–12U); form fully resets on open/cancel/save",
      "Feat: Edit team — ··· menu on team card opens edit modal to update name, sport, and age group",
      "Fix: homeMode correctly resets to 'welcome' on all Home nav paths (Home tab click, logo click, delete team)",
      "Fix: stale schedule closure prevented from overwriting battingPerf on county checkbox toggle",
      "Fix: app-shell layout — replaced position:fixed bottom nav with flex column layout to fix scroll and keyboard push-up on iOS"
    ]
  },
  {
    version: "1.5.1",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: Quick Summary season totals now calculate correctly — was string-concatenating instead of summing (AB/H/R/RBI)",
      "Fix: parseInt applied to all batting stat accumulations in Quick Summary",
      "Fix: only completed games (result logged) counted toward season totals"
    ]
  },
  {
    version: "1.5.0",
    date: "March 27, 2026",
    headline: "Snack Duty lives in the app",
    userChanges: [
      "Snack Duty tab — assign families, track who's up, syncs across coaches",
      "Walkup songs per player visible in Game Mode",
      "Season batting stats sortable by name, runs, or average"
    ],
    techNote: "Minor fixes and internal improvements",
    internalChanges: [
      "Feat: Coach PIN protection — 4-digit PIN gates Finalize and Unlock; set/change/remove from Lineups tab; PIN persisted per team to localStorage + Supabase",
      "Feat: Locked roster read-only — all player cards collapse when lineup is finalized; expand toggle disabled; Add Player and Remove buttons hidden; attribute editing blocked",
      "Feat: Batting Save Order button — appears only after a manual drag reorder; amber \u25cf Unsaved changes indicator; \u2713 Saved confirmation fades after 2s; Suggest Order auto-clears dirty state",
      "Feat: Sortable season stats table — tap Player / R / AVG column headers to sort; \u2191 \u2193 \u2195 direction indicators; 0 AB players always sort to bottom on AVG sort",
      "UX: Home screen redesign — compact greeting header with date; gold Open button per team card; left-strip game alert (red = today, amber = tomorrow); dot-separated metadata row; roster hint on empty teams"
    ]
  },
  {
    version: "1.4.0",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "UX: primary tabs moved to fixed bottom nav bar (portrait) — standard iOS/Android pattern, gold active indicator, 4 primary tabs",
      "UX: Roster tab — Players and Songs sub-tabs; walk-up song management moved from Game Day to Roster \u2192 Songs",
      "UX: Game Day — Songs sub-tab replaced by Lineups (print/PDF view absorbed into Game Day as a sub-tab)",
      "UX: More tab — Updates sub-tab added; What\u2019s New version history moved there; sub-tabs reordered to About / Updates / Links / Feedback",
      "UX: About tab — coach-friendly app description at top; sections reordered (Description \u2192 App Info \u2192 How to Use)",
      "UX: About tab — version badge inline on heading; Open in Browser link added; raw URL removed; Getting Started CTA replaced with Share App Now",
      "UX: What\u2019s New — previous versions collapsed by default, current version auto-expanded",
      "UX: Songs tab — Game Day View is first in toggle and default landing; redundant Edit button removed",
      "UX: Lineups (Print) — Bench displays as X in defensive grid; position legend added below grid",
      "UX: Lineups (Print) — buttons renamed to Download as PDF / Share as Link / Share as PDF; Backup CTA removed; Grid/Diamond toggle moved to top row",
      "Fix: onboarding guide updated — correct tab references reflecting new 4-tab nav structure",
      "Fix: game day pill shows GAME DAY not TOMORROW — Math.round \u2192 Math.floor for day diff"
    ]
  },
  {
    version: "1.3.9",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: Open button on Home tab blocked by ··· context menu overlay — zIndex fix",
      "Fix: data persistence audit — migrateSchedule spread preserves future fields, snackDuty consolidated onto game objects, importTeamData now restores locked state",
      "UX: nav restructure — 5 primary tabs with nested sub-tabs (Game Day: Defense/Batting/Songs, Season: Schedule/Snacks, More: Feedback/Links/About)",
      "Fix: migrateBattingPerf — remaps old initial+lastName batting stat keys (e.g. 'A Hwang') to full player names on load",
      "Fix: roster players sorted alphabetically by firstName at render time in Roster tab, Snacks dropdown, and Schedule snack dropdown"
    ]
  },
  {
    version: "1.3.8",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: Snack Duty tab — per-game player assignment with dropdown and note field",
      "Feat: Today badge + gold border on game day card",
      "Feat: Past games de-emphasized, canceled games hidden",
      "Feat: Summary header showing assigned count and next upcoming assignment",
      "Feat: snackDuty persisted to localStorage, Supabase, export backup, and import restore",
      "Fix: game time display strips leading zero from hour (7:00 PM not 07:00 PM)",
      "Feat: snack duty bidirectional sync — assign from Schedule tab or Snacks tab with single shared state",
      "Feat: shared handleSnackAssign, handleSnackNote, handleSnackClear handlers used by both tabs"
    ]
  },
  {
    version: "1.3.7",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: snack duty field on game — add/edit in schedule form, shown on game card with 🍎",
      "Feat: walk-up song link field — URL per player, clickable in Game Day View, included in share text and PDF",
      "Feat: smart time printing — default times (0:00/0:10) suppressed in PDF and Game Day View; asterisk note added when applicable",
      "Feat: Songs tab opens in Game Day View by default",
      "Feat: sync warning banner in Game Day View — reminds coach to re-sync after batting order changes",
      "Feat: batting order note in all print views — on-screen print card and generated PDF",
      "Feat: team context menu (···) on home screen — backup and delete available for any team, not just active",
      "Feat: restore from backup file available on empty roster screen (no Supabase required)",
      "Fix: battingPerf migration merge now checks localStorage before Supabase — prevents empty Supabase {} overwriting local stats"
    ]
  },
  {
    version: "1.3.6",
    date: "March 26, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Feat: walkup songs — per-player field with title, artist, start/end time",
      "Feat: walkup song display on player card (hidden when empty)",
      "Feat: walkup song edit form in player profile editor",
      "Fix: migrateRoster now spreads all existing player fields before normalizing",
      "Fix: any future player fields are no longer silently dropped on app load, team switch, or Supabase hydration",
      "Fix: walkup song and all V2 attributes now survive full round-trip through migrateRoster"
    ]
  },
  {
    version: "1.3.5",
    date: "March 25, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: diamond view all-innings mode now shows all coach-configured innings (4, 5, or 6)",
      "Fix: removed Math.min(4) cap that was cutting display to 4 innings regardless of config",
      "Fix: position box height and SVG viewBox now scale dynamically with inning count"
    ]
  },
  {
    version: "1.3.4",
    date: "March 25, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fix: batting averages no longer show leading zero (.333 not 0.333)",
      "Fix: zero at-bats now shows --- instead of 0.000 or NaN",
      "Fix: counting stats (AB, H, R, RBI) always display as integers",
      "Shared fmtAvg and fmtStat helpers applied across all 6 display locations"
    ]
  },
  {
    version: "1.3.3",
    date: "March 25, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Roster protection: migration never overwrites existing roster data",
      "Auto-snapshot on every roster add, remove, and edit",
      "Snapshot on Supabase hydration at app load",
      "Recover UI: restore previous roster link appears when roster is empty",
      "Up to 5 snapshots shown in recovery modal with timestamp and player count",
      "Auto-prune: Supabase keeps last 10 snapshots per team"
    ]
  },
  {
    version: "1.3.2",
    date: "March 25, 2026",
    headline: "Your roster is protected — even if something goes wrong",
    userChanges: [
      "Roster is automatically backed up every time you make a change",
      "If the roster ever appears empty, a Restore option appears immediately"
    ],
    techNote: "Under-the-hood stability improvements",
    internalChanges: [
      "Navigation restructured: Roster/Defense/Batting/Schedule/Print in top row; Feedback/Links/About in second row",
      "Home screen: collapsible What's New section, dark-styled Links section",
      "Portrait header: dynamic team initial, home hint, explicit \u2190 Home button",
      "Quick Summary table: replaced Skills/Tags/Top Positions with season AB/H/R/RBI stats",
      "Add Player form: collapsible \u2014 hidden by default, expands on tap",
      "Fixed Supabase hydration race condition \u2014 loading indicator and Auto-Assign disabled until roster loads",
      "Fixed data-loss bug: empty roster no longer overwrites Supabase; persist helpers skip cloud sync during hydration"
    ]
  },
  {
    version: "1.3.1",
    date: "March 25, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Fixed V2 lineup engine: LC/RC positions now assign correctly (was silently falling back to V1 on every run)",
      "Batting order now updates automatically after every auto-assign using V2 skill scores"
    ]
  },
  {
    version: "1.3.0",
    date: "March 25, 2026",
    headline: "Smarter player profiles and lineup engine",
    userChanges: [
      "Player profiles now have dedicated sections for Fielding, Batting, Base Running, Effort, and Constraints",
      "Lineup engine uses actual skill scores to assign positions",
      "Skip Bench and Preferred/Avoid Positions all in one Constraints card"
    ],
    techNote: "Performance and reliability improvements",
    internalChanges: [
      "Player profile UI rebuilt with collapsible V2 sections (Fielding, Batting, Base Running, Effort, Lineup Constraints, Development Focus)",
      "New scoring engine drives lineup assignments using fielding reliability, reaction, arm strength, batting contact/power/discipline, and running speed",
      "Lineup Constraints card: Skip Bench flag, Out This Game, Preferred Positions and Avoid Positions all in one place",
      "Add Player form now uses separate First Name and Last Name fields",
      "Last Updated timestamp on each player card",
      "Auth system built in parallel (request access, OTP login, admin approval) — not yet gated",
      "Home screen now shows correct player count on first load"
    ]
  },
  {
    version: "1.2.1",
    date: "March 24, 2026",
    headline: "First release — your lineup, built in seconds",
    userChanges: [
      "Generate a fair, balanced lineup for up to 12 players in under 60 seconds",
      "Every player gets equal time across all field positions over the season",
      "Share a read-only link with parents — no account needed to view"
    ],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Added Sharon Springs Athletics link to Links tab (sharonspringsathletics.org)"
    ]
  },
  {
    version: "1.2.0",
    date: "March 24, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Redesigned diamond view: SVG field with green background, outfield arc, dirt infield, and realistic position coordinates",
      "Position boxes: dual-zone design with dark header band per position group and player name area below",
      "Single-inning mode: large player name (14px bold), inning badge, bench player pill at bottom-right",
      "All-innings mode: compact first names per inning slot, taller boxes — no numbered prefixes",
      "Dynamic viewBox: 680×640 single-inning / 680×680 all-innings",
      "First-name display enforced in all views including bench strips, print tab, and share link",
      "About tab: onboarding guide expanded by default, reordered above app info",
      "Vercel Analytics + Mixpanel event tracking added",
      "Schedule tab: computed batting average replaces BB column; stats legend added"
    ]
  },
  {
    version: "1.1.0",
    date: "March 24, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "Replaced CF with LC (Left Center) and RC (Right Center) in outfield",
      "Expanded field to 10 players — 1 bench slot per inning",
      "Schema v2 migration — auto-remaps saved CF assignments to LC",
      "Added first-time coach onboarding modal (5-step walkthrough)",
      "Added About tab with version history and onboarding guide",
      "Added Feedback tab with free-form feedback and bug reporting",
      "Fixed LC and RC position colors for visibility",
      "Moved product docs to docs/product/ in repository"
    ]
  },
  {
    version: "1.0.0",
    date: "March 24, 2026",
    headline: "Stability and performance update",
    userChanges: [],
    techNote: "Bug fixes and performance improvements",
    internalChanges: [
      "MVP launch — Dugout Lineup live on Vercel",
      "11-constraint auto-assign engine with retry fallback",
      "10-player defensive grid (P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF)",
      "Manual cell overrides with issue detection and Auto-Fix All",
      "Batting order with stats-driven Suggest Order",
      "Season stats tracking (AB, H, R, RBI, AVG with color coding)",
      "Schedule management with AI photo and text import",
      "Game result logging with per-player batting stats",
      "View-only share link (URL-encoded snapshot)",
      "PDF export via bundled jsPDF",
      "Print tab with Defense / Batting / Both toggle",
      "Supabase cloud sync with localStorage offline fallback",
      "PWA — installable on iOS and Android, offline-capable",
      "Export / Import JSON backup",
      "UptimeRobot keep-warm ping on Render backend"
    ]
  }
];