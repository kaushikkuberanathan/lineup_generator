// v2.1
import { useState, useMemo, useCallback, useEffect } from "react";
import { jsPDF } from "jspdf";
import { isSupabaseEnabled, dbSaveTeams, dbDeleteTeam,
         dbLoadTeams, dbLoadTeamData, dbSaveTeamData,
         dbSnapshotRoster, dbGetRosterSnapshots,
         dbSaveShareLink, dbLoadShareLink } from './supabase.js';
import { track, mixpanel, deviceContext } from '@/utils/analytics';
import { inject, track as vaTrack } from '@vercel/analytics';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { generateLineupV2 } from '@/utils/lineupEngineV2';
import { normalizeBattingHand } from '@/utils/playerUtils';
import { outboundLinkProps, CAMPAIGNS, CONTENT } from './utils/trackingUrl';
import { migrateRoster, migrateSchedule, migrateBattingPerf, mergeLocalScheduleFields } from '@/utils/migrations';
import { fmtAvg, fmtStat } from '@/utils/formatters';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ErrorBoundary } from './components/Shared/ErrorBoundary';
import { NowBattingBar } from './components/GameDay/NowBattingStrip';
import { LockFlow } from './components/GameDay/LockFlow';
import { FairnessCheck } from './components/GameDay/FairnessCheck';
import { ParentView } from './components/GameDay/ParentView';
import { ViewerMode } from './components/Viewer/ViewerMode';
import { EmptyState } from './components/Home/EmptyState';
import { ValidationBanner } from './components/Shared/ValidationBanner';
import { OfflineIndicator } from './components/Shared/OfflineIndicator';
import { MaintenanceScreen } from './components/Shared/MaintenanceScreen';
import { DefenseDiamond }  from './components/GameDay/DefenseDiamond';
import { GameModeScreen }  from './components/game-mode/GameModeScreen';
import { LegalSection }       from './components/Support/LegalSection';
import { FAQSection }         from './components/Support/FAQSection';
import { BattingHandSelector } from './components/BattingHandSelector';
import { PlayerHandBadge }     from './components/PlayerHandBadge';
import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/Auth/LoginScreen';
import { RequestAccessScreen } from './components/Auth/RequestAccessScreen';
import { PendingApprovalScreen } from './components/Auth/PendingApprovalScreen';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import ScoringMode from './components/ScoringMode/index.jsx';

// ============================================================
// HELPERS
// ============================================================

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

// ============================================================
// CONSTANTS
// ============================================================

var COUNTY_SCHEDULE_URL = "https://forsythcounty.kaizendemos.app/schedule/2026-youth-baseball-and-softball-mmt6617n";

var ALL_POSITIONS    = ["P","C","1B","2B","3B","SS","LF","LC","RC","RF","Bench"];
var FIELD_POSITIONS  = ["P","C","1B","2B","3B","SS","LF","LC","RC","RF"];
var INFIELD          = ["P","C","1B","2B","3B","SS"];
var OUTFIELD         = ["LF","LC","RC","RF"];

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#555555"
};

// Skill badges - fielding only
// ── FIELDING SKILLS (ability) ──────────────────────────────────────────────
// Each key must survive across saved rosters — do not rename existing keys.
// Adding new keys is safe; removing/renaming breaks saved data.
var SKILLS = {
  // Fielding Ability
  strongArm:      { label:"Strong Arm",       group:"Fielding",    color:"#27ae60", weights:{ P:18,SS:16,"3B":15,"2B":13,LC:12,RC:12,"1B":8,LF:7,RF:7,C:6 } },
  goodGlove:      { label:"Good Glove",       group:"Fielding",    color:"#27ae60", weights:{ SS:18,"2B":16,"3B":14,"1B":12,LC:10,RC:10,C:8,P:6,LF:5,RF:5 } },
  accurateThrower:{ label:"Accurate Throw",   group:"Fielding",    color:"#27ae60", weights:{ P:16,SS:14,"3B":13,"2B":11,LC:10,RC:10,"1B":6,LF:5,RF:5,C:8 } },
  quickRelease:   { label:"Quick Release",    group:"Fielding",    color:"#27ae60", weights:{ C:18,SS:14,"2B":13,"3B":10,P:12,"1B":7,LC:8,RC:8,LF:4,RF:4 } },
  naturalCatcher: { label:"Natural Catcher",  group:"Fielding",    color:"#7f8c8d", weights:{ C:22,"1B":10,"3B":6,SS:4,"2B":4,P:4,LF:2,LC:1,RC:1,RF:2 } },
  bigKid:         { label:"Big/Strong",       group:"Fielding",    color:"#7f8c8d", weights:{ "1B":20,C:14,"3B":12,LF:8,RF:8,"2B":5,SS:3,LC:4,RC:4,P:6 } },
  leftHanded:     { label:"Left Handed",      group:"Fielding",    color:"#7f8c8d", weights:{ "1B":22,LF:14,P:12,LC:10,RC:10,RF:10,"3B":2,"2B":1,SS:1,C:1 } },
  // Game IQ
  gameAware:      { label:"Knows Where to Throw", group:"Game IQ", color:"#27ae60", weights:{ P:20,SS:18,"2B":10,"3B":9,"1B":7,C:4,LC:3,RC:3,LF:1,RF:1 } },
  callsForBall:   { label:"Calls for Ball",   group:"Game IQ",     color:"#27ae60", weights:{ LC:18,RC:18,SS:14,"2B":12,"3B":10,P:10,C:6,"1B":4,LF:8,RF:8 } },
  backsUpPlays:   { label:"Backs Up Plays",   group:"Game IQ",     color:"#27ae60", weights:{ P:14,LC:13,RC:13,SS:12,"2B":10,"3B":8,"1B":6,C:4,LF:6,RF:6 } },
  // Effort and Behavior
  highEnergy:     { label:"High Energy",      group:"Effort",      color:"#27ae60", weights:{ P:14,SS:13,LC:13,RC:13,"2B":11,"3B":10,"1B":8,C:8,LF:5,RF:5 } },
  hustles:        { label:"Hustles Always",   group:"Effort",      color:"#27ae60", weights:{ LC:12,RC:12,SS:11,"2B":10,"3B":9,P:8,"1B":7,C:6,LF:7,RF:7 } },
  developing:     { label:"Developing",       group:"Effort",      color:"#d4a017", weights:{ LF:16,RF:16,C:14,LC:12,RC:12,"1B":6,"2B":3,"3B":3,SS:1,P:1 } },
  // Base Running
  fastRunner:     { label:"Fast Runner",      group:"Base Running",color:"#27ae60", weights:{ LC:20,RC:20,SS:16,"2B":14,LF:10,RF:10,P:8,"3B":7,"1B":5,C:2 } },
  smartOnBases:   { label:"Smart on Bases",   group:"Base Running",color:"#27ae60", weights:{ SS:12,LC:11,RC:11,"2B":10,"3B":8,P:8,"1B":6,LF:7,RF:7,C:4 } },
  // Legacy key preserved for backward compatibility with saved rosters
  needsRoutine:   { label:"Needs Routine (Legacy)", group:"Fielding", color:"#d4a017", weights:{ "1B":16,RF:14,LF:14,C:8,"3B":6,LC:6,RC:6,"2B":5,SS:3,P:2 } }
};

// ── COACH NOTES / BEHAVIOR TAGS ───────────────────────────────────────────
// Tags affect position scoring (mods) and bench selection (benchOnce).
// Grouped for display — group field used by the UI only.
var TAGS = {
  // Confidence
  confidentPlayer:      { label:"Confident",       group:"Confidence",   color:"#27ae60", mods:{ P:10,SS:7,C:9,"2B":3,"3B":4,"1B":2,LC:2,RC:2,LF:1,RF:1 } },
  fearfulOfBall:        { label:"Fearful of Ball",  group:"Confidence",   color:"#c8102e", mods:{ LF:10,RF:10,"1B":5,LC:-2,RC:-2,C:-14,P:-14,SS:-8,"2B":-6,"3B":-8 } },
  hesitates:            { label:"Hesitates",        group:"Confidence",   color:"#d4a017", mods:{ P:-10,SS:-8,C:-8,LC:-4,RC:-4,"2B":-4,"3B":-4,"1B":4,LF:6,RF:6 } },
  // Effort and Behavior (coach-observed)
  goodCoachability:     { label:"Coachable",        group:"Behavior",     color:"#27ae60", mods:{ P:4,SS:3,C:4,"2B":4,"3B":4,"1B":4,LC:3,RC:3,LF:3,RF:3 } },
  inconsistentAttention:{ label:"Needs Focus",      group:"Behavior",     color:"#d4a017", mods:{ RF:8,LF:8,"1B":5,P:-12,SS:-10,C:-8,LC:-4,RC:-4,"2B":-4,"3B":-4 } },
  // Physical / Throwing
  weakThrower:          { label:"Weak Thrower",     group:"Physical",     color:"#c8102e", mods:{ P:-16,SS:-12,"3B":-10,"2B":-6,"1B":5,LF:5,RF:5,LC:-2,RC:-2,C:-4 } },
  slowRunner:           { label:"Slow Runner",      group:"Physical",     color:"#d4a017", mods:{ "1B":8,C:5,LF:3,RF:3,LC:-8,RC:-8,SS:-5,"2B":-3,"3B":-2,P:-1 } },
  // Base Running coaching
  needsBaseCoaching:    { label:"Needs Base Coaching", group:"Base Running", color:"#d4a017", mods:{ SS:-2,"2B":-2,LC:-2,RC:-2,P:-2,"3B":-1,"1B":4,LF:3,RF:3,C:2 } },
  // Lineup control
  benchOnce:            { label:"Bench Once Only",  group:"Lineup",       color:"#f5c842", mods:{} },
  absent:               { label:"Out This Game",     group:"Lineup",       color:"#c8102e", mods:{} }
};

// Batting skills
var BAT_SKILLS = {
  contactHitter:  { label:"Contact",    color:"#2471a3", bonus:3 },
  powerHitter:    { label:"Power",      color:"#27ae60", bonus:4 },
  patientEye:     { label:"Patient",    color:"#27ae60", bonus:5 },
  fastBaseRunner: { label:"Fast",       color:"#27ae60", bonus:5 },
  clutch:         { label:"Clutch",     color:"#2471a3", bonus:2 },
  freeSwinger:    { label:"Free Swing", color:"#c8102e", bonus:-3 },
  slowBat:        { label:"Slow Bat",   color:"#d4a017", bonus:-2 },
  nervous:        { label:"Nervous",    color:"#d4a017", bonus:-2 }
};

var DISLIKE_PENALTY = -50;

// Default roster
var DEFAULT_ROSTER = [];

// ============================================================
// STORAGE - localStorage with in-memory fallback
// ============================================================

// Storage: localStorage with in-memory fallback
var _mem = {};
var SCHEMA_VERSION = 2;

// DEPLOY: set MAINTENANCE_MODE=true in Supabase flags before pushing,
// set back to false after verifying prod.
var APP_VERSION = "2.2.43";

var VERSION_HISTORY = [
  {
    version: '2.2.43',
    date: 'April 2026',
    headline: "Scoring fixes — layout, empty state, restore UUID",
    userChanges: [
      "Scoring screen layout improved — no more dead space",
      "Clearer message when no batting order is set",
      "Restore Scorebook no longer errors",
    ],
    techNote: "Explicit flex spacer between diamond and pitch buttons replaces marginTop:auto; RestoreScoreModal passes null for local-xxx IDs to satisfy Postgres uuid type; improved no-batting-order empty state",
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
    techNote: "ScoringMode now receives activeBattingOrder instead of battingOrder; diamond section flexShrink:0 removes dead space; pitch buttons marginTop:auto pins to bottom",
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
    techNote: "LiveScoringPanel outer container changed to height:100vh + overflow:hidden; diamond section set to flex:1 to absorb slack; pitch button bar pinned at bottom with 72px nav clearance",
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
    techNote: "Ledger-only release. No app code or runtime changes. Prerequisite for v2.2.40 FEATURE_MAP.md restructure and v2.2.41 Backlog Adjacency System.",
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
    techNote: "Meta-governance release.",
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
    techNote: "scoringUserId falls back to a stable localStorage-persisted local ID (local-XXXX) when no auth session exists; never null; isAdminTestMode permanently false; 4 null guards removed from useLiveScoring.js",
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
    techNote: "Meta-governance release.",
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
    techNote: "attendance.test.js: Group 9 (share payload construction, 10 tests) and Group 10 (out-per-inning grid detection, 7 tests). Total suite: 306/1/0.",
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
    techNote: "scoringUserId now falls back to session.user.id instead of hardcoded admin-coach-mud-hens string; null guards added to all 4 Supabase write sites in useLiveScoring.js",
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
    techNote: "Meta-governance release. No app code changes.",
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
    techNote: "Documentation-only release. No code changes.",
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
    techNote: "claimScorerLock upsert was using raw userId (null) instead of _effectiveUserId ('admin-coach-mud-hens') — violated NOT NULL constraint, silently swallowed. Fixed to use shim identity. Added claimError state to surface non-RLS write failures to UI. Both fixes scoped to testing shim path — will be superseded by Phase 4C auth cutover.",
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
    techNote: "Boot merge changed from local-wins-entirely to additive: Supabase teams whose ID is not in localStorage are appended and persisted. Live scoring: admin fallback identity in useLiveScoring + ScoringMode when user is null; amber badge in scorer header flags test mode.",
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
    techNote: "playerMapper.js shims V1 skills/batSkills arrays to V2 enum fields; gameBall edit removed from inline card, added to newGame modal with search filter and multiselect",
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
    techNote: "gameBall migrated from string to array; normalizeGameBall() coerces legacy data on read",
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
    techNote: "Auth gate re-commented out — was inadvertently active in prod blocking all unauthenticated users. useAuth hook and all auth components remain in place for Phase 4C cutover.",
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
    techNote: "attendanceOverrides stored in Supabase team_data JSON; dual-write localStorage + Supabase mirrors persistRoster pattern; Supabase write non-fatal",
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
    techNote: 'Internal improvements to keep the app running smoothly.',
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
    techNote: "Bug fixes and internal improvements",
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
    techNote: "Major internal restructure and performance improvements",
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
    techNote: "Initial release",
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

function loadJSON(key, def) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) { return JSON.parse(raw); }
  } catch (e) {
    try { var mv = _mem[key]; if (mv) { return JSON.parse(mv); } } catch (e2) {}
  }
  return def;
}

function saveJSON(key, val) {
  var str = JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch (e) { _mem[key] = str; }
}

function removeJSON(key) {
  try { localStorage.removeItem(key); } catch (e) { delete _mem[key]; }
}

// Schema migration: run on every load, safe to call repeatedly
function migrateTeamData(data, key) {
  if (!data || typeof data !== "object") { return data; }
  var version = data.schemaVersion || 0;
  // v0 -> v1: add schemaVersion field to all team sub-objects
  if (version < 1) {
    data = Object.assign({}, data, { schemaVersion: 1 });
    saveJSON(key, data);
  }
  return data;
}

// migrateRoster, migrateSchedule, migrateBattingPerf — imported from @/utils/migrations

function migrateGrid(grid, roster, innings) {
  if (!grid || typeof grid !== "object") { return initGrid(roster, innings); }
  // Remap CF → LC for any grid data saved before the 10-player update
  for (var pname in grid) {
    var playerInnings = grid[pname];
    if (!Array.isArray(playerInnings)) continue;
    for (var idx = 0; idx < playerInnings.length; idx++) {
      if (playerInnings[idx] === "CF") {
        playerInnings[idx] = "LC";
      }
    }
  }
  // Ensure all current roster players have rows, prune removed players
  var ng = {};
  var players = roster.map(function(r) { return r.name; });
  for (var pi = 0; pi < players.length; pi++) {
    var pname = players[pi];
    var existing = grid[pname] || [];
    var row = [];
    for (var i = 0; i < innings; i++) { row.push(existing[i] || ""); }
    ng[pname] = row;
  }
  return ng;
}


// ============================================================
// MUD HENS 2026 SEASON SCHEDULE
// ============================================================

var MUD_HENS_SCHEDULE = [
  { id:"g1",  date:"2026-03-17", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"X", ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g2",  date:"2026-03-19", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"W", ourScore:"14", theirScore:"11", battingPerf:{ "A Hwang":{ ab:5, h:4, r:2, rbi:1, bb:0 }, "J Hershiser":{ ab:5, h:4, r:2, rbi:2, bb:0 }, "E Hastings":{ ab:4, h:3, r:1, rbi:2, bb:0 }, "L Hamilton":{ ab:4, h:3, r:1, rbi:2, bb:0 }, "M Mabrey":{ ab:4, h:3, r:2, rbi:1, bb:0 }, "E Kaushik":{ ab:5, h:3, r:1, rbi:0, bb:0 }, "C Arias":{ ab:3, h:2, r:1, rbi:2, bb:0 }, "C MacPhaul":{ ab:4, h:2, r:1, rbi:1, bb:0 }, "L Noland":{ ab:4, h:2, r:1, rbi:1, bb:0 }, "R Verma":{ ab:5, h:2, r:1, rbi:1, bb:0 }, "B Bieber":{ ab:5, h:2, r:1, rbi:0, bb:0 } } },
  { id:"g3",  date:"2026-03-26", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g4",  date:"2026-03-31", time:"7:30 PM",  location:"FP 4", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g5",  date:"2026-04-02", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g6",  date:"2026-04-15", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g7",  date:"2026-04-18", time:"1:00 PM",  location:"FP 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g8",  date:"2026-04-23", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g9",  date:"2026-04-25", time:"11:30 AM", location:"FP 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g10", date:"2026-05-04", time:"6:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"g11", date:"2026-05-06", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var BANANAS_8U_SCHEDULE = [
  { id:"ba-g1",  date:"2026-03-19", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g2",  date:"2026-03-26", time:"7:30 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g3",  date:"2026-03-31", time:"7:30 PM",  location:"FP 4", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g4",  date:"2026-04-02", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g5",  date:"2026-04-15", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g6",  date:"2026-04-18", time:"11:30 AM", location:"FP 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g7",  date:"2026-04-23", time:"7:00 PM",  location:"JV 3", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g8",  date:"2026-04-25", time:"10:00 AM", location:"FP 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g9",  date:"2026-05-04", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ba-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var BLUE_WAHOOS_8U_SCHEDULE = [
  { id:"bw-g1",  date:"2026-03-19", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g2",  date:"2026-03-26", time:"7:00 PM",  location:"JV 3", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g3",  date:"2026-03-31", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g4",  date:"2026-04-02", time:"7:00 PM",  location:"JV 3", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g5",  date:"2026-04-15", time:"7:00 PM",  location:"JV 3", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g6",  date:"2026-04-18", time:"1:00 PM",  location:"FP 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g7",  date:"2026-04-23", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g8",  date:"2026-04-25", time:"1:00 PM",  location:"FP 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 3", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"bw-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 3", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var FIREFIGHTERS_8U_SCHEDULE = [
  { id:"fi-g1",  date:"2026-03-19", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"L", ourScore:"11", theirScore:"14", battingPerf:{} },
  { id:"fi-g2",  date:"2026-03-26", time:"7:30 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g3",  date:"2026-03-31", time:"6:00 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g4",  date:"2026-04-02", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g5",  date:"2026-04-15", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g6",  date:"2026-04-18", time:"10:00 AM", location:"FP 2", opponent:"Timber Rattlers", home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g7",  date:"2026-04-23", time:"6:00 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g8",  date:"2026-04-25", time:"10:00 AM", location:"FP 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"fi-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var PARTY_ANIMALS_8U_SCHEDULE = [
  { id:"pa-g1",  date:"2026-03-19", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:false, result:"W", ourScore:"14", theirScore:"7",  battingPerf:{} },
  { id:"pa-g2",  date:"2026-03-26", time:"7:00 PM",  location:"JV 3", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g3",  date:"2026-03-31", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g4",  date:"2026-04-02", time:"7:30 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g5",  date:"2026-04-15", time:"7:30 PM",  location:"JV 2", opponent:"Timber Rattlers", home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g6",  date:"2026-04-18", time:"11:30 AM", location:"FP 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g7",  date:"2026-04-23", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g8",  date:"2026-04-25", time:"1:00 PM",  location:"FP 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g9",  date:"2026-05-04", time:"7:30 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"pa-g10", date:"2026-05-06", time:"7:30 PM",  location:"JV 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

var TIMBER_RATTLERS_8U_SCHEDULE = [
  { id:"ti-g1",  date:"2026-03-19", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:true,  result:"L", ourScore:"7",  theirScore:"14", battingPerf:{} },
  { id:"ti-g2",  date:"2026-03-26", time:"6:00 PM",  location:"JV 2", opponent:"Mud Hens",        home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g3",  date:"2026-03-31", time:"7:30 PM",  location:"JV 2", opponent:"Blue Wahoos",     home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g4",  date:"2026-04-02", time:"6:00 PM",  location:"JV 2", opponent:"Bananas",         home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g5",  date:"2026-04-15", time:"7:30 PM",  location:"JV 2", opponent:"Party Animals",   home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g6",  date:"2026-04-18", time:"10:00 AM", location:"FP 2", opponent:"Firefighters",    home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g7",  date:"2026-04-23", time:"7:30 PM",  location:"JV 2", opponent:"Blue Wahoos",     home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g8",  date:"2026-04-25", time:"11:30 AM", location:"FP 2", opponent:"Mud Hens",        home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g9",  date:"2026-05-04", time:"6:00 PM",  location:"JV 2", opponent:"Firefighters",    home:false, result:"",  ourScore:"",   theirScore:"",   battingPerf:{} },
  { id:"ti-g10", date:"2026-05-06", time:"6:00 PM",  location:"JV 2", opponent:"Bananas",         home:true,  result:"",  ourScore:"",   theirScore:"",   battingPerf:{} }
];

// ============================================================
// SCORING ENGINE
// ============================================================

function scorePosition(playerName, pos, inning, grid, roster) {
  var info = null;
  for (var ri = 0; ri < roster.length; ri++) {
    if (roster[ri].name === playerName) { info = roster[ri]; break; }
  }
  if (!info) { return 0; }

  // Layer 1 - outfield hard block
  if (OUTFIELD.indexOf(pos) >= 0) {
    var ofCount = 0;
    var pGrid = grid[playerName] || [];
    for (var gi = 0; gi < pGrid.length; gi++) {
      if (pGrid[gi] === pos) { ofCount++; }
    }
    if (ofCount > 0) { return -999; }
  }

  var score = 0;

  // Layer 2 - skill weights (averaged)
  var playerSkills = info.skills || [];
  if (playerSkills.length > 0) {
    var totalWeight = 0;
    for (var si = 0; si < playerSkills.length; si++) {
      var sk = SKILLS[playerSkills[si]];
      if (sk && sk.weights && sk.weights[pos] !== undefined) {
        totalWeight += sk.weights[pos];
      }
    }
    score += totalWeight / playerSkills.length;
  }

  // Layer 3 - preferred positions (ranked, graduated bonus)
  // 1st pref: +30, 2nd: +24, 3rd: +18, 4th: +12, 5th+: +8
  // Each rank still meaningfully higher than the next, never zero.
  var prefs = info.prefs || [];
  var prefBonuses = [30, 24, 18, 12, 8];
  for (var prefi = 0; prefi < prefs.length; prefi++) {
    if (prefs[prefi] === pos) {
      score += prefBonuses[prefi] !== undefined ? prefBonuses[prefi] : 8;
      break;
    }
  }

  // Layer 4 - coach tags
  var playerTags = info.tags || [];
  for (var ti = 0; ti < playerTags.length; ti++) {
    var tag = TAGS[playerTags[ti]];
    if (tag && tag.mods && tag.mods[pos] !== undefined) {
      score += tag.mods[pos];
    }
  }

  // Layer 5 - dislikes
  var dislikes = info.dislikes || [];
  if (dislikes.indexOf(pos) >= 0) { score += DISLIKE_PENALTY; }

  // Layer 6 - consecutive innings hard block (max 1 inning at same infield position in a row)
  var pGrid2 = grid[playerName] || [];
  if (INFIELD.indexOf(pos) >= 0 && inning >= 1) {
    if (pGrid2[inning - 1] === pos) {
      return -998; // hard block: already played this infield position last inning
    }
  }

  // Layer 7 - spread penalty (stronger: -10 per prior inning to prevent monopoly)
  var priorCount = 0;
  for (var pi = 0; pi < inning; pi++) {
    if (pGrid2[pi] === pos) { priorCount++; }
  }
  score -= priorCount * 10;

  // Layer 8 - bench equity bonus
  var benchCount = 0;
  for (var bi = 0; bi < inning; bi++) {
    if (pGrid2[bi] === "Bench") { benchCount++; }
  }
  score += benchCount * 4;

  return score;
}

function autoAssign(roster, innings) {
  var players = roster.map(function(r) { return r.name; });
  var n = players.length;
  var grid = {};
  for (var pi = 0; pi < players.length; pi++) {
    grid[players[pi]] = [];
    for (var ii = 0; ii < innings; ii++) { grid[players[pi]].push(""); }
  }

  var infieldOrder = ["P","SS","C","1B","2B","3B"];
  var ofOrder      = ["LC","RC","LF","RF"];

  function hasPlayedPos(pName, pos) {
    var pg = grid[pName] || [];
    for (var i = 0; i < pg.length; i++) { if (pg[i] === pos) { return true; } }
    return false;
  }

  function totalOFCount(pName) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < pg.length; i++) {
      if (OUTFIELD.indexOf(pg[i]) >= 0) { cnt++; }
    }
    return cnt;
  }

  function benchCount(pName, upToInning) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < upToInning; i++) { if (pg[i] === "Bench") { cnt++; } }
    return cnt;
  }

  // Identify absent players (tagged "absent") — they sit Out every inning
  var absentSet = {};
  for (var absi = 0; absi < roster.length; absi++) {
    if ((roster[absi].tags || []).indexOf("absent") >= 0) {
      absentSet[roster[absi].name] = true;
    }
  }
  var activePlayers = players.filter(function(p) { return !absentSet[p]; });
  var activeN = activePlayers.length;

  for (var inning = 0; inning < innings; inning++) {
    // Mark absent players Out for this inning
    for (var abni = 0; abni < players.length; abni++) {
      if (absentSet[players[abni]]) { grid[players[abni]][inning] = "Out"; }
    }

    // benchSlots = active players beyond 9
    var benchSlots = activeN - 10;
    if (benchSlots < 0) { benchSlots = 0; }

    // Players who were benched last inning must play this inning
    var mustPlay = [];
    if (inning > 0) {
      for (var mp = 0; mp < activePlayers.length; mp++) {
        if (grid[activePlayers[mp]][inning - 1] === "Bench") { mustPlay.push(activePlayers[mp]); }
      }
    }

    // Select bench players.
    // Players with the "benchOnce" tag may only be benched once per game.
    // They are excluded from candidacy after their first bench inning.
    // Fallback: if not enough non-protected candidates, allow protected players
    // to sit again (unavoidable with very small rosters).
    function hasBenchOnce(pName) {
      for (var ri = 0; ri < roster.length; ri++) {
        if (roster[ri].name === pName) {
          return (roster[ri].tags || []).indexOf("benchOnce") >= 0;
        }
      }
      return false;
    }
    var benchCandidates = [];
    for (var bp = 0; bp < activePlayers.length; bp++) {
      var pn = activePlayers[bp];
      if (mustPlay.indexOf(pn) >= 0) { continue; }
      var bc = benchCount(pn, inning);
      var protected_ = hasBenchOnce(pn);
      // Skip protected players who have already sat once
      if (protected_ && bc >= 1) { continue; }
      benchCandidates.push({ name: pn, bc: bc, protected_: protected_ });
    }
    // Sort: unprotected first (they take bench first), then by fewest bench innings
    benchCandidates.sort(function(a, b) {
      if (a.protected_ !== b.protected_) { return a.protected_ ? 1 : -1; }
      return a.bc - b.bc;
    });
    // Fallback: if still not enough candidates, include protected players who have sat
    if (benchCandidates.length < benchSlots) {
      var fallback = [];
      for (var fbp = 0; fbp < activePlayers.length; fbp++) {
        var fpn = activePlayers[fbp];
        if (mustPlay.indexOf(fpn) >= 0) { continue; }
        var alreadyIn = false;
        for (var fbi = 0; fbi < benchCandidates.length; fbi++) {
          if (benchCandidates[fbi].name === fpn) { alreadyIn = true; break; }
        }
        if (!alreadyIn) { fallback.push({ name: fpn, bc: benchCount(fpn, inning), protected_: true }); }
      }
      fallback.sort(function(a, b) { return a.bc - b.bc; });
      benchCandidates = benchCandidates.concat(fallback);
    }
    var benched = [];
    for (var bsi = 0; bsi < benchSlots; bsi++) {
      if (benchCandidates[bsi]) { benched.push(benchCandidates[bsi].name); }
    }
    for (var bni = 0; bni < benched.length; bni++) {
      grid[benched[bni]][inning] = "Bench";
    }

    var available = [];
    for (var ai = 0; ai < activePlayers.length; ai++) {
      if (benched.indexOf(activePlayers[ai]) < 0) { available.push(activePlayers[ai]); }
    }

    // Fill outfield FIRST using rotation to prevent repeats
    // Priority: hasn't played this OF position > fewest total OF appearances > bench equity
    for (var ofi = 0; ofi < ofOrder.length; ofi++) {
      var ofPos = ofOrder[ofi];
      if (available.length === 0) { break; }
      var ofRanked = [];
      for (var ori = 0; ori < available.length; ori++) {
        var pName = available[ori];
        var alreadyPlayed = hasPlayedPos(pName, ofPos) ? 1 : 0;
        var totalOF = totalOFCount(pName);
        var bc = benchCount(pName, inning);
        ofRanked.push({ name: pName, score: -alreadyPlayed * 1000 - totalOF * 10 + bc });
      }
      ofRanked.sort(function(a, b) { return b.score - a.score; });
      var ofWinner = ofRanked[0].name;
      grid[ofWinner][inning] = ofPos;
      var owIdx = available.indexOf(ofWinner);
      if (owIdx >= 0) { available.splice(owIdx, 1); }
    }

    // Fill infield using skill-based scoring
    // Sort infield positions by most-constrained-first:
    // positions with fewest non-blocked candidates get filled before
    // positions with many options, preventing last-position deadlocks.
    var ifPositionsToFill = infieldOrder.slice();
    while (ifPositionsToFill.length > 0 && available.length > 0) {
      // Score each remaining position by number of valid (non-blocked) candidates
      var ifConstraint = [];
      for (var ifci = 0; ifci < ifPositionsToFill.length; ifci++) {
        var ifc = ifPositionsToFill[ifci];
        var validCount = 0;
        for (var ifvi = 0; ifvi < available.length; ifvi++) {
          if (scorePosition(available[ifvi], ifc, inning, grid, roster) > -998) { validCount++; }
        }
        ifConstraint.push({ pos: ifc, validCount: validCount });
      }
      // Fill most constrained position first (fewest valid candidates)
      ifConstraint.sort(function(a, b) { return a.validCount - b.validCount; });
      var ifPos = ifConstraint[0].pos;
      ifPositionsToFill.splice(ifPositionsToFill.indexOf(ifPos), 1);
      var ifRanked = [];
      for (var ifri = 0; ifri < available.length; ifri++) {
        ifRanked.push({ name: available[ifri], score: scorePosition(available[ifri], ifPos, inning, grid, roster) });
      }
      ifRanked.sort(function(a, b) { return b.score - a.score; });
      // If all candidates are blocked, pick the one who played this position least recently
      if (ifRanked[0].score <= -998) {
        ifRanked.sort(function(a, b) {
          var pgA = grid[a.name] || []; var pgB = grid[b.name] || [];
          var lastA = -1; var lastB = -1;
          for (var li = inning - 1; li >= 0; li--) {
            if (pgA[li] === ifPos && lastA < 0) { lastA = li; }
            if (pgB[li] === ifPos && lastB < 0) { lastB = li; }
          }
          return lastA - lastB;
        });
      }
      var ifWinner = ifRanked[0].name;
      grid[ifWinner][inning] = ifPos;
      var iwIdx = available.indexOf(ifWinner);
      if (iwIdx >= 0) { available.splice(iwIdx, 1); }
    }

    // Any remaining overflow players go to Bench
    for (var ovi = 0; ovi < available.length; ovi++) {
      grid[available[ovi]][inning] = "Bench";
    }
  }

  return grid;
}


// ─────────────────────────────────────────────────────────────────
// autoAssign        — primary heuristic (most-constrained-first)
// autoAssignWithRetryFallback — production entry point with observability
//
// Output contract:
//   grid        {Record<playerName, string[]>}  — complete defensive grid
//   warnings    {Warning[]}                     — remaining constraint violations ([] = clean)
//   attempts    {number}                        — how many runs were needed (1 = clean first try)
//   usedFallback {boolean}                      — true if retry loop fired
//   isValid     {boolean}                       — true iff warnings.length === 0
//   explain     {string}                        — human-readable status for debugging
// ─────────────────────────────────────────────────────────────────
function autoAssignWithRetryFallback(roster, innings) {
  var startTime = Date.now();

  // Attempt 1: primary heuristic on original roster order
  var grid = autoAssign(roster, innings);
  var warnings = validateGrid(grid, roster, innings);

  if (warnings.length === 0) {
    return {
      grid:        grid,
      warnings:    [],
      attempts:    1,
      usedFallback: false,
      isValid:     true,
      explain:     "Clean on first attempt (" + (Date.now() - startTime) + "ms)"
    };
  }

  // Attempts 2–8: shuffle roster order to escape local minima
  var best = grid;
  var bestWarnings = warnings;
  var shuffled = roster.slice();
  var attempt = 1;

  for (; attempt < 8; attempt++) {
    // Fisher-Yates shuffle
    for (var si = shuffled.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = shuffled[si]; shuffled[si] = shuffled[sj]; shuffled[sj] = tmp;
    }
    var ng = autoAssign(shuffled, innings);
    var nw = validateGrid(ng, roster, innings);
    if (nw.length < bestWarnings.length) { best = ng; bestWarnings = nw; }
    if (bestWarnings.length === 0) { break; }
  }

  var elapsed = Date.now() - startTime;
  var isValid = bestWarnings.length === 0;
  var explain = isValid
    ? "Clean after " + (attempt + 1) + " attempts (" + elapsed + "ms)"
    : "Best result after " + (attempt + 1) + " attempts has " + bestWarnings.length
      + " warning(s): " + bestWarnings.map(function(w) { return w.msg; }).join("; ")
      + " (" + elapsed + "ms)";

  return {
    grid:        best,
    warnings:    bestWarnings,
    attempts:    attempt + 1,
    usedFallback: true,
    isValid:     isValid,
    explain:     explain
  };
}

// Backward-compatible alias so any direct autoAssignWithFallback calls still work
var autoAssignWithFallback = autoAssignWithRetryFallback;

function validateGrid(grid, roster, innings) {
  var warnings = [];
  var players = roster.map(function(r) { return r.name; });

  for (var i = 0; i < innings; i++) {
    var assigned = {};
    var benchCount = 0;
    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi];
      var pos = (grid[p] || [])[i] || "";
      if (!pos) {
        warnings.push({ type:"missing", msg: p + " unassigned in inning " + (i + 1) });
        continue;
      }
      // absent-tonight players are marked "Out" — skip all validation for them
      if (pos === "Out") { continue; }
      if (pos === "Bench") {
        benchCount++;
        if (i > 0 && grid[p][i - 1] === "Bench") {
          warnings.push({ type:"backtoback", msg: p + " benched back-to-back innings " + i + " and " + (i + 1) });
        }
      } else {
        if (assigned[pos]) {
          warnings.push({ type:"conflict", msg: "Both " + assigned[pos] + " and " + p + " at " + pos + " inning " + (i + 1) });
        }
        assigned[pos] = p;
      }
    }
    if (benchCount > 2) {
      warnings.push({ type:"bench", msg: "Inning " + (i + 1) + ": " + benchCount + " players benched (max 2)" });
    }
  }

  // Outfield repeats
  for (var opi = 0; opi < players.length; opi++) {
    var p2 = players[opi];
    var pGrid = grid[p2] || [];
    for (var ofi = 0; ofi < OUTFIELD.length; ofi++) {
      var ofPos = OUTFIELD[ofi];
      var count = 0;
      for (var gi = 0; gi < pGrid.length; gi++) { if (pGrid[gi] === ofPos) { count++; } }
      if (count > 1) {
        warnings.push({ type:"outfield", msg: p2 + " plays " + ofPos + " " + count + " times" });
      }
    }
  }

  return warnings;
}

function initGrid(roster, innings) {
  var grid = {};
  for (var i = 0; i < roster.length; i++) {
    grid[roster[i].name] = [];
    for (var j = 0; j < innings; j++) { grid[roster[i].name].push(""); }
  }
  return grid;
}


// ============================================================
// STYLES
// ============================================================

var C = {
  navy: "#0f1f3d", navyLight: "#1a3260", red: "#c8102e", redDark: "#9b0c22",
  gold: "#f5c842", cream: "#fdf6ec", white: "#ffffff", text: "#1a1a2e",
  textMuted: "#6b7280", border: "rgba(0,0,0,0.06)", cardBg: "#ffffff",
  // Field/game colors
  win: "#27ae60", loss: "#c8102e", tie: "#d4a017", canceled: "#7f8c8d",
  greenField: "#2e7d32",
  // Common UI values referenced inline throughout
  overlayBg: "rgba(0,0,0,0.5)", subtleBg: "#f8fafc",
  subtleBorder: "rgba(0,0,0,0.04)", subtleText: "#9ca3af"
};

function ss(obj) { return obj; }

var S = {
  app: { minHeight:"100vh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text },
  header: {
    background:"linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)",
    borderBottom:"4px solid " + C.red,
    padding:"12px 20px", display:"flex", alignItems:"center",
    justifyContent:"space-between", gap:"12px", flexWrap:"wrap",
    position:"sticky", top:0, zIndex:100
  },
  logoWrap: { display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" },
  logoCircle: {
    width:"42px", height:"42px", borderRadius:"50%",
    background:C.red, border:"2.5px solid " + C.gold,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:"18px", fontWeight:"bold", color:C.gold, fontFamily:"Georgia,serif", flexShrink:0
  },
  logoTitle: { fontSize:"18px", fontWeight:"bold", color:C.gold, letterSpacing:"0.04em" },
  logoSub: { fontSize:"10px", color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em" },
  tabs: { display:"flex", gap:"2px", flexWrap:"wrap" },
  tab: function(active) {
    return {
      padding:"7px 14px", borderRadius:"6px", border:"none", cursor:"pointer",
      fontSize:"11px", fontWeight:"bold", fontFamily:"Georgia,serif",
      letterSpacing:"0.06em", textTransform:"uppercase", transition:"all 0.12s",
      background: active ? C.red : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.55)"
    };
  },
  body: { flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:"600px", marginLeft:"auto", marginRight:"auto", paddingBottom:"80px" },
  card: {
    background:C.white, borderRadius:"10px", padding:"16px 18px",
    boxShadow:"0 2px 8px rgba(15,31,61,0.06)", marginBottom:"14px",
    border:"1px solid " + C.border
  },
  sectionTitle: {
    fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase",
    color:C.red, fontWeight:"bold", marginBottom:"14px"
  },
  btn: function(v) {
    var bg = "rgba(15,31,61,0.08)";
    var col = C.text;
    var bdr = "none";
    var shadow = "none";
    if (v === "primary") { bg = "linear-gradient(135deg,"+C.red+","+C.redDark+")"; col="#fff"; shadow="0 2px 8px rgba(200,16,46,0.3)"; }
    else if (v === "gold")  { bg = "linear-gradient(135deg,#c8902e,#a07010)"; col="#fff"; }
    else if (v === "ghost") { bg = "transparent"; col = C.textMuted; bdr = "1px solid " + C.border; }
    else if (v === "danger"){ bg = C.red; col = "#fff"; }
    return {
      padding:"8px 16px", borderRadius:"6px", border:bdr, cursor:"pointer",
      fontSize:"11px", letterSpacing:"0.08em", textTransform:"uppercase",
      fontWeight:"bold", fontFamily:"Georgia,serif", transition:"all 0.12s",
      background:bg, color:col, boxShadow:shadow
    };
  },
  posTag: function(pos) {
    return {
      display:"inline-block", padding:"2px 6px", borderRadius:"4px",
      fontSize:"10px", fontWeight:"bold", margin:"1px",
      background:(POS_COLORS[pos] || "#0f1f3d") + "cc", color:"#fff"
    };
  },
  input: {
    background:"#f8f4ee", border:"1.5px solid rgba(15,31,61,0.15)",
    borderRadius:"6px", padding:"7px 10px", color:C.text,
    fontFamily:"Georgia,serif", fontSize:"12px", outline:"none",
    width:"100%", boxSizing:"border-box"
  },
  badge: function(color, active) {
    return {
      display:"inline-flex", alignItems:"center", gap:"5px",
      padding:"3px 9px 3px 7px", borderRadius:"6px", cursor:"pointer",
      fontSize:"10px", fontWeight: active ? "bold" : "500",
      margin:"2px", transition:"all 0.12s",
      background: active ? color + "18" : "rgba(15,31,61,0.04)",
      color: active ? color : "#6b7280",
      border: "1px solid " + (active ? color + "55" : "rgba(15,31,61,0.1)"),
      borderLeft: "3px solid " + (active ? color : "rgba(15,31,61,0.12)")
    };
  }
};



// ============================================================
// BATTING STAT FORMAT HELPERS
// ============================================================

// fmtAvg, fmtStat — imported from @/utils/formatters

// NowBattingBar — extracted to components/GameDay/NowBattingStrip.jsx

// ============================================================
// PLAYER FILTER TOGGLE
// Viewer mode (shared link) — horizontal pill list to filter by player.
// "All Players" resets the selection.
// ============================================================

function PlayerFilterToggle({ players, selected, onSelect }) {
  var pills = ['All Players'].concat(players);
  return (
    <div style={{
      display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none',
    }}>
      {pills.map(function(name) {
        var isSelected = name === 'All Players' ? !selected : selected === name;
        return (
          <button
            key={name}
            onClick={function() { onSelect(name === 'All Players' ? null : name); }}
            style={{
              flex: 'none', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer',
              fontFamily: "Georgia,'Times New Roman',serif", fontSize: '12px', whiteSpace: 'nowrap',
              border: isSelected ? '2px solid #f5a623' : '1px solid rgba(15,31,61,0.15)',
              background: isSelected ? '#f5a623' : '#ffffff',
              color: isSelected ? '#0f1f3d' : '#555',
              fontWeight: isSelected ? 'bold' : 'normal',
              boxShadow: isSelected ? '0 2px 6px rgba(245,166,35,0.3)' : 'none',
            }}
          >
            {name === 'All Players' ? name : firstName(name)}
          </button>
        );
      })}
    </div>
  );
}

function SharedView({ payload, renderFieldSVG }) {
  // Derive inning count from grid
  var innCount = 0;
  for (var k in payload.grid) {
    if ((payload.grid[k] || []).length > innCount) { innCount = payload.grid[k].length; }
  }
  var innArr = [];
  for (var i = 0; i < innCount; i++) { innArr.push(i); }
  var rosterNames = payload.roster || [];

  // Local state for inning filter, view mode, and player filter
  var _svInn = useState(null);
  var svInn = _svInn[0]; var setSvInn = _svInn[1];
  var _svView = useState("diamond");
  var svView = _svView[0]; var setSvView = _svView[1];
  var _svPlayer = useState(null);
  var svPlayer = _svPlayer[0]; var setSvPlayer = _svPlayer[1];

  // Build position box from payload.grid (no live React state here)
  function sharedPosBox(pos) {
    var pc = POS_COLORS[pos] || "#555";
    var isSingle = svInn !== null;
    var innPlayers = [];
    for (var ii = 0; ii < innCount; ii++) {
      if (isSingle && ii !== svInn) { continue; }
      var found = "";
      for (var pi = 0; pi < rosterNames.length; pi++) {
        if ((payload.grid[rosterNames[pi]] || [])[ii] === pos) { found = rosterNames[pi]; break; }
      }
      innPlayers.push({ inn: ii + 1, name: found });
    }
    var hasSelectedPlayer = svPlayer && innPlayers.some(function(row) { return row.name === svPlayer; });
    return (
      <div style={{ background: hasSelectedPlayer ? "rgba(245,166,35,0.10)" : "rgba(255,255,255,0.97)",
        border: "2px solid " + (hasSelectedPlayer ? "#f5a623" : pc), borderRadius:"7px",
        padding: isSingle ? "5px 8px" : "3px 5px", width:"100%", boxSizing:"border-box",
        boxShadow:"0 1px 5px rgba(0,0,0,0.14)", overflow:"hidden", minWidth:0 }}>
        <div style={{ fontSize:"9px", fontWeight:"bold", color:pc, textAlign:"center",
          borderBottom:"1px solid "+pc+"44", paddingBottom:"2px", marginBottom: isSingle ? "4px" : "2px" }}>{pos}</div>
        {innPlayers.map(function(row) {
          var isHighlighted = svPlayer && row.name === svPlayer;
          return isSingle ? (
            <div key={row.inn} style={{ fontSize:"12px", fontWeight: row.name ? "bold" : "normal",
              color: isHighlighted ? "#b45309" : (row.name ? C.navy : "#bbb"), textAlign:"center", padding:"1px 0",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {row.name ? firstName(row.name) : "-"}
            </div>
          ) : (
            <div key={row.inn} style={{ display:"flex", gap:"2px", alignItems:"baseline", fontSize:"9.5px", lineHeight:"1.5", overflow:"hidden" }}>
              <span style={{ color:"#aaa", fontSize:"7.5px", minWidth:"8px", textAlign:"right", flexShrink:0 }}>{row.inn}</span>
              <span style={{ fontWeight: (row.name ? "bold" : "normal"), color: isHighlighted ? "#b45309" : (row.name ? C.navy : "#ccc"),
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, flex:1 }}>{row.name ? firstName(row.name) : "-"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Bench for selected inning(s)
  var benchByInning = innArr.map(function(ii) {
    return rosterNames.filter(function(n) { return (payload.grid[n] || [])[ii] === "Bench"; });
  });
  var outByInning = innArr.map(function(ii) {
    return rosterNames.filter(function(n) { return (payload.grid[n] || [])[ii] === "Out"; });
  });
  var benchDisplay   = svInn !== null ? [benchByInning[svInn] || []] : benchByInning;
  var outDisplay     = svInn !== null ? [outByInning[svInn] || []]   : outByInning;
  var benchLabels    = svInn !== null ? [svInn] : innArr;
  function getSharedPlayerFn(pos, inn) {
    for (var pi = 0; pi < rosterNames.length; pi++) {
      if ((payload.grid[rosterNames[pi]] || [])[inn] === pos) { return rosterNames[pi]; }
    }
    return "";
  }

  var teamInitial = payload.team ? payload.team.charAt(0).toUpperCase() : "L";
  var IF_POSITIONS = ["3B","SS","P","2B","1B"];
  var OF_POSITIONS = ["LF","LC","RC","RF"];

  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg,#0f1f3d,#1a3260)", borderBottom:"4px solid " + C.red, padding:"14px 20px" }}>
        <div style={{ maxWidth:"800px", margin:"0 auto", display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:C.red, border:"2.5px solid "+C.gold,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", fontWeight:"bold", color:C.gold, flexShrink:0 }}>
            {teamInitial}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"17px", fontWeight:"bold", color:C.gold, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {payload.team}
            </div>
            {payload.game ? (
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", marginTop:"1px" }}>
                vs {payload.game.opponent}
                {payload.game.date ? " · " + new Date(payload.game.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}) : ""}
                {payload.game.time ? " · " + payload.game.time : ""}
              </div>
            ) : (
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginTop:"1px" }}>Game Day Lineup</div>
            )}
          </div>
          <button onClick={function() { window.print(); }}
            style={{ padding:"6px 14px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.75)", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", cursor:"pointer", flexShrink:0 }}>
            Print
          </button>
        </div>
      </div>

      <div style={{ maxWidth:"800px", margin:"0 auto", padding:"16px 20px" }}>

        {/* ── Player filter pills ──────────────────────────────── */}
        {rosterNames.length > 0 ? (
          <div style={{ marginBottom:"12px" }}>
            <PlayerFilterToggle
              players={payload.absentNames && payload.absentNames.length > 0 ? rosterNames.filter(function(n) { return payload.absentNames.indexOf(n) < 0; }) : rosterNames}
              selected={svPlayer}
              onSelect={setSvPlayer}
            />
          </div>
        ) : null}

        {/* ── Controls row: inning filter + view toggle ───────── */}
        <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"16px", flexWrap:"wrap" }}>
          {/* Inning pills */}
          <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", overflowX:"auto", WebkitOverflowScrolling:"touch", flex:1, minWidth:0 }}>
            <span style={{ fontSize:"9px", color:C.textMuted, fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
            <button onClick={function() { setSvInn(null); }}
              style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                background: svInn === null ? C.navy : "rgba(15,31,61,0.08)", color: svInn === null ? "#fff" : C.textMuted }}>All</button>
            {innArr.map(function(i) {
              var active = svInn === i;
              return (
                <button key={i} onClick={function(idx) { return function() { setSvInn(idx); }; }(i)}
                  style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                    background: active ? C.red : "rgba(15,31,61,0.08)", color: active ? "#fff" : C.textMuted }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {/* View toggle */}
          <div style={{ display:"flex", gap:"3px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px", flexShrink:0 }}>
            {[["◆","diamond"],["≡","table"]].map(function(opt) {
              var active = svView === opt[1];
              return (
                <button key={opt[1]} onClick={function(v) { return function() { setSvView(v); }; }(opt[1])}
                  title={opt[1] === "diamond" ? "Diamond view" : "Table view"}
                  style={{ padding:"4px 10px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"12px", fontFamily:"inherit", fontWeight:"bold",
                    background: active ? C.white : "transparent", color: active ? C.navy : C.textMuted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {opt[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Diamond view ─────────────────────────────────────── */}
        {svView === "diamond" ? (
          <div style={{ marginBottom:"16px" }}>
            {renderFieldSVG(getSharedPlayerFn, svInn, innArr)}
                          {/* Bench strip */}
            <div style={{ borderTop:"2px solid rgba(15,31,61,0.12)", paddingTop:"8px" }}>
              <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                  <thead>
                    <tr style={{ background:"#f5efe4" }}>
                      {benchLabels.map(function(ii) {
                        return <th key={ii} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", borderBottom:"2px solid rgba(15,31,61,0.12)", minWidth:"52px" }}>Inn {ii+1}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(function() {
                      var maxB = 0;
                      for (var di = 0; di < benchDisplay.length; di++) { if (benchDisplay[di].length > maxB) maxB = benchDisplay[di].length; }
                      var maxOut = 0;
                      for (var doi = 0; doi < outDisplay.length; doi++) { if (outDisplay[doi].length > maxOut) maxOut = outDisplay[doi].length; }
                      var rows = [];
                      for (var r = 0; r < maxB; r++) {
                        rows.push(
                          <tr key={r}>
                            {benchLabels.map(function(lbl, ci) {
                              var pn = benchDisplay[ci][r] || "";
                              return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color: pn ? C.navy : "#ccc" }}>{pn ? firstName(pn) : "-"}</td>;
                            })}
                          </tr>
                        );
                      }
                      if (maxOut > 0) {
                        rows.push(
                          <tr key="out-hdr">
                            {benchLabels.map(function(lbl) {
                              return (
                                <td key={lbl} style={{ padding:"3px 10px", textAlign:"center",
                                  borderTop:"2px solid rgba(220,38,38,0.3)",
                                  background:"rgba(220,38,38,0.05)",
                                  fontSize:"9px", fontWeight:"bold", color:"#dc2626",
                                  letterSpacing:"0.08em", textTransform:"uppercase" }}>
                                  Out
                                </td>
                              );
                            })}
                          </tr>
                        );
                        for (var or = 0; or < maxOut; or++) {
                          rows.push(
                            <tr key={"out-" + or}>
                              {benchLabels.map(function(lbl, ci) {
                                var pn = outDisplay[ci][or] || "";
                                return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(220,38,38,0.08)", fontWeight:"bold", color: pn ? "#dc2626" : "#ccc", background:"rgba(220,38,38,0.04)" }}>{pn ? firstName(pn) : "-"}</td>;
                              })}
                            </tr>
                          );
                        }
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ── Table view ──────────────────────────────────────── */
          <div style={{ marginBottom:"16px" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, borderBottom:"2px solid rgba(15,31,61,0.1)", position:"sticky", left:0, background:"#f5efe4" }}>Player</th>
                    {(svInn !== null ? [svInn] : innArr).map(function(i) {
                      return <th key={i} style={{ padding:"7px 10px", textAlign:"center", fontSize:"10px", color:C.textMuted, borderBottom:"2px solid rgba(15,31,61,0.1)", minWidth:"60px" }}>Inn {i+1}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rosterNames.map(function(name, ri) {
                    var isSelectedRow = svPlayer && name === svPlayer;
                    var rowBg = isSelectedRow ? "rgba(245,166,35,0.12)" : (ri%2===0 ? "#fff" : "#faf8f5");
                    return (
                      <tr key={name} style={{ background: rowBg }}>
                        <td style={{ padding:"6px 12px", fontWeight:"bold", position:"sticky", left:0, background: rowBg, borderBottom:"1px solid rgba(15,31,61,0.04)", color: isSelectedRow ? "#b45309" : C.navy }}>{firstName(name)}</td>
                        {(svInn !== null ? [svInn] : innArr).map(function(i) {
                          var pos = (payload.grid[name] || [])[i] || "";
                          return (
                            <td key={i} style={{ padding:"4px 6px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                              {pos === "Out" ? (
                                <span style={{ display:"inline-block", padding:"2px 5px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:"#fee2e2", color:"#dc2626" }}>OUT</span>
                              ) : pos ? (
                                <span style={{ display:"inline-block", padding:"2px 5px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:(POS_COLORS[pos]||"#555")+"cc", color:"#fff" }}>{pos}</span>
                              ) : (
                                <span style={{ color:"#ccc" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Batting order ─────────────────────────────────────── */}
        {payload.batting && payload.batting.length > 0 ? (
          <div style={{ ...S.card, marginTop:"4px" }}>
            <div style={S.sectionTitle}>Batting Order</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"6px" }}>
              {payload.batting.map(function(name, idx) {
                var isSelectedBatter = svPlayer && name === svPlayer;
                var fieldPos = [];
                for (var ii = 0; ii < innCount; ii++) {
                  var pos = (payload.grid[name] || [])[ii];
                  if (!pos || pos === "") {
                    fieldPos.push("-");
                  } else if (pos === "Bench") {
                    fieldPos.push("–");
                  } else if (pos === "Out") {
                    fieldPos.push("OUT");
                  } else {
                    fieldPos.push(pos);
                  }
                }
                return (
                  <div key={name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 10px",
                    border:"1px solid " + (isSelectedBatter ? "#f5a623" : "rgba(15,31,61,0.08)"),
                    background: isSelectedBatter ? "rgba(245,166,35,0.08)" : undefined,
                    borderRadius:"6px" }}>
                    <div style={{ width:"20px", height:"20px", borderRadius:"50%",
                      background: isSelectedBatter ? "#f5a623" : C.navy,
                      color: isSelectedBatter ? "#0f1f3d" : "#fff",
                      fontSize:"10px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx+1}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:"bold", fontSize:"12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        color: isSelectedBatter ? "#b45309" : undefined }}>{firstName(name)}</div>
                      {fieldPos.length > 0 ? (
                        <div style={{ fontSize:"9px", color:C.textMuted }}>
                          {fieldPos.map(function(fp, fpi) {
                            return (
                              <span key={fpi} style={{ color: fp === "OUT" ? "#dc2626" : "inherit", fontWeight: fp === "OUT" ? "bold" : "inherit" }}>
                                {fpi > 0 ? ", " : ""}{fp}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      {(function() {
                        var songData = payload.songs && payload.songs[name];
                        if (!songData || (!songData.song && !songData.artist)) return null;
                        return (
                          <div style={{ marginTop:"4px", paddingTop:"4px", borderTop:"1px solid rgba(15,31,61,0.08)" }}>
                            {songData.song && <div style={{ fontSize:"10px", fontWeight:"600", color:"#1e293b" }}>🎵 {songData.song}</div>}
                            {songData.artist && <div style={{ fontSize:"9px", color:"#64748b" }}>🎤 {songData.artist}</div>}
                            {songData.start && songData.end && <div style={{ fontSize:"9px", color:"#94a3b8" }}>⏱ {songData.start} → {songData.end}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            {payload.absentNames && payload.absentNames.length > 0 ? (
              <div style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid rgba(15,31,61,0.08)", fontSize:"11px", color:"#94a3b8", fontStyle:"italic" }}>
                Not playing tonight: {payload.absentNames.map(function(n) { return n.split(" ")[0]; }).join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ textAlign:"center", marginTop:"24px", fontSize:"11px", color:C.textMuted, borderTop:"1px solid rgba(15,31,61,0.08)", paddingTop:"16px" }}>
          <div style={{ marginBottom:"4px" }}>View-only lineup · Dugout Lineup</div>
          <div style={{ fontSize:"10px", color:"rgba(15,31,61,0.25)" }}>Tap Print to save as PDF or screenshot this page</div>
        </div>
      </div>
    </div>
  );
}

// LockFlow — extracted to components/GameDay/LockFlow.jsx

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function App() {

  var backendHealth = useBackendHealth();
  var _featureFlags = useFeatureFlags();
  var runtimeFlags = _featureFlags.flags; var flagsLoading = _featureFlags.loading;

  var _hydratedTeamIds = useState({});
  var hydratedTeamIds = _hydratedTeamIds[0]; var setHydratedTeamIds = _hydratedTeamIds[1];

  var _gameModeActive = useState(false);
  var gameModeActive = _gameModeActive[0]; var setGameModeActive = _gameModeActive[1];

  var _syncStatus = useState("idle");
  var syncStatus = _syncStatus[0]; var setSyncStatus = _syncStatus[1];

  function dbSync(fn) {
    window._lastLocalWrite = Date.now();
    setSyncStatus("syncing");
    fn().then(function() {
      setSyncStatus("synced");
      setTimeout(function() { setSyncStatus("idle"); }, 2000);
    }).catch(function(e) {
      setSyncStatus("error");
      console.warn("[DB] sync error:", e);
    });
  }

  // --- Team / App level state ---
  var initTeams    = loadJSON("app:teams", null) || [];
  var initActiveId = loadJSON("ui:activeTeam", null);
  var initRoster   = initActiveId ? migrateRoster(loadJSON("team:" + initActiveId + ":roster", [])) : [];
  var initSchedule   = initActiveId ? migrateSchedule(loadJSON("team:" + initActiveId + ":schedule", [])) : [];
  var initPractice   = initActiveId ? loadJSON("team:" + initActiveId + ":practices", []) : [];
  var initInnings  = initActiveId ? (loadJSON("team:" + initActiveId + ":innings", 6) || 6) : 6;
  var initGrid_    = initActiveId ? migrateGrid(loadJSON("team:" + initActiveId + ":grid", null), initRoster, initInnings) : null;

  var MERGE_FIELDS = ['scoreReported', 'snackDuty', 'snackNote', 'gameBall'];

  function normalizeGameBall(val) {
    if (!val || val === "") return [];
    if (Array.isArray(val)) return val;
    return [val];
  }

  if (!window._lineupDbBooted && isSupabaseEnabled) {
    window._lineupDbBooted = true;
    dbLoadTeams().then(function(dbTeams) {
      var localTeams = loadJSON('app:teams', []);
      var merged = localTeams; // default: local is source of truth

      if (dbTeams) {
        // Additive merge: keep all local teams, add any Supabase teams
        // whose ID is not already known locally.
        // String() cast handles bigint vs string ID comparison.
        var localIds = {};
        for (var li = 0; li < localTeams.length; li++) {
          localIds[String(localTeams[li].id)] = true;
        }

        var newFromDb = [];
        for (var di = 0; di < dbTeams.length; di++) {
          if (!localIds[String(dbTeams[di].id)]) {
            newFromDb.push(dbTeams[di]);
          }
        }

        if (newFromDb.length > 0) {
          merged = localTeams.concat(newFromDb);
          saveJSON('app:teams', merged);
          setTeams(merged);
          console.log('[Boot] Added ' + newFromDb.length +
            ' team(s) from Supabase:', newFromDb.map(function(t) { return t.name; }));
        }
      }

      // If a team was already active (e.g. returning user on fresh browser),
      // hydrate its data from Supabase so the home screen shows the correct
      // status badge and CTAs without requiring the user to tap into the team first.
      var bootActiveId = loadJSON("ui:activeTeam", null);
      if (bootActiveId) {
        dbLoadTeamData(bootActiveId).then(function(dbData) {
          if (!dbData || !dbData.roster || dbData.roster.length === 0) { return; }
          // Read existing local values BEFORE touching anything
          var localRoster = loadJSON("team:" + bootActiveId + ":roster", null);
          var localGrid   = loadJSON("team:" + bootActiveId + ":grid",   null);
          var localSched  = loadJSON("team:" + bootActiveId + ":schedule", null);
          // Only write to localStorage when it is empty — this serves iOS fresh-install
          // (empty localStorage) without overwriting offline changes on existing installs.
          // Never blindly overwrite: local data may have edits not yet synced to Supabase.
          if (!localRoster || localRoster.length === 0) {
            saveJSON("team:" + bootActiveId + ":roster", dbData.roster);
            localRoster = dbData.roster;
          }
          if (!localGrid) {
            saveJSON("team:" + bootActiveId + ":grid", dbData.grid);
          }
          // React state: prefer localStorage (may have offline changes) over Supabase
          setRoster(migrateRoster(localRoster));
          var _dbSchedBoot = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
          var _localSchedArr = Array.isArray(localSched) && localSched.length > 0 ? localSched : [];
          var _bootSched = _localSchedArr.length > 0
            ? mergeLocalScheduleFields(_dbSchedBoot, _localSchedArr, MERGE_FIELDS)
            : _dbSchedBoot;
          setSchedule(_bootSched);
          if (dbData.attendanceOverrides && Object.keys(dbData.attendanceOverrides).length > 0) {
            setAttendanceOverrides(dbData.attendanceOverrides);
            localStorage.setItem('attendanceOverrides', JSON.stringify(dbData.attendanceOverrides));
          }
          var bootTeam = merged.find ? merged.find(function(t) { return t.id === bootActiveId; }) : null;
          if (bootTeam) { dbSnapshotRoster(bootActiveId, bootTeam.name, dbData.roster, 'app_load'); }
        }).catch(function(err) {
          console.error("[boot] failed to hydrate active team:", err);
        });
      }

      // Hydrate non-active teams into localStorage so TeamCard renders correct
      // status badges on first paint — without this, teams not yet visited on
      // this device show empty localStorage and flash "Missing roster".
      for (var bi = 0; bi < merged.length; bi++) {
        (function(t) {
          if (t.id === bootActiveId) { return; } // active team already hydrated above
          var alreadyInStorage = loadJSON("team:" + t.id + ":roster", null);
          if (alreadyInStorage && alreadyInStorage.length > 0) {
            // localStorage is warm — mark hydrated immediately, no fetch needed
            setHydratedTeamIds(function(prev) { var n = Object.assign({}, prev); n[t.id] = true; return n; });
            return;
          }
          dbLoadTeamData(t.id).then(function(dbData) {
            if (dbData && dbData.roster && dbData.roster.length > 0) {
              saveJSON("team:" + t.id + ":roster", dbData.roster);
              var localSched = loadJSON("team:" + t.id + ":schedule", []);
              var migratedDbSched = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
              var safeSched = mergeLocalScheduleFields(migratedDbSched, localSched, MERGE_FIELDS);
              saveJSON("team:" + t.id + ":schedule", safeSched);
              saveJSON("team:" + t.id + ":grid",     dbData.grid);
            }
            setHydratedTeamIds(function(prev) { var n = Object.assign({}, prev); n[t.id] = true; return n; });
          }).catch(function() {
            // Fail open — card will show its real localStorage state (may be "Missing roster"
            // but at least it's not a false negative caused by a fetch we never tried)
            setHydratedTeamIds(function(prev) { var n = Object.assign({}, prev); n[t.id] = true; return n; });
          });
        })(merged[bi]);
      }

      // MIGRATION: seed division teams that do not yet exist in DB
      // Each team gets a migration version stamp. If the stamp matches
      // the current version, skip — do not overwrite coach edits.
      // Coaches can freely edit schedules via the Schedule tab after seeding.
      var MIGRATION_VERSION = "2026-official-v6";
      var existingIds = merged.map(function(t) { return t.id; });

      var migrationTargets = [
        { id:"bananas-8u",         name:"Bananas",         ageGroup:"8U", year:2026, schedule:BANANAS_8U_SCHEDULE         },
        { id:"blue-wahoos-8u",     name:"Blue Wahoos",     ageGroup:"8U", year:2026, schedule:BLUE_WAHOOS_8U_SCHEDULE     },
        { id:"firefighters-8u",    name:"Firefighters",    ageGroup:"8U", year:2026, schedule:FIREFIGHTERS_8U_SCHEDULE    },
        { id:"party-animals-8u",   name:"Party Animals",   ageGroup:"8U", year:2026, schedule:PARTY_ANIMALS_8U_SCHEDULE   },
        { id:"timber-rattlers-8u", name:"Timber Rattlers", ageGroup:"8U", year:2026, schedule:TIMBER_RATTLERS_8U_SCHEDULE }
      ];

      var toCreate = [];
      for (var mi = 0; mi < migrationTargets.length; mi++) {
        var mt = migrationTargets[mi];
        var migKey = "migration:" + mt.id + ":version";
        var alreadyMigrated = loadJSON(migKey, null);
        if (alreadyMigrated === MIGRATION_VERSION) { continue; } // already done
        if (existingIds.indexOf(mt.id) >= 0) {
          if (alreadyMigrated !== MIGRATION_VERSION) {
            (function(captured) {
              var localSchedule = loadJSON("team:" + captured.id + ":schedule", []);
              function getLocalBattingPerf(gameId) {
                var localGame = localSchedule.find(function(g) { return g.id === gameId; });
                return (localGame && localGame.battingPerf && Object.keys(localGame.battingPerf).length > 0)
                  ? localGame.battingPerf
                  : null;
              }
              dbLoadTeamData(captured.id).then(function(existing) {
                dbSaveTeamData(captured.id, {
                  roster:       existing && existing.roster        ? existing.roster        : [],
                  schedule:     (function() {
                    var exGames = existing && existing.schedule ? existing.schedule : [];
                    var exById = {};
                    for (var ei = 0; ei < exGames.length; ei++) {
                      if (exGames[ei].id) { exById[exGames[ei].id] = exGames[ei]; }
                    }
                    return captured.schedule.map(function(seed) {
                      var prev = exById[seed.id];
                      if (!prev) { return seed; }
                      return {
                        id: seed.id, date: seed.date, time: seed.time,
                        location: seed.location, opponent: seed.opponent, home: seed.home,
                        result:        prev.result        || seed.result,
                        ourScore:      prev.ourScore      || seed.ourScore,
                        theirScore:    prev.theirScore    || seed.theirScore,
                        snackDuty:     prev.snackDuty     || seed.snackDuty   || "",
                        snackNote:     prev.snackNote     || seed.snackNote   || "",
                        gameBall:      normalizeGameBall(prev.gameBall !== undefined && prev.gameBall !== "" ? prev.gameBall : seed.gameBall),
                        scoreReported: prev.scoreReported || seed.scoreReported || false,
                        battingPerf: getLocalBattingPerf(seed.id) || (prev.battingPerf && Object.keys(prev.battingPerf).length > 0
                                     ? prev.battingPerf : (seed.battingPerf || {}))
                      };
                    });
                  })(),
                  practices:    existing && existing.practices     ? existing.practices     : [],
                  battingOrder: existing && existing.battingOrder  ? existing.battingOrder  : [],
                  grid:         existing && existing.grid          ? existing.grid          : {},
                  innings:      existing && existing.innings       ? existing.innings       : 6,
                  locked:       existing                           ? existing.locked        : false
                });
                var _localSched2 = loadJSON("team:" + captured.id + ":schedule", []);
                var _mergedSeed = mergeLocalScheduleFields(captured.schedule, _localSched2, MERGE_FIELDS);
                saveJSON("team:" + captured.id + ":schedule", _mergedSeed);
                saveJSON("migration:" + captured.id + ":version", MIGRATION_VERSION);
              }).catch(function() {
                saveJSON("migration:" + captured.id + ":version", MIGRATION_VERSION);
              });
            })(mt);
          } else {
            saveJSON(migKey, MIGRATION_VERSION);
          }
          continue;
        }
        toCreate.push(mt);
      }

      if (toCreate.length > 0) {
        // Add new teams to the local list immediately
        var withNew = merged.concat(toCreate.map(function(t) {
          return { id:t.id, name:t.name, ageGroup:t.ageGroup, year:t.year };
        }));
        saveJSON("app:teams", withNew);
        setTeams(withNew);

        // Persist each team to Supabase and localStorage
        // SAFETY: check for existing data first — never wipe a roster that already exists
        for (var ci = 0; ci < toCreate.length; ci++) {
          (function(ct) {
            var migKey2 = "migration:" + ct.id + ":version";
            // Save team record
            dbSaveTeams([{ id:ct.id, name:ct.name, ageGroup:ct.ageGroup, year:ct.year }]);
            // Check if data already exists before seeding with empty roster
            // OLD (unsafe): dbSaveTeamData(ct.id, { roster: [], schedule: ct.schedule, ... });
            dbLoadTeamData(ct.id).then(function(existing) {
              dbSaveTeamData(ct.id, {
                // If existing roster found, preserve it — never overwrite with []
                roster:       existing && existing.roster && existing.roster.length > 0 ? existing.roster : [],
                schedule:     ct.schedule,
                practices:    existing && existing.practices    ? existing.practices    : [],
                battingOrder: existing && existing.battingOrder ? existing.battingOrder : [],
                grid:         existing && existing.grid         ? existing.grid         : {},
                innings:      existing && existing.innings      ? existing.innings      : 6,
                locked:       existing                          ? existing.locked       : false
              });
              // Seed localStorage — preserve existing roster in local storage too
              saveJSON("team:" + ct.id + ":schedule", ct.schedule);
              if (!existing || !existing.roster || existing.roster.length === 0) {
                saveJSON("team:" + ct.id + ":roster", []);
              }
              // Stamp migration version so this never runs again for this team
              saveJSON(migKey2, MIGRATION_VERSION);
            }).catch(function() {
              // On error, still seed schedule but leave roster untouched
              dbSaveTeamData(ct.id, {
                roster: [], schedule: ct.schedule, practices: [],
                battingOrder: [], grid: {}, innings: 6, locked: false
              });
              saveJSON("team:" + ct.id + ":schedule", ct.schedule);
              saveJSON("team:" + ct.id + ":roster", []);
              saveJSON(migKey2, MIGRATION_VERSION);
            });
          })(toCreate[ci]);
        }
      }
      // One-time patch: find Mud Hens by name and push official
      // schedule to whatever ID it was actually created with.
      // This handles the case where the team was created via UI
      // with a timestamp ID instead of the hardcoded "mudhens-8u".
      var MH_PATCH_KEY = "migration:mudhens:schedule-patch-v6";
      if (loadJSON(MH_PATCH_KEY, null) !== "done") {
        var mhTeam = null;
        for (var mhi = 0; mhi < merged.length; mhi++) {
          if (merged[mhi].name === "Mud Hens") { mhTeam = merged[mhi]; break; }
        }
        if (mhTeam) {
          (function(capturedTeam) {
            dbLoadTeamData(capturedTeam.id).then(function(existing) {
              var existingGames = existing && existing.schedule ? existing.schedule : [];
              var existingById = {};
              for (var ei = 0; ei < existingGames.length; ei++) {
                existingById[existingGames[ei].id] = existingGames[ei];
              }
              var mergedSchedule = MUD_HENS_SCHEDULE.map(function(og) {
                var prev = existingById[og.id];
                if (!prev) return og;
                return Object.assign({}, og, {
                  result:        prev.result        !== undefined ? prev.result        : og.result,
                  ourScore:      prev.ourScore       !== undefined ? prev.ourScore      : og.ourScore,
                  theirScore:    prev.theirScore     !== undefined ? prev.theirScore    : og.theirScore,
                  battingPerf:   prev.battingPerf    && Object.keys(prev.battingPerf).length > 0 ? prev.battingPerf : og.battingPerf,
                  snackDuty:     prev.snackDuty      !== undefined ? prev.snackDuty     : (og.snackDuty     || ""),
                  gameBall:      normalizeGameBall(prev.gameBall !== undefined && prev.gameBall !== "" && !(Array.isArray(prev.gameBall) && prev.gameBall.length === 0) ? prev.gameBall : og.gameBall),
                  scoreReported: prev.scoreReported  !== undefined ? prev.scoreReported : (og.scoreReported || false)
                });
              });
              dbSaveTeamData(capturedTeam.id, {
                roster:       existing && existing.roster       ? existing.roster       : [],
                schedule:     mergedSchedule,
                practices:    existing && existing.practices    ? existing.practices    : [],
                battingOrder: existing && existing.battingOrder ? existing.battingOrder : [],
                grid:         existing && existing.grid         ? existing.grid         : {},
                innings:      existing && existing.innings      ? existing.innings      : 6,
                locked:       existing                          ? existing.locked       : false
              });
              saveJSON("team:" + capturedTeam.id + ":schedule", mergedSchedule);
              saveJSON(MH_PATCH_KEY, "done");
            }).catch(function() {});
          })(mhTeam);
        }
      }
    }).catch(function() {});
  }

  var _sc = useState("home");  // Always land on home — greeting + team picker
  var screen = _sc[0]; var setScreen = _sc[1];
  var _teams = useState(initTeams);
  var teams = _teams[0]; var setTeams = _teams[1];
  var _atid = useState(initActiveId);
  var activeTeamId = _atid[0]; var setActiveTeamId = _atid[1];
  var _liveScoring = useFeatureFlag('live_scoring', activeTeamId);
  var _isAlwaysScoringTeam = (activeTeam && (activeTeam.name === 'Mud Hens' || activeTeam.name === 'Demo All-Stars'));
  var liveScoringEnabled = _isAlwaysScoringTeam ? true : _liveScoring.enabled;
  var _primaryTab = useState("home");
  var primaryTab = _primaryTab[0]; var setPrimaryTab = _primaryTab[1];
  var _rosterTab = useState("players");
  var rosterTab = _rosterTab[0]; var setRosterTab = _rosterTab[1];
  var _gameDayTab = useState("lineups");
  var gameDayTab = _gameDayTab[0]; var setGameDayTab = _gameDayTab[1];
  var _lineupsSubTab = useState("defense");
  var lineupsSubTab = _lineupsSubTab[0];
  var setLineupsSubTab = _lineupsSubTab[1];
  var _seasonTab = useState("schedule");
  var seasonTab = _seasonTab[0]; var setSeasonTab = _seasonTab[1];
  var _teamSubTab = useState("roster");
  var teamSubTab = _teamSubTab[0]; var setTeamSubTab = _teamSubTab[1];
  var _statsSortCol = useState("name");
  var statsSortCol = _statsSortCol[0]; var setStatsSortCol = _statsSortCol[1];
  var _statsSortDir = useState("asc");
  var statsSortDir = _statsSortDir[0]; var setStatsSortDir = _statsSortDir[1];
  var _summarySortCol = useState("avg");
  var summarySortCol = _summarySortCol[0]; var setSummarySortCol = _summarySortCol[1];
  var _summarySortDir = useState("desc");
  var summarySortDir = _summarySortDir[0]; var setSummarySortDir = _summarySortDir[1];
  var _batDirty = useState(false);
  var battingOrderDirty = _batDirty[0]; var setBattingOrderDirty = _batDirty[1];
  var _batSaved = useState(false);
  var battingOrderSaved = _batSaved[0]; var setBattingOrderSaved = _batSaved[1];
  var _preSuggest = useState(null);
  var preSuggestOrder = _preSuggest[0]; var setPreSuggestOrder = _preSuggest[1];
  var _isOnline = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  var isOnline = _isOnline[0]; var setIsOnline = _isOnline[1];
  var _parentViewActive = useState(false);
  var parentViewActive = _parentViewActive[0]; var setParentViewActive = _parentViewActive[1];
  var _selectedParentPlayer = useState(null);
  var selectedParentPlayer = _selectedParentPlayer[0]; var setSelectedParentPlayer = _selectedParentPlayer[1];
  var _moreTab = useState("about");
  var moreTab = _moreTab[0]; var setMoreTab = _moreTab[1];
  var _sharePayload = useState(null);
  var sharePayload = _sharePayload[0]; var setSharePayload = _sharePayload[1];
  var _shareLoading = useState(function() {
    return !!(new URLSearchParams(window.location.search).get("s"));
  });
  var shareLoading = _shareLoading[0]; var setShareLoading = _shareLoading[1];

  const {
    authState, setAuthState,
    session,
    user,
    membership,
    role,
    sendMagicLink,
    requestAccess,
    logout,
  } = useAuth();

  const [authScreen, setAuthScreen] = useState('login');

  // Online/offline detection
  useEffect(function() {
    var goOnline  = function() { setIsOnline(true);  };
    var goOffline = function() { setIsOnline(false); };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return function() {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Feature flag URL bootstrap — ?enable_flag=<name> sets localStorage and reloads
  // ?disable_flag=<name> clears it. Allows per-user flag activation via a shared link.
  // ?coach_access=mudhen2026 sets bypass:maintenance so coaches can enter during maintenance.
  // ?clear_bypass removes the bypass.
  useEffect(function() {
    var _ffp = new URLSearchParams(window.location.search);
    var _ef = _ffp.get("enable_flag");
    var _df = _ffp.get("disable_flag");
    var _ca = _ffp.get("coach_access");
    var _cb = _ffp.get("clear_bypass");
    if (!_ef && !_df && !_ca && _cb === null) { return; }
    if (_ef) { localStorage.setItem("flag:" + _ef, "1"); }
    if (_df) { localStorage.removeItem("flag:" + _df); }
    if (_ca === 'mudhen2026') { localStorage.setItem('bypass:maintenance', '1'); }
    if (_cb !== null) { localStorage.removeItem('bypass:maintenance'); }
    // Strip the params and reload so changes take effect cleanly
    var clean = window.location.pathname;
    var kept = [];
    _ffp.forEach(function(v, k) {
      if (k !== "enable_flag" && k !== "disable_flag" && k !== "coach_access" && k !== "clear_bypass") {
        kept.push(k + "=" + encodeURIComponent(v));
      }
    });
    window.location.replace(clean + (kept.length ? "?" + kept.join("&") : ""));
  }, []);

  // Fetch short share link payload on mount
  useEffect(function() {
    var sid = new URLSearchParams(window.location.search).get("s");
    if (!sid) { return; }
    dbLoadShareLink(sid).then(function(payload) {
      if (payload) {
        setSharePayload(payload);
        track("share_link_viewed", {
          has_lineup: true,
          viewer_type: "parent",
          referrer: document.referrer || "direct",
          platform: /iPhone|iPad|iPod/.test(navigator.userAgent)
            ? "ios"
            : /Android/.test(navigator.userAgent)
            ? "android"
            : "desktop",
          is_pwa: window.matchMedia('(display-mode: standalone)').matches
        });
        vaTrack("share_link_viewed");
      } else {
        track("share_link_view_failed", { error: "fetch_failed" });
      }
      setShareLoading(false);
    }).catch(function() {
      track("share_link_view_failed", { error: "fetch_failed" });
      setShareLoading(false);
    });
  }, []);

  // Analytics: app opened — fires once on mount; teams is synchronously initialized from localStorage
  useEffect(function() {
    vaTrack("app_loaded");
    var isFirstLaunch = !localStorage.getItem("app:first_launched");
    if (isFirstLaunch) { localStorage.setItem("app:first_launched", String(Date.now())); }
    track("app_opened", {
      coach_name_set: teams.length > 0,
      team_count: teams.length,
      app_version: APP_VERSION,
      is_first_launch: isFirstLaunch
    });
    if (isFirstLaunch) { track("first_launch", { team_count: teams.length, app_version: APP_VERSION }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Vercel Analytics: game mode screen view — fires each time game mode is entered
  useEffect(function() {
    if (gameModeActive) vaTrack("game_mode_entered");
  }, [gameModeActive]);

  // PWA install prompt — capture and show persistent banner immediately (Android/Chrome only)
  useEffect(function() {
    var handler = function(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowInstallBanner(true);
        track("pwa_banner_shown", { platform: "android", prompt_ready: true, browser: navigator.userAgentData?.brands?.[0]?.brand || "chrome" });
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", function() {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem("pwa_installed", "1");
      track("pwa_installed", { platform: isIOS ? "ios" : "android" });
      mixpanel.register({ is_pwa: true, platform: "pwa_" + deviceContext.device_os });
    });
    return function() {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [isStandalone]);

  // iOS install banner — Safari doesn't fire beforeinstallprompt; show immediately if not standalone
  useEffect(function() {
    if (!isIOS || isStandalone) return;
    setShowInstallBanner(true);
    track("pwa_banner_shown", { platform: "ios", prompt_ready: false, browser: "safari" });
  }, [isIOS, isStandalone]);

  var _ros = useState(initRoster);
  var roster = _ros[0]; var setRoster = _ros[1];
  var _rosterHistory = useState([]);
  var rosterHistory = _rosterHistory[0]; var setRosterHistory = _rosterHistory[1];
  var _inn = useState(initInnings);
  var innings = _inn[0]; var setInnings = _inn[1];
  var _grd = useState(function() { return initGrid_ || initGrid(initRoster, initInnings); });
  var grid = _grd[0]; var setGrid = _grd[1];
  var _bat = useState(initRoster.map(function(r) { return r.name; }));
  var battingOrder = _bat[0]; var setBattingOrder = _bat[1];
  var _sched = useState(initSchedule);
  var schedule = _sched[0]; var setSchedule = _sched[1];
  var _prac = useState(initPractice);
  var practices = _prac[0]; var setPractices = _prac[1];
  var _dirty = useState(false);
  var lineupDirty = _dirty[0]; var setLineupDirty = _dirty[1];
  var _lastAutoGrid = useState(null);
  var lastAutoGrid = _lastAutoGrid[0]; var setLastAutoGrid = _lastAutoGrid[1];
  var _locked = useState(function() {
    var tid = loadJSON("ui:activeTeam", null);
    return tid ? (loadJSON("team:" + tid + ":locked", false) || false) : false;
  });
  var lineupLocked = _locked[0]; var setLineupLocked = _locked[1];
  var _cbi = useState(function() {
    var tid = localStorage.getItem("activeTeamId");
    if (!tid) return 0;
    return parseInt(loadJSON("team:" + tid + ":batterIndex", 0), 10) || 0;
  });
  var currentBatterIndex = _cbi[0]; var setCurrentBatterIndex = _cbi[1];
  var _gmi = useState(function() {
    var tid = localStorage.getItem("activeTeamId");
    if (!tid) return 0;
    return parseInt(loadJSON("team:" + tid + ":gameModeInning", 0), 10) || 0;
  });
  var gameModeInning = _gmi[0]; var setGameModeInning = _gmi[1];
  var _exitSheet = useState(false);
  var showExitSheet = _exitSheet[0]; var setShowExitSheet = _exitSheet[1];
  var _hydrating = useState(false);
  var isHydrating = _hydrating[0]; var setIsHydrating = _hydrating[1];
  var _nfn = useState(""); var newFirstName = _nfn[0]; var setNewFirstName = _nfn[1];
  var _nln = useState(""); var newLastName  = _nln[0]; var setNewLastName  = _nln[1];
  var _nbh = useState("U"); var newBattingHand = _nbh[0]; var setNewBattingHand = _nbh[1];
  var _showAddForm = useState(false);
  var showAddForm = _showAddForm[0]; var setShowAddForm = _showAddForm[1];
  var _summaryOpen = useState(true);
  var summaryOpen = _summaryOpen[0]; var setSummaryOpen = _summaryOpen[1];
  var _drag = useState(null);
  var dragPlayer = _drag[0]; var setDragPlayer = _drag[1];
  // Touch drag uses a mutable ref (window object) instead of useState to avoid
  // stale closure issues in onTouchMove handlers. useState captures the value
  // at render time; a ref always gives the current value.
  if (!window._bTouchDrag) { window._bTouchDrag = { active:false, name:null, startY:0, currentIdx:null }; }
  var _touchDragRe = useState(0); // integer version counter — increment to force re-render
  var touchDragVer = _touchDragRe[0]; var bumpTouchDrag = _touchDragRe[1];
  var touchDrag = window._bTouchDrag;
  function setTouchDrag(val) {
    window._bTouchDrag = val;
    bumpTouchDrag(function(v) { return v + 1; });
  }
  var _inlineScore = useState(null);
  var inlineScoreGame = _inlineScore[0]; var setInlineScoreGame = _inlineScore[1];
  var _col = useState({});
  var collapsed = _col[0]; var setCollapsed = _col[1];
  var _v2sec = useState({});
  var v2SectionOpen = _v2sec[0]; var setV2SectionOpen = _v2sec[1];
  var _vhOpen = useState({});
  var vhOpen = _vhOpen[0]; var setVhOpen = _vhOpen[1];
  var _hm = useState("welcome");
  var homeMode = _hm[0]; var setHomeMode = _hm[1];
  var _teamSearch = useState("");
  var teamSearch = _teamSearch[0]; var setTeamSearch = _teamSearch[1];
  var _nt = useState({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() });
  var _editingTeam = useState(null);
  var editingTeam = _editingTeam[0]; var setEditingTeam = _editingTeam[1];
  var newTeam = _nt[0]; var setNewTeam = _nt[1];
  var _share = useState(false);
  var showShare = _share[0]; var setShowShare = _share[1];
  var _sg = useState(null);
  var shareGame = _sg[0]; var setShareGame = _sg[1];
  var _import = useState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
  var importState = _import[0]; var setImportState = _import[1];
  var _printOpt = useState("both");
  var printOpt = _printOpt[0]; var setPrintOpt = _printOpt[1];
  var _printDefView = useState("grid");
  var printDefView = _printDefView[0]; var setPrintDefView = _printDefView[1];
  var _showShareSheet = useState(false);
  var showShareSheet = _showShareSheet[0]; var setShowShareSheet = _showShareSheet[1];
  var _viewOptsExpanded = useState(false);
  var viewOptsExpanded = _viewOptsExpanded[0]; var setViewOptsExpanded = _viewOptsExpanded[1];
  var _printDiamondInning = useState(null);
  var printDiamondInning = _printDiamondInning[0]; var setPrintDiamondInning = _printDiamondInning[1];
  var _pdfLoading = useState(false);
  var pdfLoading = _pdfLoading[0]; var setPdfLoading = _pdfLoading[1];
  var _pdfSharing = useState(false);
  var pdfSharing = _pdfSharing[0]; var setPdfSharing = _pdfSharing[1];
  var _recoverMode = useState(false);
  var recoverMode = _recoverMode[0]; var setRecoverMode = _recoverMode[1];
  var _openMenuTeamId = useState(null);
  var openMenuTeamId = _openMenuTeamId[0]; var setOpenMenuTeamId = _openMenuTeamId[1];
  var _snapshots = useState([]);
  var snapshots = _snapshots[0]; var setSnapshots = _snapshots[1];
  var _restoreBanner = useState('');
  var restoreBanner = _restoreBanner[0]; var setRestoreBanner = _restoreBanner[1];
  var _coachPin = useState(function() {
    var tid = loadJSON("ui:activeTeam", null);
    return tid ? (loadJSON("team:" + tid + ":pin", "") || "") : "";
  });
  var coachPin = _coachPin[0]; var setCoachPin = _coachPin[1];
  var _pinSession = useState(false);
  var pinSessionUnlocked = _pinSession[0]; var setPinSessionUnlocked = _pinSession[1];
  var _pinModal = useState(null);
  var pinModal = _pinModal[0]; var setPinModal = _pinModal[1];
  var _lockFlowOpen = useState(false);
  var lockFlowOpen = _lockFlowOpen[0]; var setLockFlowOpen = _lockFlowOpen[1];
  var _pinInput = useState(""); var pinInput = _pinInput[0]; var setPinInput = _pinInput[1];
  var _pinError = useState(""); var pinError = _pinError[0]; var setPinError = _pinError[1];
  var _pinConfirm = useState(""); var pinConfirm = _pinConfirm[0]; var setPinConfirm = _pinConfirm[1];

  // ── Attendance overrides — keyed by ISO date ──────────────────────────────
  var _attendanceOverrides = useState(function() {
    try { return JSON.parse(localStorage.getItem('attendanceOverrides') || '{}'); } catch(e) { return {}; }
  });
  var attendanceOverrides = _attendanceOverrides[0]; var setAttendanceOverrides = _attendanceOverrides[1];
  var _attendancePanelOpen = useState(null); // null = auto (open when any absent)
  var attendancePanelOpen = _attendancePanelOpen[0]; var setAttendancePanelOpen = _attendancePanelOpen[1];
  var _attendanceSyncing = useState(false);
  var attendanceSyncing = _attendanceSyncing[0]; var setAttendanceSyncing = _attendanceSyncing[1];
  var _attendanceSyncMsg = useState('');
  var attendanceSyncMsg = _attendanceSyncMsg[0]; var setAttendanceSyncMsg = _attendanceSyncMsg[1];
  // Derived: today's absent list (auto-clears each calendar day since key is YYYY-MM-DD)
  var _td = new Date();
  var todayDate = _td.getFullYear() + '-'
    + String(_td.getMonth() + 1).padStart(2, '0') + '-'
    + String(_td.getDate()).padStart(2, '0');
  var absentTonight = attendanceOverrides[todayDate] || [];
  var activeBattingOrder = battingOrder.filter(function(name) {
    return absentTonight.indexOf(name) < 0;
  });

  useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    }
  });
  var needRefresh = false;
  var setNeedRefresh = function() {};

  // Standalone: true when running as installed PWA (no browser chrome)
  var isStandalone = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(display-mode: standalone)").matches
    : false;

  // Landscape: style-only modifier — same layout, tighter spacing + more grid room
  var _landscape = useState(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(orientation: landscape)").matches
      : false
  );
  var isLandscape = _landscape[0]; var setIsLandscape = _landscape[1];
  if (typeof window !== "undefined" && window.matchMedia && !window._lineupOrientSet) {
    window._lineupOrientSet = true;
    var _mql = window.matchMedia("(orientation: landscape)");
    var _orientFn = function(e) { setIsLandscape(e.matches); };
    if (_mql.addEventListener) { _mql.addEventListener("change", _orientFn); }
    else if (_mql.addListener) { _mql.addListener(_orientFn); }
  }

  var _printNotes = useState("");
  var printNotes = _printNotes[0]; var setPrintNotes = _printNotes[1];
  var _songsView = useState("display");
  var songsView = _songsView[0]; var setSongsView = _songsView[1];
  var _newGame = useState({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{}, snackDuty:"", gameBall:[], gameBallSearch:"", scoreReported:false });
  var newGame = _newGame[0]; var setNewGame = _newGame[1];
  var _editGame = useState(null);
  var editingGame = _editGame[0]; var setEditingGame = _editGame[1];
  var _showGame = useState(false);
  var showGameForm = _showGame[0]; var setShowGameForm = _showGame[1];
  var _importMode = useState(null);
  var importMode = _importMode[0]; var setImportMode = _importMode[1];
  var _resultImport = useState({ gameId:null, loading:false, error:"" });
  var resultImport = _resultImport[0]; var setResultImport = _resultImport[1];
  var _gridView = useState("player");
  var gridView = _gridView[0]; var setGridView = _gridView[1];
  var _issuesPanelOpen = useState(false);
  var issuesPanelOpen = _issuesPanelOpen[0]; var setIssuesPanelOpen = _issuesPanelOpen[1];
  // Next game date — used as localStorage key so ignored warnings auto-clear each game
  var nextGameDate = (function() {
    var today = new Date(); today.setHours(0,0,0,0);
    var up = schedule.filter(function(g) { return !g.result && g.date && new Date(g.date+"T12:00:00") >= today; });
    up.sort(function(a,b) { return new Date(a.date) - new Date(b.date); });
    return up.length ? up[0].date : "nodate";
  })();
  // Ignored warnings — keyed by `${type}::${msg}`, persisted per game date
  var _ignoredWarnings = useState(function() {
    try {
      var key = "ignoredWarnings_" + nextGameDate;
      var stored = localStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch(e) { return new Set(); }
  });
  var ignoredWarnings = _ignoredWarnings[0]; var setIgnoredWarnings = _ignoredWarnings[1];
  var _diamondInning = useState(null);
  var diamondInning = _diamondInning[0]; var setDiamondInning = _diamondInning[1];
  var _showDiamond = useState(false);
  var showDiamond = _showDiamond[0]; var setShowDiamond = _showDiamond[1];
  var _newPrac = useState({ date:"", duration:"", focus:"Mixed", attendance:{}, drills:[], notes:"" });
  var newPrac = _newPrac[0]; var setNewPrac = _newPrac[1];
  var _showPrac = useState(false);
  var showPracForm = _showPrac[0]; var setShowPracForm = _showPrac[1];
  var _editPrac = useState(null);
  var editingPrac = _editPrac[0]; var setEditingPrac = _editPrac[1];

  var _fbCategory = useState("General");
  var fbCategory = _fbCategory[0]; var setFbCategory = _fbCategory[1];
  var _fbBody = useState("");
  var fbBody = _fbBody[0]; var setFbBody = _fbBody[1];
  var _fbChangeTypes = useState([]);
  var fbChangeTypes = _fbChangeTypes[0]; var setFbChangeTypes = _fbChangeTypes[1];
  var _fbConfirm = useState("");
  var fbConfirm = _fbConfirm[0]; var setFbConfirm = _fbConfirm[1];
  var _bugLocation = useState("");
  var bugLocation = _bugLocation[0]; var setBugLocation = _bugLocation[1];
  var _bugBody = useState("");
  var bugBody = _bugBody[0]; var setBugBody = _bugBody[1];
  var _bugSeverity = useState("");
  var bugSeverity = _bugSeverity[0]; var setBugSeverity = _bugSeverity[1];
  var _bugConfirm = useState("");
  var bugConfirm = _bugConfirm[0]; var setBugConfirm = _bugConfirm[1];
  var _fbHistoryOpen = useState(false);
  var fbHistoryOpen = _fbHistoryOpen[0]; var setFbHistoryOpen = _fbHistoryOpen[1];
  var _showOnboarding = useState(false);
  var showOnboarding = _showOnboarding[0]; var setShowOnboarding = _showOnboarding[1];
  var _aboutGuideOpen = useState(true);
  var aboutGuideOpen = _aboutGuideOpen[0]; var setAboutGuideOpen = _aboutGuideOpen[1];
  var _expandedVersion = useState(APP_VERSION);
  var expandedVersion = _expandedVersion[0]; var setExpandedVersion = _expandedVersion[1];
  var _showInstallBanner = useState(false);
  var showInstallBanner = _showInstallBanner[0]; var setShowInstallBanner = _showInstallBanner[1];
  var _deferredPrompt = useState(null);
  var deferredPrompt = _deferredPrompt[0]; var setDeferredPrompt = _deferredPrompt[1];
  var isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  var warnings = useMemo(function() { return validateGrid(grid, roster, innings); }, [grid, roster, innings]);

  // Stable key per warning — type+msg is unique since msg embeds player/inning context
  var warnKey = function(w) { return w.type + "::" + w.msg; };

  var activeWarnings = warnings.filter(function(w) { return !ignoredWarnings.has(warnKey(w)); });
  var ignoredList    = warnings.filter(function(w) {  return ignoredWarnings.has(warnKey(w)); });
  var errorCount = activeWarnings.length;

  var ignoreWarning = function(w) {
    setIgnoredWarnings(function(prev) {
      var next = new Set(prev);
      next.add(warnKey(w));
      try { localStorage.setItem("ignoredWarnings_" + nextGameDate, JSON.stringify([...next])); } catch(e) {}
      return next;
    });
  };

  var ignoreAllWarnings = function() {
    setIgnoredWarnings(function(prev) {
      var next = new Set(prev);
      warnings.forEach(function(w) { next.add(warnKey(w)); });
      try { localStorage.setItem("ignoredWarnings_" + nextGameDate, JSON.stringify([...next])); } catch(e) {}
      return next;
    });
  };

  var restoreWarning = function(w) {
    setIgnoredWarnings(function(prev) {
      var next = new Set(prev);
      next.delete(warnKey(w));
      try { localStorage.setItem("ignoredWarnings_" + nextGameDate, JSON.stringify([...next])); } catch(e) {}
      return next;
    });
  };

  var restoreAllWarnings = function() {
    setIgnoredWarnings(new Set());
    try { localStorage.removeItem("ignoredWarnings_" + nextGameDate); } catch(e) {}
  };
  var players = roster.map(function(r) { return r.name; });

  var activeTeam = null;
  for (var _ti = 0; _ti < teams.length; _ti++) {
    if (teams[_ti].id === activeTeamId) { activeTeam = teams[_ti]; break; }
  }

  // --- Persistence helpers ---
  function persistRoster(next) {
    window._lastLocalWrite = Date.now();
    setRosterHistory(function(hist) {
      var h = hist.slice(-19); h.push(roster); return h;
    });
    setRoster(next);
    setLineupDirty(true);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":roster", next);
      if (next.length > 0) {
        dbSync(function() { return dbSaveTeamData(activeTeamId, {
          roster: next, schedule: schedule, practices: practices,
          battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
        }); });
      }
    }
  }

  function undoRoster() {
    window._lastLocalWrite = Date.now();
    setRosterHistory(function(hist) {
      if (hist.length === 0) { return hist; }
      var prev = hist[hist.length - 1];
      var next = hist.slice(0, -1);
      setRoster(prev);
      setLineupDirty(true);
      if (activeTeamId) {
        saveJSON("team:" + activeTeamId + ":roster", prev);
        dbSync(function() { return dbSaveTeamData(activeTeamId, {
          roster: prev, schedule: schedule, practices: practices,
          battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
        }); });
      }
      return next;
    });
  }

  function persistAttendance(overrides) {
    window._lastLocalWrite = Date.now();
    // Prune entries older than 3 days
    var cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    var pruned = {};
    var keys = Object.keys(overrides);
    for (var _ai = 0; _ai < keys.length; _ai++) {
      if (keys[_ai] >= cutoff) { pruned[keys[_ai]] = overrides[keys[_ai]]; }
    }
    setAttendanceOverrides(pruned);
    localStorage.setItem('attendanceOverrides', JSON.stringify(pruned));
    if (activeTeamId) {
      var _pruned = pruned;
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked,
        attendanceOverrides: _pruned
      }); });
    }
  }

  function toggleAbsentTonight(playerName) {
    var updated = absentTonight.indexOf(playerName) >= 0
      ? absentTonight.filter(function(n) { return n !== playerName; })
      : absentTonight.concat([playerName]);
    var newOverrides = Object.assign({}, attendanceOverrides);
    newOverrides[todayDate] = updated;
    persistAttendance(newOverrides);
  }

  async function syncAttendance() {
    if (!activeTeamId || !isSupabaseEnabled) return;
    setAttendanceSyncing(true);
    try {
      var dbData = await dbLoadTeamData(activeTeamId);
      if (dbData && dbData.attendanceOverrides && Object.keys(dbData.attendanceOverrides).length > 0) {
        setAttendanceOverrides(dbData.attendanceOverrides);
        localStorage.setItem('attendanceOverrides', JSON.stringify(dbData.attendanceOverrides));
      }
      setAttendanceSyncMsg('✓ Synced');
      setTimeout(function() { setAttendanceSyncMsg(''); }, 1500);
    } catch(e) {
      setAttendanceSyncMsg('Sync failed');
      setTimeout(function() { setAttendanceSyncMsg(''); }, 1500);
    }
    setAttendanceSyncing(false);
  }

  function persistSchedule(next) {
    window._lastLocalWrite = Date.now();
    setSchedule(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":schedule", next);
      // Always write to Supabase — the lastWrite > loadTimestamp guard in loadTeam hydration
      // already handles the race condition, so the isHydrating guard here is redundant
      // and causes snackDuty/gameBall/scoreReported to silently miss Supabase.
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: next, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  // Shared by both renderSnackDuty and renderSchedule — snack data lives on game objects
  function updateSnackField(gameId, field, value) {
    var next = schedule.map(function(g) {
      if (g.id !== gameId) return g;
      var updated = Object.assign({}, g);
      if (field === "playerName") updated.snackDuty = value;
      else if (field === "note") updated.snackNote = value;
      else if (field === "gameBall") updated.gameBall = value;
      return updated;
    });
    persistSchedule(next);
  }

  function clearSnackAssignment(gameId) {
    var next = schedule.map(function(g) {
      if (g.id !== gameId) return g;
      return Object.assign({}, g, { snackDuty: "", snackNote: "" });
    });
    persistSchedule(next);
  }

  function persistPractices(next) {
    window._lastLocalWrite = Date.now();
    setPractices(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":practices", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: next,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistBatting(next) {
    window._lastLocalWrite = Date.now();
    setBattingOrder(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":batting", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: next, grid: grid, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function persistGrid(next) {
    window._lastLocalWrite = Date.now();
    setGrid(next);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":grid", next);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: next, innings: innings, locked: lineupLocked
      }); });
    }
  }

  function gameModeSwap(inningIdx, playerAName, playerBName) {
    if (!playerAName || !playerBName || playerAName === playerBName) return;
    var ng = {};
    for (var k in grid) { ng[k] = grid[k].slice(); }
    var posA = ng[playerAName] ? ng[playerAName][inningIdx] : "";
    var posB = ng[playerBName] ? ng[playerBName][inningIdx] : "";
    if (ng[playerAName]) ng[playerAName][inningIdx] = posB || "";
    if (ng[playerBName]) ng[playerBName][inningIdx] = posA || "";
    persistGrid(ng);
  }

  function persistInnings(n) {
    window._lastLocalWrite = Date.now();
    setInnings(n);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":innings", n);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: n, locked: lineupLocked
      }); });
    }
  }

  function persistCurrentBatterIndex(idx) {
    setCurrentBatterIndex(idx);
    if (activeTeamId) { saveJSON("team:" + activeTeamId + ":batterIndex", idx); }
  }

  function persistGameModeInning(inn) {
    setGameModeInning(inn);
    if (activeTeamId) { saveJSON("team:" + activeTeamId + ":gameModeInning", inn); }
  }

  function persistLineupLocked(val) {
    window._lastLocalWrite = Date.now();
    setLineupLocked(val);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":locked", val);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: val
      }); });
    }
    if (val) {
      track("finalize_lineup", { roster_size: roster.length, innings: innings });
      track("lineup_locked", { team_id: activeTeamId, roster_size: roster.length, innings: innings, inning_count: innings });
      vaTrack("lineup_finalized");
    } else {
      track("lineup_unlocked", { team_id: activeTeamId, innings_since_lock: 0 });
    }
  }

  function persistCoachPin(val) {
    setCoachPin(val);
    if (activeTeamId) {
      saveJSON("team:" + activeTeamId + ":pin", val);
      dbSync(function() { return dbSaveTeamData(activeTeamId, {
        roster: roster, schedule: schedule, practices: practices,
        battingOrder: battingOrder, grid: grid, innings: innings, locked: lineupLocked, coachPin: val
      }); });
    }
  }

  function generateShareId() {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var id = "";
    for (var i = 0; i < 8; i++) { id += chars[Math.floor(Math.random() * chars.length)]; }
    return id;
  }

  function shareCurrentLineup() {
    var shareMethod = navigator.canShare ? "native_share_sheet" : "copy_to_clipboard";
    track("share_link", {
      team_id: activeTeamId,
      method: shareMethod,
      has_game_id: false,
      share_type: "lineup_view"
    });
    var payload = {
      team:    activeTeam ? activeTeam.name + (activeTeam.ageGroup ? " " + activeTeam.ageGroup : "") : "Lineup",
      game:    null,
      grid:    grid,
      batting: activeBattingOrder,
      roster:  roster.filter(function(r) { return absentTonight.indexOf(r.name) < 0; }).map(function(r) { return r.name; }),
      absentNames: absentTonight.length > 0 ? absentTonight.slice() : undefined,
      songs:   (function() {
        var s = {};
        roster.forEach(function(p) {
          if (p.walkUpSong || p.walkUpArtist) {
            s[p.name] = { song: p.walkUpSong || null, artist: p.walkUpArtist || null, start: p.walkUpStart || null, end: p.walkUpEnd || null };
          }
        });
        return s;
      })()
    };
    var base = window.location.href.split("?")[0];
    var url;
    if (isSupabaseEnabled) {
      var id = generateShareId();
      dbSaveShareLink(id, payload);
      url = base + "?s=" + id;
    } else {
      // Local dev fallback — embed payload in URL via base64
      try { url = base + "?share=" + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }
      catch(e) { url = base; }
    }
    if (navigator.share) {
      navigator.share({ title:(activeTeam ? activeTeam.name : "Lineup") + " — Game Day Lineup", url:url })
        .catch(function(e) { if (e.name !== "AbortError") { copyToClipboard(url); } });
    } else {
      copyToClipboard(url);
    }
  }

  function shareViewerLink() {
    track("share_viewer_link", {});
    var payload = {
      team:    activeTeam ? activeTeam.name + (activeTeam.ageGroup ? " " + activeTeam.ageGroup : "") : "Lineup",
      game:    null,
      grid:    grid,
      batting: activeBattingOrder,
      roster:  roster.filter(function(r) { return absentTonight.indexOf(r.name) < 0; }).map(function(r) { return r.name; }),
      absentNames: absentTonight.length > 0 ? absentTonight.slice() : undefined,
      songs:   {}
    };
    var base = window.location.href.split("?")[0];
    var url;
    if (isSupabaseEnabled) {
      var id = generateShareId();
      dbSaveShareLink(id, payload);
      url = base + "?s=" + id + "&view=true";
    } else {
      // Local dev fallback — embed payload in URL via base64
      try { url = base + "?share=" + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) + "&view=true"; }
      catch(e) { url = base + "?view=true"; }
    }
    if (navigator.share) {
      navigator.share({ title:(activeTeam ? activeTeam.name : "Lineup") + " — Game Day Lineup", url:url })
        .catch(function(e) { if (e.name !== "AbortError") { copyToClipboard(url); } });
    } else {
      copyToClipboard(url);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        alert("Lineup link copied to clipboard!");
      }).catch(function() { promptCopy(text); });
    } else {
      promptCopy(text);
    }
  }

  function promptCopy(text) {
    var box = prompt("Copy this link:", text);
  }

  function exportTeamData(teamObj) {
    var t = teamObj || activeTeam;
    if (!t) { return; }
    var tid = t.id;
    var isActive = tid === activeTeamId;
    var payload = {
      exportedAt:  new Date().toISOString(),
      appVersion:  "1.0",
      team:        t,
      roster:      isActive ? roster       : loadJSON("team:" + tid + ":roster",    []),
      schedule:    isActive ? schedule     : loadJSON("team:" + tid + ":schedule",  []),
      practices:   isActive ? practices    : loadJSON("team:" + tid + ":practices", []),
      battingOrder:isActive ? battingOrder : loadJSON("team:" + tid + ":batting",   []),
      grid:        isActive ? grid         : loadJSON("team:" + tid + ":grid",      {}),
      innings:     isActive ? innings      : loadJSON("team:" + tid + ":innings",   6),
      locked:      isActive ? lineupLocked : loadJSON("team:" + tid + ":locked",    false),
      coachPin:    isActive ? coachPin     : loadJSON("team:" + tid + ":pin",       "")
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type:"application/json" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href   = url;
    a.download = (t.name || "team").replace(/[^a-z0-9]/gi,"-").toLowerCase()
                 + "-backup-" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importTeamData(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.team || !data.roster) { alert("Invalid backup file."); return; }
        // Restore all team data
        if (!confirm("This will overwrite current data for " + (data.team.name || "this team") + ". Continue?")) { return; }
        var tid = activeTeamId || data.team.id;
        saveJSON("team:" + tid + ":roster",    data.roster || []);
        saveJSON("team:" + tid + ":schedule",  data.schedule || []);
        saveJSON("team:" + tid + ":practices", data.practices || []);
        saveJSON("team:" + tid + ":batting",   data.battingOrder || []);
        saveJSON("team:" + tid + ":grid",      data.grid || {});
        saveJSON("team:" + tid + ":innings",   data.innings || 6);
        saveJSON("team:" + tid + ":locked",    data.locked  || false);
        if (data.coachPin !== undefined) { saveJSON("team:" + tid + ":pin", data.coachPin || ""); }
        // Reload the team from storage
        if (activeTeam) {
          var t = {}; for (var k in activeTeam) { t[k] = activeTeam[k]; }
          loadTeam(t);
        }
        alert("Backup restored successfully.");
      } catch (err) {
        alert("Could not read backup file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- Team management ---
  function loadTeam(team) {
    var r = migrateRoster(loadJSON("team:" + team.id + ":roster", []));
    var s = migrateBattingPerf(
      migrateSchedule(loadJSON("team:" + team.id + ":schedule", [])),
      r
    );
    var p = loadJSON("team:" + team.id + ":practices", []);
    var b = loadJSON("team:" + team.id + ":batting", r.map(function(x) { return x.name; }));
    var savedInnings   = loadJSON("team:" + team.id + ":innings",   6)    || 6;
    var savedGrid      = migrateGrid(loadJSON("team:" + team.id + ":grid", null), r, savedInnings);
    var savedLocked    = loadJSON("team:" + team.id + ":locked",    false) || false;
    var savedPin       = loadJSON("team:" + team.id + ":pin",       "")    || "";

    var savedBatterIndex    = parseInt(loadJSON("team:" + team.id + ":batterIndex",    0), 10) || 0;
    var savedGameModeInning = parseInt(loadJSON("team:" + team.id + ":gameModeInning", 0), 10) || 0;

    setActiveTeamId(team.id);
    saveJSON("ui:activeTeam", team.id);
    setRoster(r);
    setRosterHistory([]);
    if (isSupabaseEnabled) { setIsHydrating(true); }
    setBattingOrder(b);
    setSchedule(s);
    setPractices(p);
    setGrid(savedGrid || initGrid(r, savedInnings));
    setInnings(savedInnings);
    setLineupDirty(false);
    setLineupLocked(savedLocked);
    setCoachPin(savedPin);
    var _savedAttendance = {};
    try { _savedAttendance = JSON.parse(localStorage.getItem('attendanceOverrides') || '{}'); } catch(e) {}
    setAttendanceOverrides(_savedAttendance);
    setPinSessionUnlocked(false);
    setCurrentBatterIndex(savedBatterIndex);
    setGameModeInning(savedGameModeInning);
    setPrimaryTab("team");
    setTeamSubTab("roster");
    setScreen("app");
    track("load_team", { team_id: team.id, team_name: team.name });
    mixpanel.identify(team.id);
    var coachName = user && user.profile && user.profile.first_name ? user.profile.first_name : null;
    try { if (coachName) { mixpanel.alias(coachName + "_" + team.id); } } catch(e) {}
    mixpanel.people.set({
      $name: coachName || team.name,
      coach_name: coachName || null,
      team_id: team.id,
      team_name: team.name,
      age_group: team.ageGroup || "unknown",
      roster_size: r.length,
      app_version: APP_VERSION,
      role: team.role || "team_admin",
      team_count: teams.length,
      is_pwa: deviceContext.is_pwa,
      platform: deviceContext.platform,
      device_os: deviceContext.device_os
    });

    if (isSupabaseEnabled) {
      var loadTimestamp = Date.now();
      dbLoadTeamData(team.id).then(function(dbData) {
        if (!dbData) { setIsHydrating(false); return; }
        // Only hydrate if no local changes have been made since
        // this load was triggered (prevents overwriting coach edits)
        // We detect this by comparing the load timestamp against
        // window._lastLocalWrite which is set by every persist call
        var lastWrite = window._lastLocalWrite || 0;
        if (lastWrite > loadTimestamp) { setIsHydrating(false); return; }
        if (!dbData.roster || dbData.roster.length === 0) { setIsHydrating(false); return; }
        // Read local schedule before Supabase data overwrites it — needed to preserve
        // locally-set flags (scoreReported) that may not have synced to Supabase yet
        var localSchedBeforeHydrate = loadJSON("team:" + team.id + ":schedule", []);
        saveJSON("team:" + team.id + ":roster",    dbData.roster);
        saveJSON("team:" + team.id + ":schedule",  Array.isArray(dbData.schedule) ? dbData.schedule : []);
        saveJSON("team:" + team.id + ":practices", dbData.practices);
        saveJSON("team:" + team.id + ":batting",   dbData.battingOrder);
        saveJSON("team:" + team.id + ":grid",      dbData.grid);
        saveJSON("team:" + team.id + ":innings",   dbData.innings);
        saveJSON("team:" + team.id + ":locked",     dbData.locked);
        saveJSON("team:" + team.id + ":pin",        dbData.coachPin || "");
        setRoster(migrateRoster(dbData.roster));
        if (dbData.roster && dbData.roster.length > 0) { dbSnapshotRoster(team.id, team.name, dbData.roster, 'app_load'); }
        var migratedDbSchedule = migrateBattingPerf(migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []), migrateRoster(dbData.roster));
        // Merge locally-set fields that Supabase may not have (set during hydration window)
        var mergedSchedule = mergeLocalScheduleFields(migratedDbSchedule, localSchedBeforeHydrate, MERGE_FIELDS);
        saveJSON("team:" + team.id + ":schedule", mergedSchedule);
        setSchedule(mergedSchedule);
        // Backfill Supabase if any fields were rescued from localStorage
        var hasRestoredFields = mergedSchedule.some(function(g, idx) {
          var dbg = migratedDbSchedule[idx];
          return dbg && MERGE_FIELDS.some(function(f) { return g[f] && !dbg[f]; });
        });
        if (hasRestoredFields) {
          dbSaveTeamData(team.id, {
            roster: dbData.roster, schedule: mergedSchedule, practices: dbData.practices,
            battingOrder: dbData.battingOrder, grid: dbData.grid,
            innings: dbData.innings, locked: dbData.locked
          }).catch(function() {});
        }
        setPractices(dbData.practices);
        setBattingOrder(dbData.battingOrder && dbData.battingOrder.length
          ? dbData.battingOrder
          : dbData.roster.map(function(x) { return x.name; }));
        setGrid(migrateGrid(dbData.grid, dbData.roster, dbData.innings));
        setInnings(dbData.innings);
        setLineupLocked(dbData.locked);
        setCoachPin(dbData.coachPin || "");
        if (dbData.attendanceOverrides && Object.keys(dbData.attendanceOverrides).length > 0) {
          setAttendanceOverrides(dbData.attendanceOverrides);
          localStorage.setItem('attendanceOverrides', JSON.stringify(dbData.attendanceOverrides));
        }
        setIsHydrating(false);
      }).catch(function() { setIsHydrating(false); });
    }
  }

  // When absentTonight changes and a grid exists, mark absent players "Out"
  // in every inning immediately — without requiring a full re-auto-assign.
  useEffect(function() {
    if (!activeTeamId || absentTonight.length === 0) return;
    if (!grid || Object.keys(grid).length === 0) return;
    var changed = false;
    var newGrid = {};
    for (var _gk in grid) { newGrid[_gk] = grid[_gk].slice(); }
    for (var _abi = 0; _abi < absentTonight.length; _abi++) {
      var _nm = absentTonight[_abi];
      if (!newGrid[_nm]) continue;
      for (var _ii = 0; _ii < innings; _ii++) {
        if (newGrid[_nm][_ii] !== 'Out') { newGrid[_nm][_ii] = 'Out'; changed = true; }
      }
    }
    if (changed) { persistGrid(newGrid); }
  }, [absentTonight.join(','), activeTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  function createTeam() {
    if (!newTeam.name.trim()) { return; }
    var t = {
      id: Date.now() + "",
      name: newTeam.name.trim(),
      ageGroup: newTeam.ageGroup,
      year: newTeam.year,
      sport: newTeam.sport || "baseball"
    };
    var next = teams.concat([t]);
    setTeams(next);
    saveJSON("app:teams", next);
    track("create_team", { age_group: t.ageGroup || "" });
    dbSync(function() { return dbSaveTeams([t]); });
    setNewTeam({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() });
    loadTeam(t);
  }

  function loadDemoTeam() {
    // Don't create a second demo team if one already exists
    var existingDemo = teams.find(function(t) { return t.name === "Demo All-Stars"; });
    if (existingDemo) { loadTeam(existingDemo); return; }
    var tid = "demo_" + Date.now();
    var t = { id: tid, name: "Demo All-Stars", ageGroup: "10U", sport: "baseball", year: new Date().getFullYear() };

    var today = new Date();
    var fmtDate = function(d) { var x = new Date(d); return x.toISOString().slice(0, 10); };
    var addDays = function(n) { var x = new Date(today); x.setDate(today.getDate() + n); return x; };

    var demoRoster = [
      { firstName:"Jake",  lastName:"Martinez",  name:"Jake Martinez",  skills:["strongArm","gameAware"], tags:[], prefs:["P","SS"],  dislikes:["C"],  batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Mia",   lastName:"Chen",      name:"Mia Chen",       skills:["naturalCatcher"],        tags:[], prefs:["C","1B"],  dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Luca",  lastName:"Thompson",  name:"Luca Thompson",  skills:["developing"],            tags:[], prefs:["2B","3B"], dislikes:[],     batSkills:[], battingHand:"L", skipBench:false, outThisGame:false },
      { firstName:"Sofia", lastName:"Williams",  name:"Sofia Williams", skills:["goodGlove","hustles"],   tags:[], prefs:["SS","2B"], dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Owen",  lastName:"Davis",     name:"Owen Davis",     skills:["bigKid"],                tags:[], prefs:["1B","3B"], dislikes:["P"],  batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Lily",  lastName:"Rodriguez", name:"Lily Rodriguez", skills:["fastRunner"],            tags:[], prefs:["LC","CF"], dislikes:[],     batSkills:[], battingHand:"L", skipBench:false, outThisGame:false },
      { firstName:"Ethan", lastName:"Kim",       name:"Ethan Kim",      skills:["goodGlove","callsForBall"],tags:[],prefs:["CF","RC"],dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Chloe", lastName:"Johnson",   name:"Chloe Johnson",  skills:["developing"],            tags:[], prefs:["RF","LF"], dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Noah",  lastName:"Patel",     name:"Noah Patel",     skills:["accurateThrower"],       tags:[], prefs:["3B","SS"], dislikes:[],     batSkills:[], battingHand:"L", skipBench:false, outThisGame:false },
      { firstName:"Emma",  lastName:"Brown",     name:"Emma Brown",     skills:["developing"],            tags:[], prefs:["2B","1B"], dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Aiden", lastName:"Garcia",    name:"Aiden Garcia",   skills:["strongArm","highEnergy"],tags:[], prefs:["P","3B"],  dislikes:[],     batSkills:[], battingHand:"R", skipBench:false, outThisGame:false },
      { firstName:"Zoe",   lastName:"Wilson",    name:"Zoe Wilson",     skills:["developing"],            tags:[], prefs:["C","1B"],  dislikes:[],     batSkills:[], battingHand:"L", skipBench:false, outThisGame:false },
    ].map(function(p) {
      return Object.assign({
        reliability:"average", reaction:"average", armStrength:"average", ballType:"developing",
        knowsWhereToThrow:false, callsForBall:false, backsUpPlays:false, anticipatesPlays:false,
        contact:"medium", power:"low", swingDiscipline:"free_swinger",
        tracksBallWell:false, patientAtPlate:false, confidentHitter:false,
        speed:"average", runsThroughFirst:false, listensToCoaches:false, awareOnBases:false,
        effort:null, developmentFocus:"balanced", lastUpdated:null,
        walkUpSong:null, walkUpArtist:null, walkUpStart:null, walkUpEnd:null, walkUpNotes:null, walkUpLink:null,
      }, p);
    });

    var demoSchedule = [
      { id:"demo_g_1", date:fmtDate(addDays(-7)),  time:"10:00", location:"Riverside Park", opponent:"Tigers", result:"W", ourScore:"8", theirScore:"3", home:true,  snackDuty:"",           snackNote:"", gameBall:["Jake Martinez"], battingPerf:{} },
      { id:"demo_g_2", date:fmtDate(addDays(5)),   time:"10:00", location:"Memorial Field", opponent:"Sharks", result:"",  ourScore:"",  theirScore:"",  home:false, snackDuty:"Mia Chen",   snackNote:"", gameBall:"", battingPerf:{} },
      { id:"demo_g_3", date:fmtDate(addDays(19)),  time:"14:00", location:"Riverside Park", opponent:"Eagles", result:"",  ourScore:"",  theirScore:"",  home:true,  snackDuty:"",           snackNote:"", gameBall:"", battingPerf:{} },
    ];

    saveJSON("team:" + tid + ":roster",    demoRoster);
    saveJSON("team:" + tid + ":schedule",  demoSchedule);
    saveJSON("team:" + tid + ":practices", []);
    saveJSON("team:" + tid + ":batting",   demoRoster.map(function(p) { return p.name; }));
    saveJSON("team:" + tid + ":innings",   6);
    saveJSON("team:" + tid + ":locked",    false);

    var next = teams.concat([t]);
    setTeams(next);
    saveJSON("app:teams", next);
    loadTeam(t);
  }

  function saveTeamEdits() {
    if (!editingTeam || !editingTeam.name.trim()) { return; }
    var updated = teams.map(function(t) {
      if (t.id !== editingTeam.id) { return t; }
      return { id:t.id, name:editingTeam.name.trim(), ageGroup:editingTeam.ageGroup, sport:editingTeam.sport || "baseball", year:t.year };
    });
    setTeams(updated);
    saveJSON("app:teams", updated);
    dbSync(function() {
      var t = updated.find(function(x) { return x.id === editingTeam.id; });
      return t ? dbSaveTeams([t]) : Promise.resolve();
    });
    setEditingTeam(null);
  }

  function deleteTeam(id) {
    var next = teams.filter(function(t) { return t.id !== id; });
    setTeams(next);
    saveJSON("app:teams", next);
    dbSync(function() { return dbDeleteTeam(id); });
    if (activeTeamId === id) {
      saveJSON("ui:activeTeam", null);
      setActiveTeamId(null);
      setScreen("home"); setHomeMode("welcome");
    }
  }

  // --- Roster ---
  function addPlayer() {
    var fn = newFirstName.trim(); var ln = newLastName.trim();
    if (!fn || !ln) { return; }
    var capitalize = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var n = capitalize(fn) + " " + capitalize(ln);
    if (players.indexOf(n) >= 0) { return; }
    var p = {
      name: n, firstName: capitalize(fn), lastName: capitalize(ln),
      skills: ["developing"], tags: [], dislikes: [], prefs: [], batSkills: [],
      // V2 fielding
      reliability: "average", reaction: "average", armStrength: "average", ballType: "developing",
      knowsWhereToThrow: false, callsForBall: false, backsUpPlays: false, anticipatesPlays: false,
      // V2 batting
      contact: "medium", power: "low", swingDiscipline: "free_swinger",
      tracksBallWell: false, patientAtPlate: false, confidentHitter: false,
      // V2 base running
      speed: "average", runsThroughFirst: false, listensToCoaches: false, awareOnBases: false,
      // V2 effort & development
      effort: null, developmentFocus: "balanced",
      // Game-day constraints
      skipBench: false, outThisGame: false,
      lastUpdated: null,
      // Walk-up songs
      walkUpSong: null, walkUpArtist: null, walkUpStart: null, walkUpEnd: null, walkUpNotes: null, walkUpLink: null,
      // Batting hand
      battingHand: normalizeBattingHand(newBattingHand)
    };
    var next = roster.concat([p]);
    persistRoster(next);
    if (activeTeam && isSupabaseEnabled) { dbSnapshotRoster(activeTeam.id, activeTeam.name, next, 'auto_save'); }
    track("add_player", { roster_size: next.length });
    persistBatting(battingOrder.concat([n]));
    var ng = {};
    for (var k in grid) { ng[k] = grid[k].slice(); }
    var row = [];
    for (var i = 0; i < innings; i++) { row.push(""); }
    ng[n] = row;
    persistGrid(ng);
    setNewFirstName(""); setNewLastName(""); setNewBattingHand("U");
    setShowAddForm(false);
  }

  function removePlayer(name) {
    if (activeTeam && isSupabaseEnabled && roster.length > 0) { dbSnapshotRoster(activeTeam.id, activeTeam.name, roster, 'auto_save'); }
    persistRoster(roster.filter(function(r) { return r.name !== name; }));
    persistBatting(battingOrder.filter(function(p) { return p !== name; }));
    var ng = {};
    for (var k in grid) { if (k !== name) { ng[k] = grid[k].slice(); } }
    persistGrid(ng);
  }

  function updatePlayer(name, patch) {
    var next = roster.map(function(r) {
      if (r.name !== name) { return r; }
      var updated = {};
      for (var k in r) { updated[k] = r[k]; }
      for (var k2 in patch) { updated[k2] = patch[k2]; }
      updated.lastUpdated = new Date().toISOString();
      return updated;
    });
    persistRoster(next);
    if (activeTeam && isSupabaseEnabled) { dbSnapshotRoster(activeTeam.id, activeTeam.name, next, 'auto_save'); }
  }

  function isV2Open(playerName, section) {
    var key = playerName + "::" + section;
    if (key in v2SectionOpen) { return v2SectionOpen[key]; }
    return section === "Lineup Constraints";
  }
  function toggleV2Section(playerName, section) {
    var key = playerName + "::" + section;
    var next = {}; for (var k in v2SectionOpen) { next[k] = v2SectionOpen[k]; }
    next[key] = !isV2Open(playerName, section);
    setV2SectionOpen(next);
  }

  var handleInstallClick = async function() {
    if (!deferredPrompt) return;
    track("pwa_install_clicked", { platform: "android", prompt_ready: !!deferredPrompt });
    deferredPrompt.prompt();
    var result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      localStorage.setItem("pwa_installed", "1");
      track("pwa_install_accepted", { platform: "android" });
    } else {
      track("pwa_install_declined", { platform: "android" });
    }
    setDeferredPrompt(null);
  };

  function generateLineup() {
    // Build a temporary roster with absent-tonight players tagged.
    // Does NOT modify player.tags — the original roster state is unchanged.
    console.log('[DEBUG] absentTonight at generate time:', JSON.stringify(absentTonight), 'todayDate:', todayDate, 'attendanceOverrides:', JSON.stringify(attendanceOverrides));
    var rosterForGen = absentTonight.length === 0 ? roster : roster.map(function(p) {
      if (absentTonight.indexOf(p.name) < 0) { return p; }
      var tags = p.tags || [];
      if (tags.indexOf('absent') >= 0) { return p; }
      return Object.assign({}, p, { tags: tags.concat(['absent']) });
    });

    let result;

    try {
      if (FEATURE_FLAGS.USE_NEW_LINEUP_ENGINE) {
        console.log("[Lineup Engine] Using V2");
        result = generateLineupV2(rosterForGen, innings);
        if (result.battingOrder && result.battingOrder.length > 0) {
          persistBatting(result.battingOrder);
        }
      } else {
        console.log("[Lineup Engine] Using V1");
        result = autoAssignWithRetryFallback(rosterForGen, innings);
      }
    } catch (e) {
      console.error("[Lineup Engine] V2 failed — fallback to V1", e);
      result = autoAssignWithRetryFallback(rosterForGen, innings);
    }

    console.log("GRID STRUCTURE:", result.grid);

    // 🔒 DO NOT MODIFY BELOW (existing behavior)
    persistGrid(result.grid);
    setLastAutoGrid(result.grid);
    setLineupDirty(false);
    setPrimaryTab("gameday");
    setGameDayTab("lineups");
    persistCurrentBatterIndex(0);
    persistGameModeInning(0);

    track("auto_assign", {
      attempts: result.attempts || 1,
      warnings: (result.warnings || []).length,
      valid: result.isValid ? "yes" : "no",
      roster_size: roster.length,
      innings: innings
    });

    if (result.usedFallback || !result.isValid) {
      console.warn("[Lineup Engine]", result.explain);
    }
  }

  function handleDrop(target) {
    if (!dragPlayer || dragPlayer === target) { return; }
    var order = battingOrder.slice();
    var from = order.indexOf(dragPlayer);
    var to   = order.indexOf(target);
    order.splice(from, 1);
    order.splice(to, 0, dragPlayer);
    persistBatting(order);
    setBattingOrderDirty(true);
    setDragPlayer(null);
  }

  function moveBatter(name, dir) {
    var order = battingOrder.slice();
    var idx = order.indexOf(name);
    var next = idx + dir;
    if (next < 0 || next >= order.length) { return; }
    var tmp = order[idx];
    order[idx] = order[next];
    order[next] = tmp;
    persistBatting(order);
  }

  // --- Schedule helpers ---
  function saveGameForm() {
    if (!newGame.date || !newGame.opponent) { return; }
    var game = {};
    for (var k in newGame) { game[k] = newGame[k]; }
    if (editingGame) {
      game.id = editingGame.id;
      persistSchedule(schedule.map(function(g) { return g.id === editingGame.id ? game : g; }));
    } else {
      game.id = Date.now() + "";
      persistSchedule(schedule.concat([game]));
    }
    if (game.result) {
      track("game_result_logged", { team_id: activeTeamId, result: game.result });
    }
    setNewGame({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{}, snackDuty:"", gameBall:[], gameBallSearch:"", scoreReported:false });
    setShowGameForm(false);
    setEditingGame(null);
  }

  function deleteGame(id) {
    persistSchedule(schedule.filter(function(g) { return g.id !== id; }));
  }

  // --- Practice helpers ---
  function savePracForm() {
    if (!newPrac.date) { return; }
    var p = {};
    for (var k in newPrac) { p[k] = newPrac[k]; }
    if (editingPrac) {
      p.id = editingPrac.id;
      persistPractices(practices.map(function(x) { return x.id === editingPrac.id ? p : x; }));
    } else {
      p.id = Date.now() + "";
      persistPractices(practices.concat([p]));
    }
    setNewPrac({ date:"", duration:"", focus:"Mixed", attendance:{}, drills:[], notes:"" });
    setEditingPrac(null);
    setShowPracForm(false);
  }

  // --- Feedback helpers ---
  function submitFeedback() {
    if (!fbBody.trim()) { return; }
    var appVer = APP_VERSION;
    var entry = { id: Date.now() + "", category: fbCategory, body: fbBody.trim(), changeTypes: fbChangeTypes.slice(), timestamp: Date.now(), appVersion: appVer };
    var existing = [];
    try { existing = loadJSON("feedback:submissions", []); } catch(e) {}
    try { saveJSON("feedback:submissions", existing.concat([entry])); } catch(e) {}
    (async function() {
      try {
        var BACKEND = "https://lineup-generator-backend.onrender.com";
        var sessionRes = await supabase.auth.getSession();
        var token = sessionRes.data.session?.access_token;
        if (token) {
          await fetch(BACKEND + "/api/v1/feedback", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "feedback", category: entry.category, body: entry.body, changeTypes: entry.changeTypes, appVersion: entry.appVersion })
          });
        }
      } catch(e) { console.warn("[feedback] POST failed:", e.message); }
    })();
    setFbBody("");
    setFbChangeTypes([]);
    setFbCategory("General");
    setFbConfirm("Thanks! Your feedback has been saved.");
    setTimeout(function() { setFbConfirm(""); }, 2000);
  }

  function submitBug() {
    if (!bugBody.trim()) { return; }
    var appVer = APP_VERSION;
    var entry = { id: Date.now() + "", location: bugLocation, body: bugBody.trim(), severity: bugSeverity, timestamp: Date.now(), appVersion: appVer };
    var existing = [];
    try { existing = loadJSON("feedback:bugs", []); } catch(e) {}
    try { saveJSON("feedback:bugs", existing.concat([entry])); } catch(e) {}
    (async function() {
      try {
        var BACKEND = "https://lineup-generator-backend.onrender.com";
        var sessionRes = await supabase.auth.getSession();
        var token = sessionRes.data.session?.access_token;
        if (token) {
          await fetch(BACKEND + "/api/v1/feedback", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "bug", location: entry.location, body: entry.body, severity: entry.severity, appVersion: entry.appVersion })
          });
        }
      } catch(e) { console.warn("[feedback] POST failed:", e.message); }
    })();
    setBugBody("");
    setBugLocation("");
    setBugSeverity("");
    setBugConfirm("Issue reported. Thank you!");
    setTimeout(function() { setBugConfirm(""); }, 2000);
  }

  // --- AI schedule parser ---

  // Resize an image file to max 1600px on longest edge before base64 encoding.
  // PDFs pass through unchanged. Uses only browser-native APIs (Canvas, Image, Blob).
  function resizeImage(file) {
    if (file.type === 'application/pdf') { return Promise.resolve(file); }
    return new Promise(function(resolve) {
      var MAX_EDGE = 1600;
      var origKb = Math.round(file.size / 1024);
      var img = new window.Image();
      var objectUrl = URL.createObjectURL(file);
      img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // fall through unchanged on decode error
      };
      img.onload = function() {
        URL.revokeObjectURL(objectUrl);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w <= MAX_EDGE && h <= MAX_EDGE) {
          console.log('[AI] Original: ' + origKb + 'kb — within 1600px, no resize');
          resolve(file);
          return;
        }
        var scale = MAX_EDGE / Math.max(w, h);
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(function(blob) {
          var resizedKb = Math.round(blob.size / 1024);
          console.log('[AI] Original: ' + origKb + 'kb → Resized: ' + resizedKb + 'kb (' + cw + 'x' + ch + ')');
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };
      img.src = objectUrl;
    });
  }

  function callAI(messages, signal) {
    var BACKEND = "https://lineup-generator-backend.onrender.com";
    var fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "schedule",
        systemPrompt: "You are a baseball schedule parser. Return ONLY a valid JSON array of game objects. Each object: { date:'YYYY-MM-DD', time:'HH:MM AM/PM', opponent:'Team Name', location:'Field', result:'', ourScore:'', theirScore:'', battingPerf:{} }. No markdown, no explanation. Empty array if no games found.",
        userContent: messages[0].content
      })
    };
    if (signal) { fetchOpts.signal = signal; }
    return fetch(BACKEND + "/api/ai", fetchOpts)
      .then(function(res) {
        if (!res.ok) {
          return res.json().catch(function() { return {}; }).then(function(b) {
            var e = new Error("Backend error " + res.status);
            e.code = b.error || "";
            throw e;
          });
        }
        return res.json();
      }).then(function(data) {
        var block = data.content && data.content.filter(function(b) { return b.type === "text"; })[0];
        var text = block ? block.text : "[]";
        var clean = text.replace(/^```[\w]*\n?/i, "").replace(/\n?```$/i, "").trim();
        return JSON.parse(clean);
      });
  }

  function parseGameResult(sourceType, sourceData, mediaType) {
    // sourceType: "image" | "pdf" | "text"
    // Parses a box score / game result and returns { result, ourScore, theirScore, battingPerf }
    var rosterNames = roster.map(function(r) { return r.name; }).join(", ");
    var systemPrompt = "You are a baseball box score parser. " +
      "Extract game result and individual batting stats. " +
      "Team name is " + teamName + ". Players to look for: " + rosterNames + ". " +
      "Return ONLY valid JSON with this structure: " +
      '{ "result": "W" or "L" or "T", "ourScore": "7", "theirScore": "3", ' +
      '"battingPerf": { "PlayerName": { "ab": 3, "h": 2, "r": 1, "rbi": 1, "bb": 0 } } }. ' +
      "Only include players you find stats for. No markdown, no explanation.";

    var userContent;
    if (sourceType === "image") {
      userContent = [
        { type:"image", source:{ type:"base64", media_type: mediaType || "image/png", data: sourceData } },
        { type:"text", text:"Parse this box score or game result image. Extract the final score and individual batting stats for " + teamName + " players." }
      ];
    } else if (sourceType === "pdf") {
      userContent = [
        { type:"document", source:{ type:"base64", media_type:"application/pdf", data: sourceData } },
        { type:"text", text:"Parse this box score or game result PDF. Extract the final score and individual batting stats for " + teamName + " players." }
      ];
    } else {
      userContent = "Parse this game result. Extract final score and batting stats for " + teamName + " players.\n\n" + sourceData;
    }

    var BACKEND = "https://lineup-generator-backend.onrender.com";
    var _ctrl = new AbortController();
    var _timeoutId = setTimeout(function() { _ctrl.abort(); }, 35000);
    return fetch(BACKEND + "/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: _ctrl.signal,
      body: JSON.stringify({
        type: "result",
        systemPrompt: systemPrompt,
        userContent: userContent
      })
    }).then(function(res) {
      clearTimeout(_timeoutId);
      if (!res.ok) {
        return res.json().catch(function() { return {}; }).then(function(b) {
          var e = new Error("Backend error " + res.status);
          e.code = b.error || "";
          throw e;
        });
      }
      return res.json();
    }).then(function(data) {
      var block = data.content && data.content.filter(function(b) { return b.type === "text"; })[0];
      var text = block ? block.text : "{}";
      var clean = text.replace(/^```[a-zA-Z0-9]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return JSON.parse(clean);
    });
  }

  function parseScheduleText(text) {
    setImportState({ mode:"text", text:text, image:null, loading:true, error:"", preview:[] });
    callAI([{ role:"user", content:"Extract all games. Team is " + (activeTeam ? activeTeam.name : "our team") + ". Year: " + new Date().getFullYear() + ".\n\n" + text }])
      .then(function(games) {
        var preview = games.map(function(g) {
          var gp = {}; for (var k in g) { gp[k] = g[k]; } gp.id = Date.now() + Math.random() + "";
          return gp;
        });
        track("import_schedule_text", { games_found: games.length });
        setImportState({ mode:"text", text:text, image:null, loading:false, error:"", preview:preview });
      })
      .catch(function() {
        setImportState({ mode:"text", text:text, image:null, loading:false, error:"Could not parse. Try again.", preview:[] });
      });
  }

  function parseScheduleImage(b64, mediaType) {
    setImportState({ mode:"image", text:"", image:{ b64:b64, mediaType:mediaType }, loading:true, error:"", preview:[] });
    var _ctrl = new AbortController();
    var _timeoutId = setTimeout(function() { _ctrl.abort(); }, 35000);
    callAI([{ role:"user", content:[
      { type:"image", source:{ type:"base64", media_type:mediaType, data:b64 } },
      { type:"text", text:"Extract all game schedule info. Team is " + (activeTeam ? activeTeam.name : "our team") + "." }
    ]}], _ctrl.signal)
      .then(function(games) {
        clearTimeout(_timeoutId);
        var preview = games.map(function(g) {
          var gp = {}; for (var k in g) { gp[k] = g[k]; } gp.id = Date.now() + Math.random() + "";
          return gp;
        });
        track("import_schedule_photo", { games_found: games.length });
        setImportState({ mode:"image", text:"", image:{ b64:b64, mediaType:mediaType }, loading:false, error:"", preview:preview });
      })
      .catch(function(err) {
        clearTimeout(_timeoutId);
        if (err && err.code === 'AI_NOT_CONFIGURED') {
          setImportState({ mode:"image", text:"", image:null, loading:false, error:"AI import is temporarily unavailable. Enter stats manually.", preview:[] });
        } else {
          setImportState({ mode:"image", text:"", image:null, loading:false, error:"Could not read image.", preview:[] });
        }
      });
  }

  function confirmImport() {
    persistSchedule(schedule.concat(importState.preview));
    setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
    setImportMode(null);
  }

  // handleImageFile removed - image import uses paste/drop inline


  // ============================================================
  // HOME SCREEN
  // ============================================================
  function renderHome() {
    var now = new Date();
    var etHour = new Date(now.toLocaleString("en-US", { timeZone:"America/New_York" })).getHours();
    var greeting = etHour >= 5 && etHour < 12 ? "Good morning"
      : etHour < 17 ? "Good afternoon"
      : etHour < 21 ? "Good evening"
      : "Good night";
    var firstName = user && user.profile && user.profile.first_name ? user.profile.first_name : null;

    function getNextGame(team) {
      var today = new Date(); today.setHours(0,0,0,0);
      // Use live state for active team, storage for others
      var sched = (team.id === activeTeamId) ? schedule : loadJSON("team:" + team.id + ":schedule", []);
      var upcoming = [];
      for (var i = 0; i < sched.length; i++) {
        var g = sched[i];
        if (!g.result && g.date) {
          var d = new Date(g.date + "T12:00:00");
          if (d >= today) { upcoming.push({ game:g, d:d }); }
        }
      }
      upcoming.sort(function(a,b) { return a.d - b.d; });
      if (!upcoming.length) { return null; }
      var days = Math.floor((upcoming[0].d - today) / 86400000);
      return { game: upcoming[0].game, days: days };
    }

    function getNextPractice(team) {
      var today = new Date(); today.setHours(0,0,0,0);
      var pracs = (team.id === activeTeamId) ? practices : loadJSON("team:" + team.id + ":practices", []);
      var upcoming = [];
      for (var i = 0; i < pracs.length; i++) {
        if (pracs[i].date) {
          var d = new Date(pracs[i].date + "T12:00:00");
          if (d >= today) { upcoming.push(d); }
        }
      }
      upcoming.sort(function(a,b) { return a-b; });
      if (!upcoming.length) { return null; }
      return Math.round((upcoming[0] - today) / 86400000);
    }

    // TODO: extract — deferred (TeamCard depends on getNextGame/getNextPractice inner functions and loadTeam handler — extract after renderHome is refactored)
    function TeamCard(props) {
      var team = props.team;

      // Show skeleton while Supabase is fetching this team's data for the first time.
      // Prevents the card from flashing "Missing roster" / no Game Mode button
      // for teams not yet visited on this device.
      var isPendingHydration = isSupabaseEnabled
        && team.id !== activeTeamId
        && !hydratedTeamIds[team.id];

      if (isPendingHydration) {
        return (
          <div style={{ background:"#fafafa", border:"1px solid rgba(0,0,0,0.07)", borderRadius:"10px",
            padding:"12px 14px", marginBottom:"8px", opacity:0.55 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontWeight:"bold", fontSize:"15px", color:"#0f1f3d", fontFamily:"Georgia,serif",
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{team.name}</div>
                <div style={{ marginTop:"6px", height:"10px", width:"72px", borderRadius:"4px",
                  background:"rgba(0,0,0,0.08)" }} />
              </div>
              <button onClick={function(e) { e.stopPropagation(); loadTeam(team); }}
                style={{ background:"linear-gradient(135deg,#f5c842,#e6a817)", color:"#0f1f3d",
                  border:"none", borderRadius:"8px", padding:"6px 14px", fontSize:"12px",
                  fontWeight:"bold", cursor:"pointer", whiteSpace:"nowrap" }}>
                Open
              </button>
            </div>
          </div>
        );
      }

      // For the active team, use live React state for accurate counts.
      // For other teams, read from storage.
      var teamRoster, teamSched;
      if (team.id === activeTeamId) {
        teamRoster = roster;
        teamSched  = schedule;
      } else {
        teamRoster = loadJSON("team:" + team.id + ":roster", []);
        teamSched  = loadJSON("team:" + team.id + ":schedule", []);
      }
      var wins = 0; var losses = 0; var played = 0;
      for (var i = 0; i < teamSched.length; i++) {
        if (teamSched[i].result === "W") { wins++; played++; }
        else if (teamSched[i].result === "L") { losses++; played++; }
        else if (teamSched[i].result === "T") { played++; }
        // result "X" = canceled, not counted
      }
      var remaining = teamSched.length - played;
      var nextGame     = getNextGame(team);
      var nextPracDays = getNextPractice(team);
      var hasRoster    = teamRoster.length > 0;
      var hasSched     = teamSched.length > 0;

      var alertText = null;
      var alertColor = "rgba(255,255,255,0.45)";
      if (nextGame && nextGame.days === 0) {
        alertText = "GAME DAY \u2022 vs " + nextGame.game.opponent + (nextGame.game.time ? " at " + nextGame.game.time : "");
        alertColor = "#c8102e";
      } else if (nextGame && nextGame.days === 1) {
        alertText = "Game TOMORROW \u2022 vs " + nextGame.game.opponent;
        alertColor = "#b8860b";
      } else if (nextGame) {
        var gameDate = new Date(nextGame.game.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
        alertText = "Next game " + gameDate + " \u2022 vs " + nextGame.game.opponent;
        alertColor = "#6b7280";
      }

      var statusBadge = null;
      var statusColor = null;
      if (teamRoster.length < 10) {
        statusBadge = "Missing roster";
        statusColor = "#b8860b";
      } else if (teamSched.length === 0) {
        statusBadge = "Missing Schedule";
        statusColor = "#6b7280";
      } else {
        statusBadge = "Ready";
        statusColor = "#2e7d32";
      }

      return (
        <div key={team.id} onClick={function() { loadTeam(team); }} style={{ background:"#fafafa", border:"1px solid rgba(0,0,0,0.07)", borderRadius:"10px", padding:"12px 14px", marginBottom:"8px", cursor:"pointer", boxShadow:"none", display:"flex", flexDirection:"column", gap:"8px" }}>
          {/* TOP ROW — Team info + Open + Ellipsis */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:"8px", alignItems:"start" }}>
            {/* ZONE 1 — Team info */}
            <div style={{ minWidth:0, overflow:"hidden" }}>
              <div style={{ fontSize:"15px", fontWeight:"bold", color:"#0f1f3d", fontFamily:"Georgia,serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {team.name}
                {team.ageGroup ? <span style={{ fontSize:"10px", color:"#6b7280", fontWeight:"normal", marginLeft:"6px" }}>{team.ageGroup}</span> : null}
              </div>
              {statusBadge === "Missing roster" ? (
                <button
                  onClick={function(e) { e.stopPropagation(); loadTeam(team); }}
                  style={{ display:"inline-flex", alignItems:"center", gap:"4px", fontSize:"10px", fontWeight:"bold",
                    letterSpacing:"0.05em", textTransform:"uppercase", color:"#92400e",
                    background:"rgba(180,83,9,0.08)", border:"1px solid rgba(180,83,9,0.35)",
                    borderRadius:"4px", padding:"2px 8px", marginTop:"4px", cursor:"pointer",
                    fontFamily:"inherit", lineHeight:"16px" }}>
                  <span style={{ display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", background:"#b45309", flexShrink:0 }} />
                  {teamRoster.length === 0 ? "Add Players →" : "Complete Roster (" + teamRoster.length + "/10) →"}
                </button>
              ) : (
                <span style={{ display:"inline-block", width:"120px", textAlign:"center", fontSize:"10px", fontWeight:"bold", letterSpacing:"0.06em", textTransform:"uppercase", color:statusColor, border:"1px solid " + statusColor, borderRadius:"4px", padding:"2px 6px", opacity:0.9, marginTop:"4px" }}>
                  <span style={{ display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", background:statusColor, marginRight:"4px", verticalAlign:"middle" }} />
                  {statusBadge}
                </span>
              )}
              {nextGame ? (
                <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {nextGame.days === 0 ? "Today" : nextGame.days === 1 ? "Tomorrow" : nextGame.days + " days"}{nextGame.game.opponent ? " \u00b7 vs " + nextGame.game.opponent : ""}
                </div>
              ) : null}
            </div>
            {/* ZONE 2 — Open button only */}
            <button onClick={function(e) { e.stopPropagation(); loadTeam(team); }}
              style={{ background:"linear-gradient(135deg,#f5c842,#e6a817)", color:"#0f1f3d",
                        border:"none", borderRadius:"8px", padding:"6px 14px", fontSize:"12px",
                        fontWeight:"bold", cursor:"pointer", whiteSpace:"nowrap" }}>
              Open
            </button>
            {/* ZONE 3 — Ellipsis */}
            <div style={{ position:"relative" }}>
            <button
              onClick={function(e) { e.stopPropagation(); setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id); }}
              style={{ padding:"8px 10px", borderRadius:"8px", border:"1px solid rgba(0,0,0,0.12)", cursor:"pointer", fontSize:"16px", fontFamily:"inherit", background:"transparent", color:"rgba(0,0,0,0.3)", lineHeight:1, letterSpacing:"1px" }}>
              ···
            </button>
            {openMenuTeamId === team.id && (
              <>
                <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:9998 }}
                     onClick={function(e) { e.stopPropagation(); setOpenMenuTeamId(null); }} />
                <div style={{ position:"absolute", top:"100%", right:0, marginTop:"4px", background:"#ffffff", border:"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", boxShadow:"0 4px 12px rgba(0,0,0,0.12)", zIndex:9999, minWidth:"168px", overflow:"hidden" }}
                     onClick={function(e) { e.stopPropagation(); }}>
                  <div style={{ padding:"10px 16px", cursor:"pointer", color:"#374151", fontSize:"13px", fontFamily:"inherit" }}
                       onMouseEnter={function(e) { e.currentTarget.style.background="#f9fafb"; }}
                       onMouseLeave={function(e) { e.currentTarget.style.background="transparent"; }}
                       onClick={function(tm) { return function(e) {
                         e.stopPropagation();
                         setEditingTeam({ id:tm.id, name:tm.name, ageGroup:tm.ageGroup||"", sport:tm.sport||"baseball" });
                         setOpenMenuTeamId(null);
                       }; }(team)}>
                    ✏ Edit team
                  </div>
                  <div style={{ padding:"10px 16px", cursor:"pointer", color:"#374151", fontSize:"13px", fontFamily:"inherit" }}
                       onMouseEnter={function(e) { e.currentTarget.style.background="#f9fafb"; }}
                       onMouseLeave={function(e) { e.currentTarget.style.background="transparent"; }}
                       onClick={function(e) { e.stopPropagation(); exportTeamData(team); setOpenMenuTeamId(null); }}>
                    ⬇ Download backup
                  </div>
                  <div style={{ padding:"10px 16px", cursor:"pointer", color:"#e05565", fontSize:"13px", fontFamily:"inherit" }}
                       onMouseEnter={function(e) { e.currentTarget.style.background="#f9fafb"; }}
                       onMouseLeave={function(e) { e.currentTarget.style.background="transparent"; }}
                       onClick={function(e) {
                         e.stopPropagation();
                         setOpenMenuTeamId(null);
                         if (confirm("Delete \"" + team.name + "\"? This cannot be undone.")) { deleteTeam(team.id); }
                       }}>
                    🗑 Delete team
                  </div>
                </div>
              </>
            )}
          </div>
          </div>{/* end TOP ROW */}
          {/* BOTTOM ROW — Game Mode button (full width, only when ready + lineup exists) */}
          {(function() {
            var cardGrid = loadJSON("team:" + team.id + ":grid", null);
            var hasLineup = cardGrid && Object.keys(cardGrid).length > 0;
            var isReady = statusBadge === "Ready";
            if (isReady && hasLineup) {
              return (
                <button
                  onClick={function(tm) { return function(e) {
                    e.stopPropagation();
                    loadTeam(tm);
                    setTimeout(function() { setPrimaryTab("gameday"); setGameDayTab("defense"); setGameModeActive(true); }, 300);
                  }; }(team)}
                  style={{ width:"100%", background:"#e05c2a", color:"#fff", border:"none", borderRadius:"8px",
                    padding:"8px 10px", fontSize:"12px", fontWeight:"bold", cursor:"pointer",
                    whiteSpace:"nowrap", fontFamily:"inherit", textAlign:"center" }}>
                  ▶ Game Mode
                </button>
              );
            }
            if (isReady) {
              return (
                <div style={{ fontSize:"9px", color:"#9ca3af", textAlign:"center", lineHeight:1.3 }}>
                  Generate a lineup to unlock Game Mode
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    }

    return (
      <>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 16px", fontFamily:"Georgia,serif", minHeight:"100%", background:"linear-gradient(180deg,#fdf6ec 0%,#f7efe2 100%)" }}>

        <div style={{ width:"100%", maxWidth:"500px" }}>
          {homeMode === "welcome" ? (
            <div>
              <div style={{ marginBottom:"8px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
                  <div style={{ fontSize:"13px", color:"#6b7280", letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"Georgia,serif" }}>{greeting}, {firstName || "Coach"}</div>
                  {/* Backend health pill — silence is success; only show non-ok states */}
                  {backendHealth.status === 'slow' ? (
                    <span style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 8px", borderRadius:"10px", background:"rgba(180,83,9,0.1)", color:"#92400e", border:"1px solid rgba(180,83,9,0.25)", whiteSpace:"nowrap", flexShrink:0 }}>
                      ⏳ Server warming up...
                    </span>
                  ) : backendHealth.status === 'down' ? (
                    <span style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 8px", borderRadius:"10px", background:"rgba(200,16,46,0.08)", color:"#991b1b", border:"1px solid rgba(200,16,46,0.2)", whiteSpace:"nowrap", flexShrink:0 }}>
                      ⚠️ Server unavailable — some features may not work
                    </span>
                  ) : backendHealth.checkingVisible ? (
                    <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"rgba(0,0,0,0.05)", color:"#9ca3af", border:"1px solid rgba(0,0,0,0.08)", whiteSpace:"nowrap", flexShrink:0 }}>
                      Connecting...
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize:"11px", color:"#9ca3af", marginTop:"2px" }}>
                  {now.toLocaleDateString("en-US", { timeZone:"America/New_York", weekday:"long", month:"long", day:"numeric" })}
                </div>
              </div>
              {(function() {
                var nextGameGlobal = null;
                var nextGameTeam = null;
                for (var tgi = 0; tgi < teams.length; tgi++) {
                  var tgTeam = teams[tgi];
                  var tgRoster = loadJSON("team:" + tgTeam.id + ":roster", []);
                  if (!tgRoster || tgRoster.length === 0) { continue; }
                  var tgNext = getNextGame(tgTeam);
                  if (tgNext && (!nextGameGlobal || tgNext.days < nextGameGlobal.days)) {
                    nextGameGlobal = tgNext;
                    nextGameTeam = tgTeam;
                  }
                }
                if (!nextGameGlobal || !nextGameTeam) { return null; }
                var ngDays = nextGameGlobal.days;
                var ngAccent = ngDays === 0 ? "#c8102e" : ngDays === 1 ? "#b8860b" : C.navy;
                return (
                  <div style={{ background:"linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)", borderRadius:"14px", padding:"18px 18px 16px", marginBottom:"22px", boxShadow:"0 6px 24px rgba(15,31,61,0.18)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    {/* Label + urgency badge */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                      <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.45)", letterSpacing:"0.18em", textTransform:"uppercase" }}>Next Game</div>
                      <div style={{ fontSize:"10px", fontWeight:"bold", letterSpacing:"0.08em", textTransform:"uppercase", color: ngDays === 0 ? "#ff6b6b" : ngDays === 1 ? "#f5c842" : "rgba(255,255,255,0.45)" }}>
                        {ngDays === 0 ? "TODAY" : ngDays === 1 ? "Tomorrow" : ngDays + " days away"}
                      </div>
                    </div>
                    {/* Matchup */}
                    <div style={{ fontSize:"19px", fontWeight:"bold", color:"#ffffff", fontFamily:"Georgia,serif", lineHeight:1.2, marginBottom:"6px" }}>
                      {nextGameTeam.name} vs {nextGameGlobal.game.opponent}
                    </div>
                    {/* Date + time */}
                    <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.6)", marginBottom:"16px" }}>
                      {new Date(nextGameGlobal.game.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}
                      {nextGameGlobal.game.time ? "  \u00b7  " + nextGameGlobal.game.time : ""}
                    </div>
                    {/* Primary CTA */}
                    {(function() {
                      var isTeamLocked = loadJSON("team:" + nextGameTeam.id + ":locked", false);
                      if (isTeamLocked) {
                        return (
                          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                            <button
                              onClick={function(ngt) { return function() {
                                loadTeam(ngt);
                                setTimeout(function() { setPrimaryTab("gameday"); setGameDayTab("lineups"); }, 300);
                              }; }(nextGameTeam)}
                              style={{ background:"linear-gradient(135deg,#f5c842,#e6a817)", color:"#0f1f3d", border:"none", borderRadius:"10px", padding:"14px 20px", fontSize:"15px", fontWeight:"bold", cursor:"pointer", width:"100%", fontFamily:"Georgia,serif", letterSpacing:"0.02em", boxShadow:"0 3px 12px rgba(245,200,66,0.35)" }}>
                              ✓ View Lineup
                            </button>
                            <button
                              onClick={function(ngt) { return function() {
                                loadTeam(ngt);
                                setTimeout(function() { setPrimaryTab("gameday"); setGameDayTab("defense"); setGameModeActive(true); }, 300);
                              }; }(nextGameTeam)}
                              style={{ background:"#e05c2a", color:"#fff", border:"none", borderRadius:"10px", padding:"12px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer", width:"100%", fontFamily:"Georgia,serif", letterSpacing:"0.02em", boxShadow:"0 3px 12px rgba(224,92,42,0.4)" }}>
                              ▶ Game Mode
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                          <button
                            onClick={function(ngt, ngg) { return function() {
                              loadTeam(ngt);
                              setTimeout(function() { setPrimaryTab("gameday"); setGameDayTab("lineups"); setTimeout(generateLineup, 100); }, 300);
                            }; }(nextGameTeam, nextGameGlobal)}
                            style={{ background:"linear-gradient(135deg,#f5c842,#e6a817)", color:"#0f1f3d", border:"none", borderRadius:"10px", padding:"14px 20px", fontSize:"15px", fontWeight:"bold", cursor:"pointer", width:"100%", fontFamily:"Georgia,serif", letterSpacing:"0.02em", boxShadow:"0 3px 12px rgba(245,200,66,0.35)" }}>
                            ⚡ Generate Lineup
                          </button>
                          {ngDays === 0 ? (
                            <button
                              onClick={function(ngt) { return function() {
                                loadTeam(ngt);
                                setTimeout(function() { setPrimaryTab("gameday"); setGameDayTab("defense"); setGameModeActive(true); }, 300);
                              }; }(nextGameTeam)}
                              style={{ background:"#e05c2a", color:"#fff", border:"none", borderRadius:"10px", padding:"12px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer", width:"100%", fontFamily:"Georgia,serif", letterSpacing:"0.02em", boxShadow:"0 3px 12px rgba(224,92,42,0.4)" }}>
                              ▶ Start Game Mode
                            </button>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}


              <ErrorBoundary fallback="Team List">
              {teams.length > 0 ? (
                <div style={{ marginBottom:"8px" }}>
                  <div style={{ fontSize:"9px", color:"#c0c7d0", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"6px", paddingLeft:"2px" }}>Your Teams</div>
                  {teams.length >= 3 ? (
                    <div style={{ position:"relative", marginBottom:"10px" }}>
                      <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", pointerEvents:"none", opacity:0.4 }}>🔍</span>
                      <input
                        type="search"
                        value={teamSearch}
                        onChange={function(e) { setTeamSearch(e.target.value); }}
                        placeholder="Find your team…"
                        style={{ width:"100%", boxSizing:"border-box", background:"#f8fafc", border:"1px solid rgba(0,0,0,0.08)", borderRadius:"10px", padding:"9px 12px 9px 36px", color:"#374151", fontFamily:"Georgia,serif", fontSize:"13px", outline:"none" }} />
                      {teamSearch ? (
                        <button onClick={function() { setTeamSearch(""); }}
                          style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#9ca3af", fontSize:"16px", cursor:"pointer", lineHeight:1, padding:"0 2px" }}>×</button>
                      ) : null}
                    </div>
                  ) : null}
                  {(function() {
                    var q = teamSearch.trim().toLowerCase();
                    var filtered = q
                      ? teams.filter(function(t) {
                          return (t.name || "").toLowerCase().indexOf(q) >= 0 ||
                                 (t.ageGroup || "").toLowerCase().indexOf(q) >= 0 ||
                                 (t.sport || "").toLowerCase().indexOf(q) >= 0;
                        })
                      : teams;
                    if (filtered.length === 0) {
                      return (
                        <EmptyState
                          hasQuery={q.length > 0}
                          onCreateTeam={function() { setNewTeam({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() }); setHomeMode("create"); }}
                        />
                      );
                    }
                    return filtered.map(function(t) { return TeamCard({ team: t }); });
                  })()}
                </div>
              ) : null}
              </ErrorBoundary>
              {!teams.find(function(t) { return t.name === "Demo All-Stars"; }) ? (
                <button onClick={loadDemoTeam}
                  style={{ width:"100%", padding:"12px", borderRadius:"12px", background:"linear-gradient(135deg,#f5c842,#e6a817)", color:"#0f1f3d", border:"none", fontSize:"13px", fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer", marginBottom:"10px", letterSpacing:"0.04em" }}>
                  Try Demo Team
                </button>
              ) : null}
              {teams.length === 0 ? (
                <button onClick={function() { setNewTeam({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() }); setHomeMode("create"); }}
                  style={{ width:"100%", padding:"16px", borderRadius:"12px", background:"linear-gradient(135deg,#c8102e,#a00d25)", color:"#fff", border:"none", fontSize:"16px", fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer", marginBottom:"12px", letterSpacing:"0.04em" }}>
                  ⚾ Create Your First Team
                </button>
              ) : (
                <button onClick={function() { setNewTeam({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() }); setHomeMode("create"); }}
                  style={{ width:"100%", padding:"10px", borderRadius:"10px", background:"#f8fafc", color:"#374151", border:"1px solid rgba(0,0,0,0.12)", fontSize:"13px", fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer", marginBottom:"12px", letterSpacing:"0.04em" }}>
                  + New Team
                </button>
              )}
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"10px", color:"#d1d5db" }}>All data saved locally on this device</div>
              </div>
            </div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"14px", padding:"22px" }}>
              <div style={{ fontSize:"15px", fontWeight:"bold", color:"#111827", marginBottom:"16px" }}>Create a New Team</div>
              <div style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", fontWeight:"600", color:"#111827", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"6px" }}>Team Name</div>
                <input type="text" value={newTeam.name} placeholder="e.g. Mud Hens" maxLength={40} autoFocus
                  onChange={function(e) { var next = {}; for (var k in newTeam) { next[k]=newTeam[k]; } next.name=e.target.value; setNewTeam(next); }}
                  style={{ width:"100%", background:"#fff", border:"1.5px solid #9ca3af", borderRadius:"8px", padding:"10px 12px", color:"#111827", fontFamily:"inherit", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:"10px", marginBottom:"12px" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", fontWeight:"600", color:"#111827", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"6px" }}>Age Group</div>
                  <select value={newTeam.ageGroup}
                    onChange={function(e) { var next = {}; for (var k in newTeam) { next[k]=newTeam[k]; } next.ageGroup=e.target.value; setNewTeam(next); }}
                    style={{ width:"100%", background:"#fff", border:"1.5px solid #9ca3af", borderRadius:"8px", padding:"10px 12px", color: newTeam.ageGroup ? "#111827" : "#6b7280", fontFamily:"inherit", fontSize:"14px", outline:"none", boxSizing:"border-box", cursor:"pointer" }}>
                    <option value="">— Age —</option>
                    {["5U","6U","7U","8U","9U","10U","11U","12U"].map(function(ag) {
                      return <option key={ag} value={ag}>{ag}</option>;
                    })}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", fontWeight:"600", color:"#111827", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"6px" }}>Sport</div>
                  <select value={newTeam.sport}
                    onChange={function(e) { var next = {}; for (var k in newTeam) { next[k]=newTeam[k]; } next.sport=e.target.value; setNewTeam(next); }}
                    style={{ width:"100%", background:"#fff", border:"1.5px solid #9ca3af", borderRadius:"8px", padding:"10px 12px", color: newTeam.sport ? "#111827" : "#6b7280", fontFamily:"inherit", fontSize:"14px", outline:"none", boxSizing:"border-box", cursor:"pointer" }}>
                    <option value="">— Sport —</option>
                    <option value="baseball">Baseball</option>
                    <option value="softball">Softball</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>
                <button onClick={createTeam} disabled={!newTeam.name.trim()} style={{ flex:1, padding:"12px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"14px", fontFamily:"inherit", background: newTeam.name.trim() ? "linear-gradient(135deg,#c8102e,#9b0c22)" : "#e5e7eb", color: newTeam.name.trim() ? "#fff" : "#9ca3af" }}>
                  Create Team
                </button>
                <button onClick={function() { setNewTeam({ name:"", ageGroup:"", sport:"", year: new Date().getFullYear() }); setHomeMode("welcome"); }} style={{ padding:"12px 16px", borderRadius:"8px", border:"1px solid #d1d5db", background:"transparent", color:"#6b7280", fontSize:"13px", fontFamily:"inherit", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {needRefresh && (
        <div style={{ position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
          background:'#1e293b', color:'#ffffff', padding:'12px 20px', borderRadius:'12px',
          display:'flex', alignItems:'center', gap:'12px', zIndex:9999,
          boxShadow:'0 4px 24px rgba(0,0,0,0.3)', fontSize:'14px', whiteSpace:'nowrap', maxWidth:'90vw' }}>
          <span>⚡ New version available</span>
          <button onClick={() => updateServiceWorker(true)} style={{ background:'#2563eb', color:'#ffffff',
            border:'none', borderRadius:'8px', padding:'6px 14px', fontSize:'13px',
            fontWeight:'600', cursor:'pointer', flexShrink:0 }}>Update Now</button>
          <button onClick={() => setNeedRefresh(false)} style={{ background:'transparent', color:'#94a3b8',
            border:'none', fontSize:'18px', cursor:'pointer', padding:'0 4px',
            lineHeight:1, flexShrink:0 }}>×</button>
        </div>
      )}
      </>
    );
  }

  // ============================================================
  // ROSTER TAB
  // ============================================================
  function renderRoster() {
    var skillKeys   = Object.keys(SKILLS);
    var tagKeys     = Object.keys(TAGS);
    var batKeys     = Object.keys(BAT_SKILLS);
    var sortedRoster = roster.slice().sort(function(a, b) {
      var nameA = (a.firstName || a.name || '').toLowerCase();
      var nameB = (b.firstName || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    function toggle(arr, key) {
      var idx = arr.indexOf(key);
      if (idx >= 0) { return arr.filter(function(x) { return x !== key; }); }
      return arr.concat([key]);
    }

    function setPrefs(playerName, pos, currentPrefs) {
      var prefs = currentPrefs ? currentPrefs.slice() : [];
      var idx = prefs.indexOf(pos);
      if (idx >= 0) {
        // Already in list - remove it, keep remaining order intact
        prefs = prefs.filter(function(p) { return p !== pos; });
      } else {
        // Not in list - append to end (becomes lowest-priority pref)
        prefs = prefs.concat([pos]);
      }
      updatePlayer(playerName, { prefs: prefs });
    }

    function getTopPositions(info) {
      var results = [];
      for (var pi = 0; pi < FIELD_POSITIONS.length; pi++) {
        var pos = FIELD_POSITIONS[pi];
        var sc = scorePosition(info.name, pos, 0, {}, roster);
        if (sc > 0) { results.push({ pos: pos, sc: sc }); }
      }
      results.sort(function(a,b) { return b.sc - a.sc; });
      return results.slice(0, 3);
    }

    function getRosterSeasonStats(playerName) {
      var ab = 0, h = 0, r = 0, rbi = 0, games = 0;
      for (var gi = 0; gi < schedule.length; gi++) {
        var game = schedule[gi];
        if (!game.result || game.result === '') continue;
        if (game.battingPerf && game.battingPerf[playerName]) {
          var perf = game.battingPerf[playerName];
          var perfAb = parseInt(perf.ab || 0, 10);
          ab  += perfAb;
          h   += parseInt(perf.h   || 0, 10);
          r   += parseInt(perf.r   || 0, 10);
          rbi += parseInt(perf.rbi || 0, 10);
          if (perfAb > 0) { games += 1; }
        }
      }
      return { ab:ab, h:h, r:r, rbi:rbi, games:games };
    }

    return (
      <div>
        {restoreBanner ? (
          <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'13px', color:'#065f46', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>&#x2705; {restoreBanner}</span>
            <button onClick={function(){setRestoreBanner('');}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#065f46' }}>&#xd7;</button>
          </div>
        ) : null}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", flexWrap:"wrap", gap:"8px" }}>
          <div style={S.sectionTitle}>Roster and Player Profiles</div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
            {rosterHistory.length > 0 ? (
              <button style={{ ...S.btn("ghost"), color:C.red, border:"1px solid rgba(200,16,46,0.3)" }}
                onClick={undoRoster}>
                Undo ({rosterHistory.length})
              </button>
            ) : null}
            <button style={S.btn("ghost")} onClick={function() {
              var allCol = true;
              for (var i = 0; i < roster.length; i++) {
                if (!collapsed[roster[i].name]) { allCol = false; break; }
              }
              var next = {};
              if (!allCol) { for (var i = 0; i < roster.length; i++) { next[roster[i].name] = true; } }
              setCollapsed(next);
            }}>
              {(function() {
                var allCol = true;
                for (var i = 0; i < roster.length; i++) { if (!collapsed[roster[i].name]) { allCol = false; break; } }
                return allCol ? "Expand All" : "Collapse All";
              })()}
            </button>
          </div>
        </div>

        {lineupDirty && !lineupLocked && roster.length > 0 && (
          <div style={{ background:"rgba(245,200,66,0.12)", border:"1px solid rgba(245,200,66,0.4)", borderRadius:"8px", padding:"10px 14px", marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", flexWrap:"wrap" }}>
            <div style={{ fontSize:"12px", color:"#92620a", fontWeight:"600", flex:1 }}>⚡ Player profiles updated — regenerate lineup when ready</div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center", flexShrink:0 }}>
              <button style={{ ...S.btn("gold"), fontSize:"11px", padding:"5px 12px" }} onClick={function() { setPrimaryTab("gameday"); setGameDayTab("lineups"); setTimeout(generateLineup, 50); }}>Go & Regenerate</button>
              <button style={{ background:"transparent", border:"none", color:"#94a3b8", fontSize:"18px", cursor:"pointer", padding:"0 4px", lineHeight:1 }} onClick={function() { setLineupDirty(false); }}>×</button>
            </div>
          </div>
        )}

        {lineupLocked ? (
          <div style={{ fontSize:"11px", color:C.textMuted, textAlign:"center", padding:"8px 12px", marginBottom:"14px", background:"rgba(15,31,61,0.03)", borderRadius:"8px", border:"1px dashed rgba(15,31,61,0.15)" }}>
            🔒 Lineup is finalized — unlock to add or remove players
          </div>
        ) : !showAddForm ? (
          <button
            style={{ ...S.btn("secondary"), width:"100%", marginBottom:"14px" }}
            onClick={function() { setShowAddForm(true); }}>
            + Add a New Player to Your Roster
          </button>
        ) : (
          <div style={{ marginBottom:"14px" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", alignItems:"center", marginBottom:"8px" }}>
              <input value={newFirstName} onChange={function(e) { setNewFirstName(e.target.value); }}
                onKeyDown={function(e) { if (e.key === "Enter") { addPlayer(); } }}
                placeholder="First name*" maxLength={20} style={{ ...S.input, flex:"1 1 120px" }} autoFocus />
              <input value={newLastName} onChange={function(e) { setNewLastName(e.target.value); }}
                onKeyDown={function(e) { if (e.key === "Enter") { addPlayer(); } }}
                placeholder="Last name*" maxLength={20} style={{ ...S.input, flex:"1 1 120px" }} />
              <button style={S.btn("primary")} onClick={addPlayer}>Add</button>
              <button style={S.btn("secondary")} onClick={function() { setShowAddForm(false); setNewFirstName(""); setNewLastName(""); setNewBattingHand("U"); }}>Cancel</button>
            </div>
            <div style={{ marginTop:"4px" }}>
              <div style={{ fontSize:"12px", fontWeight:600, color:"#374151", marginBottom:"2px" }}>Batting Hand</div>
              <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"6px" }}>Optional — helps dugout prepare batters</div>
              <BattingHandSelector value={newBattingHand} onChange={setNewBattingHand} teamId={activeTeamId} />
            </div>
          </div>
        )}

        <div style={{ ...S.card, marginBottom:"14px" }}>
          <div
            onClick={function() { setSummaryOpen(!summaryOpen); }}
            style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", marginBottom: summaryOpen ? "10px" : "0" }}>
            <div style={S.sectionTitle}>All Players — Quick Summary</div>
            <span style={{ fontSize:"14px", color:"#94a3b8" }}>{summaryOpen ? "▼" : "▶"}</span>
          </div>
          {summaryOpen && (function() {
            var summaryRows = sortedRoster.map(function(info) {
              var stats = getRosterSeasonStats(info.name);
              var avg = stats.ab > 0 ? stats.h / stats.ab : null;
              return { info: info, stats: stats, avg: avg };
            });
            summaryRows.sort(function(a, b) {
              if (summarySortCol === "player") {
                var fa = firstName(a.info.name).toLowerCase();
                var fb = firstName(b.info.name).toLowerCase();
                return summarySortDir === "asc" ? fa.localeCompare(fb) : fb.localeCompare(fa);
              }
              if (summarySortCol === "avg") {
                var av = a.avg !== null ? a.avg : -1;
                var bv = b.avg !== null ? b.avg : -1;
                return summarySortDir === "asc" ? av - bv : bv - av;
              }
              var colMap = { ab:"ab", h:"h", r:"r", rbi:"rbi", g:"games" };
              var key = colMap[summarySortCol] || "r";
              var av2 = a.stats[key] || 0;
              var bv2 = b.stats[key] || 0;
              return summarySortDir === "asc" ? av2 - bv2 : bv2 - av2;
            });
            function toggleSummarySort(col) {
              if (summarySortCol === col) {
                setSummarySortDir(summarySortDir === "desc" ? "asc" : "desc");
              } else {
                setSummarySortCol(col);
                setSummarySortDir("desc");
              }
            }
            var sortableCols = [
              { key:"player", label:"Player" },
              { key:"preferred", label:"Preferred", sortable:false },
              { key:"avoids", label:"Avoids", sortable:false },
              { key:"g", label:"G" },
              { key:"ab", label:"AB" },
              { key:"h", label:"H" },
              { key:"avg", label:"AVG" },
              { key:"r", label:"R" },
              { key:"rbi", label:"RBI" }
            ];
            return (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px" }}>
                  <thead>
                    <tr style={{ background:"#f5efe4" }}>
                      {sortableCols.map(function(col) {
                        var isSortable = col.sortable !== false;
                        var isActive = isSortable && summarySortCol === col.key;
                        var indicator = isActive ? (summarySortDir === "asc" ? " ↑" : " ↓") : "";
                        return (
                          <th key={col.key}
                            onClick={isSortable ? function(k) { return function() { toggleSummarySort(k); }; }(col.key) : undefined}
                            style={{
                              padding:"4px 6px",
                              textAlign: col.key === "player" ? "left" : "center",
                              fontSize:"10px",
                              color: isActive ? C.red : "#6a7a9a",
                              fontWeight: isActive ? "bold" : "normal",
                              borderBottom:"2px solid rgba(15,31,61,0.08)",
                              whiteSpace:"nowrap",
                              cursor: isSortable ? "pointer" : "default",
                              userSelect:"none"
                            }}>
                            {col.label}{indicator}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(function(row, ri) {
                      var info = row.info;
                      var stats = row.stats;
                      var avg = row.avg;
                      var avgColor = avg === null ? C.textMuted : avg >= 0.300 ? "#27ae60" : avg >= 0.200 ? "#e67e22" : C.text;
                      return (
                        <tr key={info.name} style={{ borderBottom:"1px solid rgba(15,31,61,0.05)", background: ri % 2 === 0 ? "transparent" : "rgba(15,31,61,0.03)" }}>
                          <td style={{ padding:"4px 6px", fontWeight:"600", textAlign:"left" }}>{firstName(info.name)}</td>
                          <td style={{ padding:"4px 6px", maxWidth:"80px", wordBreak:"break-word", verticalAlign:"top" }}>
                            {(info.prefs || []).length > 0
                              ? (info.prefs || []).map(function(pos, idx) {
                                  return <div key={pos} style={{ fontSize:"9px", color:"rgba(15,31,61,0.6)" }}>{pos}</div>;
                                })
                              : <span style={{ fontSize:"9px", color:"#ccc" }}>—</span>}
                          </td>
                          <td style={{ padding:"4px 6px", maxWidth:"70px", wordBreak:"break-word", verticalAlign:"top" }}>
                            {(info.dislikes || []).length > 0
                              ? <span style={{ fontSize:"9px", color:"rgba(15,31,61,0.6)" }}>{(info.dislikes || []).join(", ")}</span>
                              : <span style={{ fontSize:"9px", color:"#ccc" }}>—</span>}
                          </td>
                          <td style={{ padding:"4px 6px", textAlign:"center" }}>{stats.games ? fmtStat(stats.games) : "—"}</td>
                          <td style={{ padding:"4px 6px", textAlign:"center" }}>{stats.ab  ? fmtStat(stats.ab)  : "—"}</td>
                          <td style={{ padding:"4px 6px", textAlign:"center" }}>{stats.h   ? fmtStat(stats.h)   : "—"}</td>
                          <td style={{ padding:"4px 6px", textAlign:"center", color:avgColor, fontWeight: avg !== null && avg >= 0.300 ? "bold" : "normal" }}>{fmtAvg(stats.h, stats.ab)}</td>
                          <td style={{ padding:"4px 6px", textAlign:"center" }}>{stats.r   ? fmtStat(stats.r)   : "—"}</td>
                          <td style={{ padding:"4px 6px", textAlign:"center" }}>{stats.rbi ? fmtStat(stats.rbi) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {isHydrating && roster.length === 0 && (
          <div style={{ textAlign:"center", padding:"20px", color:"#94a3b8", fontSize:"13px" }}>
            &#x23F3; Loading roster from cloud...
          </div>
        )}

        {roster.length === 0 && !isHydrating && activeTeamId && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ color:'#888', fontSize:'13px', marginBottom:'8px' }}>No players yet.</div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center', alignItems:'center', flexWrap:'wrap' }}>
              {isSupabaseEnabled && (
                <button
                  onClick={function() {
                    dbGetRosterSnapshots(activeTeamId).then(function(data) {
                      if (data && data.length > 0) {
                        setSnapshots(data);
                        setRecoverMode(true);
                      } else {
                        alert('No previous roster snapshots found for this team.');
                      }
                    });
                  }}
                  style={{ background:'none', border:'none', color:'#6366f1', fontSize:'12px', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                  &#x1F504; Restore previous roster
                </button>
              )}
              <label style={{ background:'none', border:'none', color:'#6366f1', fontSize:'12px', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                &#x2B06; Restore from backup file
                <input type="file" accept=".json" style={{ display:'none' }}
                  onChange={function(e) { importTeamData(e.target.files[0]); e.target.value=''; }} />
              </label>
            </div>
          </div>
        )}

        {recoverMode && (
          <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <div style={{ background:'white', borderRadius:'12px', padding:'20px', maxWidth:'480px', width:'100%', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <div style={{ fontWeight:'bold', fontSize:'16px', color:'#0f1f3d' }}>Restore Previous Roster</div>
                <button onClick={function(){setRecoverMode(false); setSnapshots([]);}} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#94a3b8' }}>&#xd7;</button>
              </div>
              {snapshots.map(function(snap) {
                var d = new Date(snap.snapshot_at);
                var label = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                return (
                  <div key={snap.id} style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px', marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:'bold', fontSize:'13px', color:'#0f1f3d' }}>{snap.player_count} players</div>
                        <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>{label} &middot; {snap.trigger_event}</div>
                      </div>
                      <button
                        onClick={function(s) { return function() {
                          var restored = migrateRoster(s.roster);
                          persistRoster(restored);
                          persistBatting(restored.map(function(p) { return p.name; }));
                          setRecoverMode(false);
                          setSnapshots([]);
                          setRestoreBanner('Roster restored \u2014 ' + restored.length + ' players recovered');
                          setTimeout(function() { setRestoreBanner(''); }, 5000);
                        }; }(snap)}
                        style={{ background:'#0f1f3d', color:'white', border:'none', borderRadius:'6px', padding:'6px 12px', fontSize:'12px', cursor:'pointer', fontWeight:'bold' }}>
                        Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"12px" }}>
          {sortedRoster.map(function(info) {
            var isCol = lineupLocked || !!collapsed[info.name];
            var sk = info.skills || [];
            var tg = info.tags || [];
            var dl = info.dislikes || [];
            var pr = info.prefs || [];
            var bs = info.batSkills || [];

            return (
              <div key={info.name} style={{ ...S.card, padding:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom: isCol ? 0 : "12px" }}>
                  {!lineupLocked ? (
                    <button onClick={function(n) { return function() { var next = {}; for (var k in collapsed) { next[k]=collapsed[k]; } next[n] = !collapsed[n]; setCollapsed(next); }; }(info.name)}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:"11px", color:C.textMuted, padding:"2px", flexShrink:0 }}>
                      {isCol ? ">" : "v"}
                    </button>
                  ) : <span style={{ width:"16px", flexShrink:0 }} />}
                  <div style={{ fontWeight:"bold", fontSize:"14px", flex:1 }}>
                    {info.name}
                    {" "}<PlayerHandBadge hand={info.battingHand} style={{ marginLeft:"4px" }} />
                  </div>
                  {isCol ? (
                    <div style={{ display:"flex", gap:"2px", flexWrap:"wrap" }}>
                      {sk.map(function(key) {
                        var s = SKILLS[key]; if (!s) { return null; }
                        return <span key={key} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"8px", background:s.color+"22", color:s.color, fontWeight:"bold" }}>{s.label}</span>;
                      })}
                      {pr.map(function(pos, i) {
                        return <span key={pos} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"4px", background:POS_COLORS[pos]+"cc", color:"#fff", fontWeight:"bold" }}>{i===0?"1.":"2."}{pos}</span>;
                      })}
                    </div>
                  ) : null}
                  {!lineupLocked ? (
                    <button onClick={function(n) { return function() { if (confirm("Remove " + n + "?")) { removePlayer(n); } }; }(info.name)}
                      style={{ background:"none", border:"none", color:"#b0a0a0", cursor:"pointer", fontSize:"13px", padding:"2px 6px" }}>x</button>
                  ) : null}
                </div>

                {!isCol ? (
                  <div style={{ pointerEvents: lineupLocked ? "none" : "auto" }}>
                    {lineupLocked ? (
                      <div style={{ fontSize:"11px", color:C.textMuted, textAlign:"center", padding:"6px 10px", marginBottom:"10px", background:"rgba(15,31,61,0.03)", borderRadius:"6px", border:"1px dashed rgba(15,31,61,0.12)" }}>
                        🔒 Unlock lineup to edit player attributes
                      </div>
                    ) : null}
                    {(function() {
                      function formatLastUpdated(iso) {
                        var d = new Date(iso);
                        var now = new Date();
                        var timeStr = d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
                        var dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        var nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        var diff = nDate - dDate;
                        if (diff === 0) { return "Today at " + timeStr; }
                        if (diff === 86400000) { return "Yesterday at " + timeStr; }
                        return d.toLocaleDateString([], { month:"short", day:"numeric" }) + " at " + timeStr;
                      }
                      if (!info.lastUpdated) { return null; }
                      return <div style={{ fontSize:"10px", color:"#9ca3af", textAlign:"right", marginBottom:"8px", fontStyle:"italic" }}>Last updated: {formatLastUpdated(info.lastUpdated)}</div>;
                    })()}
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"10px",
                      padding:"6px 8px", borderRadius:"6px", background:"rgba(15,31,61,0.03)",
                      border:"1px solid rgba(15,31,61,0.07)" }}>
                      {[
                        { color:"#27ae60", label:"Strength" },
                        { color:"#2471a3", label:"Strong" },
                        { color:"#d4a017", label:"Developing" },
                        { color:"#c8102e", label:"Risk" },
                        { color:"#7f8c8d", label:"Attribute" }
                      ].map(function(item) {
                        return (
                          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                            <span style={{ width:"6px", height:"6px", borderRadius:"50%",
                              background:item.color, display:"inline-block", flexShrink:0 }}></span>
                            <span style={{ fontSize:"9px", color:C.textMuted }}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* ── V2 Player Profile: Lineup Constraints ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Lineup Constraints");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Lineup Constraints</span>
                        <span>{isV2Open(info.name,"Lineup Constraints") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Lineup Constraints") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Game Day</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {(function() {
                              var sbActive  = !!info.skipBench;
                              var outActive = !!info.outThisGame || tg.indexOf("absent") >= 0;
                              return (
                                <span>
                                  <span style={S.badge("#c8102e", sbActive)} onClick={function(a){return function(){updatePlayer(info.name,{skipBench:!a});};}(sbActive)}>Skip Bench</span>
                                  <span style={S.badge("#c8102e", outActive)} onClick={function(a,tgArr){return function(){
                                    var newOut  = !a;
                                    var newTags = newOut
                                      ? (tgArr.indexOf("absent") < 0 ? tgArr.concat(["absent"]) : tgArr)
                                      : tgArr.filter(function(t){return t !== "absent";});
                                    updatePlayer(info.name, {outThisGame: newOut, tags: newTags});
                                  };}(outActive, tg)}>Out This Game</span>
                                </span>
                              );
                            })()}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Preferred Positions</span>
                          <div style={{ fontSize:"10px", color:C.textMuted, marginBottom:"6px" }}>
                            Tap to add in priority order. 1st pick gets the biggest boost. Tap again to remove.
                          </div>
                          <div style={{ marginBottom:"6px" }}>
                            {FIELD_POSITIONS.map(function(pos) {
                              var rank = pr.indexOf(pos);
                              var active = rank >= 0;
                              var opacity = rank === 0 ? "ff" : rank === 1 ? "dd" : rank === 2 ? "bb" : rank === 3 ? "99" : "88";
                              return (
                                <span key={pos} onClick={function(p) { return function() { setPrefs(info.name, p, pr); }; }(pos)}
                                  style={{ display:"inline-block", padding:"3px 8px", margin:"2px", borderRadius:"6px", fontSize:"10px", fontWeight:"bold", cursor:"pointer",
                                    background: active ? POS_COLORS[pos] + opacity : POS_COLORS[pos]+"18",
                                    color: active ? "#fff" : POS_COLORS[pos],
                                    border:"1px solid " + POS_COLORS[pos] + (active ? "ff" : "44") }}>
                                  {active ? (rank + 1) + "." : ""}{pos}
                                </span>
                              );
                            })}
                          </div>
                          {pr.length > 0 ? (
                            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"6px", alignItems:"center" }}>
                              <span style={{ fontSize:"10px", color:C.textMuted }}>Order:</span>
                              {pr.map(function(pos, ri) {
                                return (
                                  <span key={pos} style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px",
                                    background: POS_COLORS[pos] + "cc", color:"#fff", fontWeight:"bold" }}>
                                    {ri + 1}. {pos}
                                  </span>
                                );
                              })}
                              <span onClick={function() { updatePlayer(info.name, { prefs: [] }); }}
                                style={{ fontSize:"10px", color:C.textMuted, cursor:"pointer", marginLeft:"4px", textDecoration:"underline" }}>
                                clear
                              </span>
                            </div>
                          ) : null}
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Avoid Positions</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {FIELD_POSITIONS.map(function(pos) {
                              var active = dl.indexOf(pos) >= 0;
                              return <span key={pos} style={S.badge("#c8102e", active)} onClick={function(p) { return function() { updatePlayer(info.name, { dislikes: toggle(dl, p) }); }; }(pos)}>{pos}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Walk-Up Song ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Walk-Up Song");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <span>Walk-Up Song</span>
                          {info.walkUpSong ? <span style={{ fontSize:"10px", color:"#64748b", fontWeight:"normal" }}>🎵 {info.walkUpSong}{info.walkUpArtist ? " — " + info.walkUpArtist : ""}</span> : null}
                        </div>
                        <span>{isV2Open(info.name,"Walk-Up Song") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Walk-Up Song") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <div style={{ display:"grid", gap:"6px" }}>
                            <div>
                              <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Song Title</span>
                              <input style={{ width:"100%", padding:"6px 8px", borderRadius:"6px", border:"1px solid #d1d5db", fontSize:"12px", fontFamily:"inherit", boxSizing:"border-box" }}
                                type="text" placeholder="Song title" value={info.walkUpSong || ""}
                                onChange={function(e) { updatePlayer(info.name, { walkUpSong: e.target.value || null }); }} />
                            </div>
                            <div>
                              <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Artist</span>
                              <input style={{ width:"100%", padding:"6px 8px", borderRadius:"6px", border:"1px solid #d1d5db", fontSize:"12px", fontFamily:"inherit", boxSizing:"border-box" }}
                                type="text" placeholder="Artist name" value={info.walkUpArtist || ""}
                                onChange={function(e) { updatePlayer(info.name, { walkUpArtist: e.target.value || null }); }} />
                            </div>
                            <div>
                              <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Clip</span>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
                                <input style={{ padding:"6px 8px", borderRadius:"6px", border:"1px solid #d1d5db", fontSize:"12px", fontFamily:"inherit" }}
                                  type="text" placeholder="Start 00:00" value={info.walkUpStart || ""}
                                  onChange={function(e) { updatePlayer(info.name, { walkUpStart: e.target.value || null }); }} />
                                <input style={{ padding:"6px 8px", borderRadius:"6px", border:"1px solid #d1d5db", fontSize:"12px", fontFamily:"inherit" }}
                                  type="text" placeholder="End 00:10" value={info.walkUpEnd || ""}
                                  onChange={function(e) { updatePlayer(info.name, { walkUpEnd: e.target.value || null }); }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Fielding (+ Field Awareness) ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Fielding");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Fielding</span>
                        <span>{isV2Open(info.name,"Fielding") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Fielding") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Reliability</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Reliability","high"],["Average Reliability","average"],["Needs Support","needs_support"]].map(function(opt) {
                              var active = info.reliability === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{reliability:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Reaction Timing</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Quick Reaction","quick"],["Average Reaction","average"],["Slow Reaction","slow"]].map(function(opt) {
                              var active = info.reaction === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{reaction:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Arm Strength</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Strong Arm","strong"],["Average Arm","average"],["Developing Arm","developing"]].map(function(opt) {
                              var active = info.armStrength === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{armStrength:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Ball Type</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Ground Ball","ground_ball"],["Fly Ball","fly_ball"],["Both","both"],["Developing","developing"]].map(function(opt) {
                              var active = info.ballType === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{ballType:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Field Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Knows Where to Throw","knowsWhereToThrow"],["Calls for Ball","callsForBall"],["Backs Up Plays","backsUpPlays"],["Anticipates Plays","anticipatesPlays"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Batting (+ Batting Awareness) ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Batting");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Batting</span>
                        <span>{isV2Open(info.name,"Batting") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Batting") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Batting Hand</span>
                          <div style={{ marginBottom:"10px" }}>
                            <BattingHandSelector
                              value={normalizeBattingHand(info.battingHand)}
                              onChange={function(v) { updatePlayer(info.name, { battingHand: normalizeBattingHand(v) }); }}
                              teamId={activeTeamId}
                            />
                            <div style={{ fontSize:"10px", color:"#9ca3af", marginTop:"4px" }}>Optional — helps dugout prepare batters</div>
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Contact</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Contact","high"],["Medium Contact","medium"],["Developing Contact","developing"]].map(function(opt) {
                              var active = info.contact === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{contact:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Power</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Power","high"],["Medium Power","medium"],["Low Power","low"]].map(function(opt) {
                              var active = info.power === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{power:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Swing Discipline</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Disciplined","disciplined"],["Free Swinger","free_swinger"]].map(function(opt) {
                              var active = info.swingDiscipline === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{swingDiscipline:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Batting Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Tracks Ball Well","tracksBallWell"],["Patient at Plate","patientAtPlate"],["Confident Hitter","confidentHitter"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Base Running ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Base Running");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Base Running</span>
                        <span>{isV2Open(info.name,"Base Running") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Base Running") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Speed</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Fast","fast"],["Average","average"],["Developing","developing"]].map(function(opt) {
                              var active = info.speed === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{speed:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginTop:"8px", marginBottom:"4px", display:"block" }}>Running Awareness</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Runs Through First","runsThroughFirst"],["Listens to Coaches","listensToCoaches"],["Aware on Bases","awareOnBases"]].map(function(opt) {
                              var active = !!info[opt[1]];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(f,a){return function(){var patch={};patch[f]=!a;updatePlayer(info.name,patch);};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Effort ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Effort");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Effort</span>
                        <span>{isV2Open(info.name,"Effort") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Effort") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Effort Level</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["High Effort","high"],["Average Effort","average"],["Needs Encouragement","needs_encouragement"]].map(function(opt) {
                              var active = info.effort === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{effort:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ── V2 Player Profile: Development Focus ── */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:"8px", marginBottom:"8px", overflow:"hidden" }}>
                      <div onClick={function(){toggleV2Section(info.name,"Development Focus");}}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px",
                        background:"#f9fafb", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer" }}>
                        <span>Development Focus</span>
                        <span>{isV2Open(info.name,"Development Focus") ? "▼" : "▶"}</span>
                      </div>
                      {isV2Open(info.name,"Development Focus") ? (
                        <div style={{ padding:"8px 12px", background:"white" }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:"#666666", marginBottom:"4px", display:"block" }}>Development Priority</span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {[["Needs Infield Reps","infield"],["Needs Outfield Reps","outfield"],["Balanced","balanced"]].map(function(opt) {
                              var active = info.developmentFocus === opt[1];
                              return <span key={opt[1]} style={S.badge("#2563eb", active)} onClick={function(v,a){return function(){updatePlayer(info.name,{developmentFocus:a?null:v});};}(opt[1],active)}>{opt[0]}</span>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {(function() {
                      var st = { ab:0, h:0, r:0, rbi:0, bb:0, games:0 };
                      for (var sgi = 0; sgi < schedule.length; sgi++) {
                        var sg = schedule[sgi];
                        if (!sg.result || !sg.battingPerf || !sg.battingPerf[info.name]) { continue; }
                        var perf = sg.battingPerf[info.name];
                        var perfAb = parseInt(perf.ab || 0, 10);
                        st.ab   += perfAb;
                        st.h    += parseInt(perf.h   || 0, 10);
                        st.r    += parseInt(perf.r   || 0, 10);
                        st.rbi  += parseInt(perf.rbi || 0, 10);
                        st.bb   += parseInt(perf.bb  || 0, 10);
                        if (perfAb > 0) { st.games++; }
                      }
                      if (st.games === 0) { return null; }
                      var avg = fmtAvg(st.h, st.ab);
                      var avgColor = st.ab > 0 && (st.h/st.ab) >= 0.300 ? C.win : st.ab > 0 && (st.h/st.ab) >= 0.200 ? "#d4a017" : C.textMuted;
                      return (
                        <div style={{ marginBottom:"10px" }}>
                          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"6px" }}>Season Batting Record ({st.games} game{st.games !== 1 ? "s" : ""})</div>
                          <div style={{ display:"flex", gap:"12px", padding:"8px 12px", borderRadius:"8px", background:"rgba(15,31,61,0.04)", border:"1px solid rgba(15,31,61,0.08)" }}>
                            {[
                              ["AVG", avg, avgColor],
                              ["AB",  fmtStat(st.ab), C.text],
                              ["H",   fmtStat(st.h),  C.text],
                              ["R",   fmtStat(st.r),  C.text],
                              ["RBI", fmtStat(st.rbi), C.text],
                              ["BB",  fmtStat(st.bb),  C.text]
                            ].map(function(row) {
                              return (
                                <div key={row[0]} style={{ textAlign:"center" }}>
                                  <div style={{ fontSize:"13px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                                  <div style={{ fontSize:"9px", color:"rgba(15,31,61,0.35)", letterSpacing:"0.06em", textTransform:"uppercase" }}>{row[0]}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop:"6px" }}>
                            {schedule.filter(function(sg) {
                              return sg.result && sg.battingPerf && sg.battingPerf[info.name];
                            }).sort(function(a,b) {
                              return new Date(b.date + "T12:00:00") - new Date(a.date + "T12:00:00");
                            }).slice(0, 3).map(function(sg) {
                              var p = sg.battingPerf[info.name];
                              var gameAvg = fmtAvg(p.h, p.ab);
                              var rc = sg.result === "W" ? C.win : sg.result === "L" ? C.red : "#d4a017";
                              return (
                                <div key={sg.id} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"11px", padding:"3px 0", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                                  <span style={{ fontSize:"10px", fontWeight:"bold", color:rc, minWidth:"12px" }}>{sg.result}</span>
                                  <span style={{ color:C.textMuted, flex:1 }}>vs {sg.opponent}</span>
                                  <span style={{ color:C.textMuted }}>{fmtStat(p.ab)}-AB</span>
                                  <span style={{ color:C.textMuted }}>{fmtStat(p.h)}-H</span>
                                  {p.r  ? <span style={{ color:C.textMuted }}>{fmtStat(p.r)}-R</span>   : null}
                                  {p.rbi ? <span style={{ color:C.textMuted }}>{fmtStat(p.rbi)}-RBI</span> : null}
                                  <span style={{ fontWeight:"bold", color: parseInt(p.ab||0,10) > 0 && (parseInt(p.h||0,10)/parseInt(p.ab||0,10)) >= 0.300 ? C.win : C.textMuted }}>{gameAvg}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"6px" }}>Auto-Assign Preview</div>
                    <div>
                      {(function() {
                        var top = getTopPositions(info);
                        return top.map(function(item, idx) {
                          return <span key={item.pos} style={{ ...S.posTag(item.pos), opacity: idx === 0 ? 1 : idx === 1 ? 0.8 : 0.6 }}>{item.pos} {Math.round(item.sc)}</span>;
                        });
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:"24px", paddingTop:"16px", borderTop:"1px solid rgba(15,31,61,0.08)" }}>
          <button style={{ ...S.btn("ghost"), color:"#b0a0a0", fontSize:"11px" }} onClick={function() {
            if (confirm("Reset roster to default players for " + (activeTeam ? activeTeam.name : "this team") + "?")) {
              persistRoster(DEFAULT_ROSTER);
              persistBatting(DEFAULT_ROSTER.map(function(r) { return r.name; }));
              persistGrid(initGrid(DEFAULT_ROSTER, innings));
            }
          }}>Reset Roster</button>
        </div>
      </div>
    );
  }

  // ── Shared diamond position box renderer ─────────────────────────────
  // Used by both grid tab (Diamond view) and print tab (Defense > Diamond format).
  // inningFilter: null = show all innings; number = show only that inning (0-based).
  function renderPosBox(pos, label, inningFilter) {
    var innPlayers = [];
    for (var i = 0; i < innings; i++) {
      if (inningFilter !== null && inningFilter !== undefined && i !== inningFilter) { continue; }
      var found = "";
      for (var pi = 0; pi < roster.length; pi++) {
        if ((grid[roster[pi].name] || [])[i] === pos) { found = roster[pi].name; break; }
      }
      innPlayers.push({ inn: i + 1, name: found });
    }
    var pc = POS_COLORS[pos] || "#555";
    var isSingle = inningFilter !== null && inningFilter !== undefined;
    return (
      <div style={{ background:"rgba(255,255,255,0.97)", border:"2px solid " + pc, borderRadius:"7px",
        padding: isSingle ? "5px 8px" : "3px 5px", width:"100%", boxSizing:"border-box",
        boxShadow:"0 1px 5px rgba(0,0,0,0.14)", overflow:"hidden", minWidth:0 }}>
        <div style={{ fontSize:"9px", fontWeight:"bold", color:pc, letterSpacing:"0.05em",
          marginBottom: isSingle ? "4px" : "2px", textAlign:"center",
          borderBottom:"1px solid "+pc+"44", paddingBottom:"2px" }}>{label || pos}</div>
        {innPlayers.map(function(row) {
          return isSingle ? (
            <div key={row.inn} style={{ fontSize:"12px", fontWeight: row.name ? "bold" : "normal",
              color: row.name ? "#0f1f3d" : "#bbb", textAlign:"center", padding:"1px 0",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {row.name ? firstName(row.name) : "-"}
            </div>
          ) : (
            <div key={row.inn} style={{ display:"flex", gap:"2px", alignItems:"baseline", fontSize:"9.5px", lineHeight:"1.5", overflow:"hidden" }}>
              <span style={{ color:"#aaa", fontSize:"7.5px", minWidth:"8px", textAlign:"right", flexShrink:0 }}>{row.inn}</span>
              <span style={{ fontWeight: row.name ? "bold" : "normal", color: row.name ? "#0f1f3d" : "#ccc",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, flex:1 }}>{row.name ? firstName(row.name) : "-"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // FIELD SVG DIAMOND (shared by grid tab, print tab, share link)
  // ============================================================
  function renderFieldSVG(getPlayerFn, selectedInning, localInnArr) {
    var isSingle = selectedInning !== null && selectedInning !== undefined;
    var HDR_COLORS = {
      "LF":"#1a6e3a", "RF":"#1a6e3a",
      "LC":"#1a5580",
      "RC":"#5c2878",
      "SS":"#8a4a0a", "2B":"#8a4a0a",
      "3B":"#7a1a10", "P":"#7a1a10", "1B":"#7a1a10",
      "C":"#14406e"
    };
    var BOX_H = isSingle ? 54 : (30 + (localInnArr.length * 11) + 4);
    var outPlayers = isSingle ? (function() {
      var out = [];
      var _rn = roster || [];
      for (var _oi = 0; _oi < _rn.length; _oi++) {
        var _pg = grid[_rn[_oi].name] || [];
        if (_pg[selectedInning] === "Out") { out.push(_rn[_oi].name); }
      }
      return out;
    })() : [];
    var VB_H  = isSingle ? Math.max(640, 600 + outPlayers.length * 14) : (555 + BOX_H + 30);
    var SVG_POSITIONS = isSingle ? [
      { pos:"LF", x:42,  y:175, w:112, h:BOX_H },
      { pos:"LC", x:170, y:138, w:112, h:BOX_H },
      { pos:"RC", x:398, y:138, w:112, h:BOX_H },
      { pos:"RF", x:526, y:175, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H }
    ] : [
      { pos:"LF", x:42,  y:165, w:112, h:BOX_H },
      { pos:"LC", x:170, y:128, w:112, h:BOX_H },
      { pos:"RC", x:398, y:128, w:112, h:BOX_H },
      { pos:"RF", x:526, y:165, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H }
    ];
    var benchPlayer = isSingle ? getPlayerFn("Bench", selectedInning) : "";
    return (
      <div style={{ position:"relative", width:"100%", maxWidth:"680px", margin:"0 auto", marginBottom:"10px" }}>
        <svg viewBox={"0 0 680 " + VB_H} width="100%" style={{ display:"block" }}>
          <rect x="0" y="0" width="680" height={VB_H} rx="8" fill="#2d7a3a"/>
          <path d="M 60 580 Q 340 30 620 580 Z" fill="#3a9147" fillOpacity="0.5" stroke="#3a9147" strokeOpacity="0.18" strokeWidth="1"/>
          <line x1="340" y1="565" x2="60" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <line x1="340" y1="565" x2="620" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <ellipse cx="340" cy="430" rx="170" ry="140" fill="#b5845a" fillOpacity="0.85"/>
          <polygon points="340,555 490,415 340,275 190,415" fill="#c49a6c" fillOpacity="0.6" stroke="#e8d5b0" strokeOpacity="0.8" strokeWidth="2"/>
          <circle cx="340" cy="435" r="18" fill="#c9a070" fillOpacity="0.9"/>
          {isSingle && (
            <g>
              <rect x="300" y="8" width="80" height="22" rx="11" fill="rgba(0,0,0,0.35)"/>
              <text x="340" y="23" textAnchor="middle" fontSize="10" fontWeight="600" fill="white" fontFamily="system-ui,sans-serif">
                {"Inning " + (selectedInning + 1)}
              </text>
            </g>
          )}
          {SVG_POSITIONS.map(function(slot) {
            var pc = POS_COLORS[slot.pos] || "#555555";
            var hc = HDR_COLORS[slot.pos] || "#2a2a2a";
            var cx = slot.x + slot.w / 2;
            var hdrFs = isSingle ? "10" : "8.5";
            return (
              <g key={slot.pos}>
                <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="6"
                  fill={pc} fillOpacity="0.22"
                  stroke={pc} strokeOpacity="0.55" strokeWidth="0.5"/>
                <rect x={slot.x} y={slot.y} width={slot.w} height="20" rx="6"
                  fill={hc} fillOpacity="0.88"/>
                <rect x={slot.x} y={slot.y + 10} width={slot.w} height="10" rx="0"
                  fill={hc} fillOpacity="0.88"/>
                <text x={cx} y={slot.y + 13} textAnchor="middle"
                  fontSize={hdrFs} fontWeight="700" fill="white" fillOpacity="0.92"
                  fontFamily="system-ui,sans-serif">
                  {slot.pos}
                </text>
                {isSingle ? (
                  <text x={cx} y={slot.y + 40} textAnchor="middle"
                    fontSize="14" fontWeight="700" fill="white"
                    fontFamily="system-ui,sans-serif">
                    {(function() { var n = getPlayerFn(slot.pos, selectedInning); return n ? firstName(n) : "-"; })()}
                  </text>
                ) : (
                  localInnArr.map(function(ii, i) {
                    var n = getPlayerFn(slot.pos, ii);
                    return (
                      <text key={ii} x={cx} y={slot.y + 30 + (i * 11)} textAnchor="middle"
                        fontSize="7.5" fill="white" fillOpacity={n ? "1" : "0.4"}
                        fontFamily="system-ui,sans-serif">
                        {n ? firstName(n) : "-"}
                      </text>
                    );
                  })
                )}
              </g>
            );
          })}
          {isSingle && benchPlayer && (
            <g>
              <rect x="430" y="570" width="130" height="24" rx="12"
                fill="rgba(0,0,0,0.28)" stroke="white" strokeOpacity="0.15"
                strokeDasharray="3 2" strokeWidth="1"/>
              <text x="495" y="586" textAnchor="middle"
                fontSize="9" fill="rgba(255,255,255,0.7)"
                fontFamily="system-ui,sans-serif">
                {"Bench: " + firstName(benchPlayer)}
              </text>
            </g>
          )}
          {isSingle && outPlayers.length > 0 && outPlayers.map(function(oname, oi) {
            return (
              <text key={oname} x="495" y={598 + oi * 14} textAnchor="middle"
                fontSize="10" fontWeight="700" fill="#dc2626"
                fontFamily="system-ui,sans-serif">
                {"🚫 " + firstName(oname) + " OUT"}
              </text>
            );
          })}
        </svg>
      </div>
    );
  }

  // ============================================================
  // LINEUPS WRAPPER TAB
  // ============================================================
  function renderLineups() {
    var _panelOpen = attendancePanelOpen !== null
      ? attendancePanelOpen
      : absentTonight.length > 0;
    var _availableCount = roster.length - absentTonight.length;

    return (
      <div>
        {/* ── Tonight's Attendance Panel ─── */}
        {roster.length > 0 && !lineupLocked ? (
          <div style={{ marginBottom:"14px", borderRadius:"10px", border:"1px solid rgba(15,31,61,0.12)", overflow:"hidden" }}>
            {/* Header */}
            <div
              onClick={function() { setAttendancePanelOpen(_panelOpen ? false : true); }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px",
                background:"rgba(15,31,61,0.04)", cursor:"pointer", userSelect:"none" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontWeight:700, fontSize:"14px", color:C.navy }}>🏟 Tonight's Attendance</span>
                {absentTonight.length > 0 ? (
                  <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:"11px", fontWeight:700, padding:"2px 7px", borderRadius:"10px" }}>
                    {absentTonight.length} out
                  </span>
                ) : null}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                {isSupabaseEnabled ? (
                  <button
                    onClick={function(e) { e.stopPropagation(); syncAttendance(); }}
                    disabled={attendanceSyncing}
                    title="Pull latest attendance from cloud"
                    style={{ background:"transparent", border:"none", cursor:attendanceSyncing ? "default" : "pointer",
                      fontSize:"12px", color:attendanceSyncMsg ? "#27ae60" : C.textMuted, padding:"2px 6px", fontFamily:"inherit" }}
                  >
                    {attendanceSyncing ? "⟳…" : attendanceSyncMsg || "⟳ Sync"}
                  </button>
                ) : null}
                <span style={{ fontSize:"12px", color:C.textMuted }}>{_panelOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {/* Body */}
            {_panelOpen ? (
              <div style={{ padding:"10px 12px", display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {roster.map(function(p) {
                  var isAbsent = absentTonight.indexOf(p.name) >= 0;
                  var fn = p.firstName || (p.name ? p.name.split(' ')[0] : p.name);
                  return (
                    <div key={p.name} style={{ display:"flex", alignItems:"center", gap:"6px",
                      width:"calc(50% - 3px)", minWidth:"130px" }}>
                      <span style={{ fontWeight: isAbsent ? 700 : 400, fontSize:"14px",
                        color: isAbsent ? "#dc2626" : C.navy,
                        flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {fn}
                      </span>
                      <button
                        onClick={function(name) { return function() { toggleAbsentTonight(name); }; }(p.name)}
                        style={{ fontSize:"11px", fontWeight:600, padding:"4px 8px", borderRadius:"6px",
                          border:"none", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                          background: isAbsent ? "#fee2e2" : "rgba(39,174,96,0.1)",
                          color: isAbsent ? "#dc2626" : "#27ae60" }}
                      >
                        {isAbsent ? "❌ Out Tonight" : "✅ Playing"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Low-roster warning ─── */}
        {absentTonight.length > 0 && _availableCount < 9 ? (
          <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:"8px",
            padding:"10px 14px", marginBottom:"10px", color:"#dc2626", fontWeight:600, fontSize:"13px" }}>
            ⚠ Only {_availableCount} player{_availableCount === 1 ? "" : "s"} available tonight — need at least 9 to field.
          </div>
        ) : null}

        {/* ── Defense / Batting sub-sub-tab bar ─── */}
        <div style={{
          display:"flex", gap:"6px", marginBottom:"14px",
          borderBottom:"1px solid rgba(15,31,61,0.1)",
          paddingBottom:"10px"
        }}>
          {[
            { key:"defense", label:"\u26BE Defense" },
            { key:"batting", label:"\u2694\uFE0F Batting" }
          ].map(function(t) {
            var active = lineupsSubTab === t.key;
            return (
              <button
                key={t.key}
                onClick={function(k) {
                  return function() { setLineupsSubTab(k); };
                }(t.key)}
                style={{
                  flex:"0 0 auto", padding:"7px 18px",
                  borderRadius:"20px", fontSize:"13px",
                  fontWeight: active ? 700 : 500,
                  background: active ? "#0f1f3d" : "rgba(15,31,61,0.06)",
                  color: active ? "#fff" : "#0f1f3d",
                  border: active ? "none" : "1px solid rgba(15,31,61,0.15)",
                  cursor:"pointer", transition:"all 0.15s"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Content ─── */}
        {lineupsSubTab === "defense" ? renderGrid() : null}
        {lineupsSubTab === "batting" ? renderBatting() : null}
      </div>
    );
  }

    // ============================================================
  // FIELD GRID TAB
  // ============================================================
  function renderGrid() {

    function setPos(player, inning, pos) {
      var ng = {};
      for (var k in grid) { ng[k] = grid[k].slice(); }
      ng[player] = ng[player] || [];
      while (ng[player].length <= inning) { ng[player].push(""); }
      ng[player][inning] = pos;
      persistGrid(ng);
      setLineupDirty(false);
    }

    function getCellViolations(player, inning) {
      var pos = (grid[player] || [])[inning] || "";
      var issues = [];
      var pGrid = grid[player] || [];
      if (pos === "Bench") {
        if (inning > 0 && pGrid[inning - 1] === "Bench") { issues.push("back-to-back bench"); }
        if (inning < innings - 1 && pGrid[inning + 1] === "Bench") { issues.push("back-to-back bench"); }
      }
      if (OUTFIELD.indexOf(pos) >= 0) {
        var cnt = 0;
        for (var i = 0; i < pGrid.length; i++) { if (pGrid[i] === pos) { cnt++; } }
        if (cnt > 1) { issues.push(pos + " repeated"); }
      }
      var benchInInning = 0;
      for (var pi = 0; pi < players.length; pi++) {
        if ((grid[players[pi]] || [])[inning] === "Bench") { benchInInning++; }
      }
      if (pos === "Bench" && benchInInning > 2) { issues.push("too many benched"); }
      return issues;
    }

    function autoFix() {
      var rosterForFix = absentTonight.length === 0 ? roster : roster.map(function(p) {
        if (absentTonight.indexOf(p.name) < 0) { return p; }
        var tags = p.tags || [];
        if (tags.indexOf('absent') >= 0) { return p; }
        return Object.assign({}, p, { tags: tags.concat(['absent']) });
      });
      var result = autoAssignWithRetryFallback(rosterForFix, innings);
      persistGrid(result.grid);
      setLineupDirty(false);
      track("auto_assign", {
        attempts: result.attempts || 1,
        warnings: (result.warnings || []).length,
        valid: result.isValid ? "yes" : "no",
        roster_size: roster.length,
        innings: innings
      });
      if (result.usedFallback || !result.isValid) {
        console.warn("[Lineup Engine] autoFix:", result.explain);
      }
    }

    var innArr = [];
    for (var i = 0; i < innings; i++) { innArr.push(i); }

    // Per-inning completion: all 10 field positions filled + at least 1 bench
    var inningComplete = innArr.map(function(i) {
      var coveredPos = {};
      var benchCount = 0;
      for (var pi = 0; pi < players.length; pi++) {
        var pos = (grid[players[pi]] || [])[i] || "";
        if (pos === "Bench") { benchCount++; }
        else if (pos) { coveredPos[pos] = true; }
      }
      return Object.keys(coveredPos).length === FIELD_POSITIONS.length && benchCount >= 1;
    });

    // ── LineupValidationBanner ─────────────────────────────────────────
    var _bannerIssues = [];

    // (a) Incomplete innings
    for (var _bi = 0; _bi < innArr.length; _bi++) {
      if (!inningComplete[_bi]) {
        _bannerIssues.push("Inning " + (_bi + 1) + " is incomplete");
      }
    }

    // (b) Duplicate position in same inning
    for (var _di = 0; _di < innArr.length; _di++) {
      var _seen = {};
      for (var _dp = 0; _dp < players.length; _dp++) {
        var _dpos = (grid[players[_dp]] || [])[_di] || "";
        if (_dpos && _dpos !== "Bench") {
          if (_seen[_dpos]) {
            _bannerIssues.push("Inning " + (_di + 1) + ": " + _dpos + " assigned to two players");
          } else {
            _seen[_dpos] = true;
          }
        }
      }
    }

    // (c) Bench rotation balance — flag if spread > 2
    if (players.length > 0) {
      var _bCounts = players.map(function(p) {
        var cnt = 0;
        for (var _ii = 0; _ii < innings; _ii++) {
          if ((grid[p] || [])[_ii] === "Bench") cnt++;
        }
        return cnt;
      });
      var _maxB = Math.max.apply(null, _bCounts);
      var _minB = Math.min.apply(null, _bCounts);
      if (_maxB - _minB > 2) {
        var _heavyIdx = _bCounts.indexOf(_maxB);
        var _heavyName = (roster[_heavyIdx] && (roster[_heavyIdx].firstName || roster[_heavyIdx].name)) || players[_heavyIdx];
        _bannerIssues.push("Bench rotation uneven — " + _heavyName + " benched " + _maxB + "x");
      }
    }

    var _bannerReady = _bannerIssues.length === 0;
    // ──────────────────────────────────────────────────────────────────

    var _availableCount = roster.length - absentTonight.length;

    return (
      <div>
        {/* ── Lineup Validation Banner ──────────────────────────────── */}
        <ErrorBoundary fallback="Validation">
          <ValidationBanner bannerReady={_bannerReady} bannerIssues={_bannerIssues} />
        </ErrorBoundary>
        {/* ── Fairness Check card — only when finalized ──── */}
        <ErrorBoundary fallback="Fairness Check">
          {lineupLocked ? <FairnessCheck roster={roster} grid={grid} C={C} /> : null}
        </ErrorBoundary>

        {/* ── Finalized badge ───────────────────────────────── */}

        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap", alignItems:"center" }}>
          {!lineupLocked ? (
            <button style={S.btn("gold")} onClick={generateLineup}
              disabled={isHydrating || _availableCount < 9}>
              {isHydrating ? "Loading roster..." : absentTonight.length > 0 ? "Auto-Assign (" + absentTonight.length + " absent)" : "Auto-Assign"}
            </button>
          ) : null}
          {!lineupLocked ? (
            <button style={S.btn(errorCount > 0 ? "danger" : "ghost")} onClick={function() {
              if (errorCount === 0) { alert("Lineup looks good! No issues found."); }
            }}>
              {errorCount > 0 ? errorCount + " Issues" : "Check OK"}
            </button>
          ) : null}
          {!lineupLocked && errorCount > 0 ? <button style={S.btn("primary")} onClick={autoFix}>Auto-Fix All</button> : null}
          {!lineupLocked && lastAutoGrid ? (
            <button style={S.btn("ghost")} onClick={function() {
              if (confirm("Revert to last auto-assigned lineup?")) {
                persistGrid(lastAutoGrid); setLineupDirty(false);
              }
            }}>Revert</button>
          ) : null}
          {!lineupLocked ? (
            <button style={S.btn("ghost")} onClick={function() {
              if (confirm("Clear all assignments?")) { persistGrid(initGrid(roster, innings)); setLineupDirty(true); }
            }}>Clear</button>
          ) : null}
          {/* Finalize button — opens LockFlow 3-step confirmation */}
          {!lineupLocked ? (
            <button
              style={{ ...S.btn("ghost"), color:C.win, border:"1px solid rgba(39,174,96,0.35)", marginLeft:"4px" }}
              onClick={function() { setLockFlowOpen(true); }}>
              ✓ Finalize
            </button>
          ) : null}
          <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center" }}>
            {/* Diamond toggle — works on top of whichever table view is active */}
            <button
              onClick={function() { setShowDiamond(!showDiamond); if (showDiamond) { setDiamondInning(null); } }}
              title={showDiamond ? "Hide diamond" : "Show diamond view"}
              style={{ padding:"5px 12px", borderRadius:"6px", border:"2px solid " + (showDiamond ? C.navy : "rgba(15,31,61,0.15)"),
                cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                background: showDiamond ? C.navy : "transparent",
                color: showDiamond ? "#fff" : C.textMuted }}>
              ◆ Diamond
            </button>
            {/* By Player / By Position table toggle */}
            <div style={{ display:"flex", gap:"4px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px" }}>
              {[["By Player","player"],["By Position","position"]].map(function(opt) {
                var active = gridView === opt[1];
                return (
                  <button key={opt[1]} style={{ padding:"5px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                    background: active ? C.white : "transparent",
                    color: active ? C.navy : C.textMuted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                    onClick={function(v) { return function() { setGridView(v); }; }(opt[1])}>
                    {opt[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {lineupDirty && !lineupLocked && (
          <div style={{ background:"rgba(245,200,66,0.12)", border:"1px solid rgba(245,200,66,0.4)", borderRadius:"8px", padding:"10px 14px", marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", flexWrap:"wrap" }}>
            <div style={{ fontSize:"12px", color:"#92620a", fontWeight:"600", flex:1 }}>⚡ Roster changed — your lineup may be out of date</div>
            <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
              <button style={{ ...S.btn("gold"), fontSize:"11px", padding:"5px 12px" }} onClick={generateLineup}
                disabled={isHydrating || _availableCount < 9}>
                {absentTonight.length > 0 ? "Regenerate (" + absentTonight.length + " absent)" : "Regenerate Lineup"}
              </button>
              <button style={{ background:"transparent", border:"none", color:"#94a3b8", fontSize:"18px", cursor:"pointer", padding:"0 4px", lineHeight:1 }} onClick={function() { setLineupDirty(false); }}>×</button>
            </div>
          </div>
        )}

        {warnings.length > 0 ? (
          <div style={{ marginBottom:"12px" }}>
            {/* Panel header: toggle + Accept All */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              background: activeWarnings.length > 0 ? "#fff3cd" : "#d4edda",
              border:"1px solid " + (activeWarnings.length > 0 ? "#ffc107" : "#28a745"),
              borderRadius: issuesPanelOpen ? "8px 8px 0 0" : "8px",
              padding:"10px 14px", cursor:"pointer", userSelect:"none" }}>
              <div onClick={function() { setIssuesPanelOpen(!issuesPanelOpen); }}
                style={{ flex:1, fontWeight:600, fontSize:14,
                  color: activeWarnings.length > 0 ? "#856404" : "#155724" }}>
                {activeWarnings.length === 0
                  ? "✓ All issues accepted — " + ignoredList.length + " overridden"
                  : "⚠ " + activeWarnings.length + " Issue" + (activeWarnings.length !== 1 ? "s" : "") + " — Tap to review"}
              </div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                {activeWarnings.length > 1 ? (
                  <button onClick={function(e) { e.stopPropagation(); ignoreAllWarnings(); }}
                    style={{ fontSize:11, fontWeight:600, padding:"3px 10px",
                      background:"#6c757d", color:"#fff",
                      border:"none", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Accept All
                  </button>
                ) : null}
                <span onClick={function() { setIssuesPanelOpen(!issuesPanelOpen); }}
                  style={{ fontSize:12, color:"#6c757d" }}>
                  {issuesPanelOpen ? "▲" : "▼"}
                </span>
              </div>
            </div>

            {/* Expanded panel body */}
            {issuesPanelOpen ? (
              <div style={{ border:"1px solid #ffc107", borderTop:"none",
                borderRadius:"0 0 8px 8px", background:"#fffdf0", overflow:"hidden" }}>

                {/* Active warnings */}
                {activeWarnings.map(function(w, i) {
                  return (
                    <div key={warnKey(w)} style={{ display:"flex", alignItems:"flex-start",
                      justifyContent:"space-between", gap:8, padding:"9px 14px",
                      borderBottom: (i < activeWarnings.length - 1 || ignoredList.length > 0) ? "1px solid #f0e6b2" : "none",
                      background: w.type === "missing" ? "#fff0f0" : "#fffdf0" }}>
                      <div style={{ flex:1 }}>
                        <span style={{ display:"inline-block", fontSize:10, fontWeight:700,
                          textTransform:"uppercase", letterSpacing:"0.5px", marginRight:7,
                          color: w.type === "missing" ? "#dc3545" : "#856404",
                          background: w.type === "missing" ? "#fce8e8" : "#fff3cd",
                          border:"1px solid " + (w.type === "missing" ? "#f5c6cb" : "#ffeeba"),
                          borderRadius:4, padding:"1px 5px" }}>
                          {w.type}
                        </span>
                        <span style={{ fontSize:13, color:"#333" }}>{w.msg}</span>
                      </div>
                      <button onClick={function(ww) { return function() { ignoreWarning(ww); }; }(w)}
                        title="Accept / override this issue"
                        style={{ flexShrink:0, fontSize:11, fontWeight:600, padding:"3px 10px",
                          background:"#fff", color:"#28a745",
                          border:"1px solid #28a745", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" }}>
                        ✓ Accept
                      </button>
                    </div>
                  );
                })}

                {/* Overridden / ignored section */}
                {ignoredList.length > 0 ? (
                  <div style={{ borderTop: activeWarnings.length > 0 ? "1px solid #dee2e6" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"7px 14px", background:"#f8f9fa", fontSize:12, color:"#6c757d" }}>
                      <span>✓ {ignoredList.length} overridden</span>
                      <button onClick={restoreAllWarnings}
                        style={{ fontSize:11, fontWeight:500, padding:"2px 8px",
                          background:"transparent", color:"#6c757d",
                          border:"1px solid #ced4da", borderRadius:5, cursor:"pointer" }}>
                        Restore All
                      </button>
                    </div>
                    {ignoredList.map(function(w) {
                      return (
                        <div key={warnKey(w)} style={{ display:"flex", alignItems:"flex-start",
                          justifyContent:"space-between", gap:8, padding:"7px 14px",
                          opacity:0.5, background:"#f8f9fa" }}>
                          <div style={{ flex:1 }}>
                            <span style={{ display:"inline-block", fontSize:10, fontWeight:700,
                              textTransform:"uppercase", letterSpacing:"0.5px", marginRight:7,
                              color:"#6c757d", background:"#e9ecef",
                              border:"1px solid #ced4da", borderRadius:4, padding:"1px 5px" }}>
                              {w.type}
                            </span>
                            <span style={{ fontSize:12, color:"#6c757d", textDecoration:"line-through" }}>{w.msg}</span>
                          </div>
                          <button onClick={function(ww) { return function() { restoreWarning(ww); }; }(w)}
                            title="Restore this issue"
                            style={{ flexShrink:0, fontSize:11, padding:"3px 8px",
                              background:"transparent", color:"#6c757d",
                              border:"1px solid #ced4da", borderRadius:6, cursor:"pointer" }}>
                            ↩
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showDiamond ? (
          <div style={{ borderTop:"2px solid rgba(15,31,61,0.1)", margin:"16px 0 12px",
            display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"10px", fontWeight:"bold", color:C.textMuted,
              textTransform:"uppercase", letterSpacing:"0.12em", whiteSpace:"nowrap" }}>
              {gridView === "player" ? "By Player" : "By Position"}
            </span>
            <div style={{ flex:1, height:"1px", background:"rgba(15,31,61,0.08)" }}/>
          </div>
        ) : null}

        {gridView === "player" ? (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ background:"#f5efe4" }}>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", position:"sticky", left:0, background:"#f5efe4", zIndex:1, minWidth:"90px" }}>Player</th>
                  {innArr.map(function(i) {
                    var done = inningComplete[i];
                    return (
                      <th key={i} style={{ padding:"6px 10px", textAlign:"center", fontSize:"10px", color: done ? "#27ae60" : C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid " + (done ? "rgba(39,174,96,0.35)" : "rgba(15,31,61,0.08)"), minWidth:"72px", background: done ? "rgba(39,174,96,0.07)" : "transparent" }}>
                        Inn {i+1}
                        {done ? <div style={{ fontSize:"11px", lineHeight:"1", marginTop:"2px", color:"#27ae60" }}>✓</div> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map(function(info, ri) {
                  var rowBg = ri % 2 === 0 ? "#fff" : "#faf8f5";
                  return (
                    <tr key={info.name}>
                      <td style={{ padding:"6px 12px", fontWeight:"bold", fontSize:"12px", position:"sticky", left:0, background:rowBg, zIndex:1, borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                        {firstName(info.name)}
                      </td>
                      {innArr.map(function(i) {
                        var pos = (grid[info.name] || [])[i] || "";
                        var viols = getCellViolations(info.name, i);
                        var hasViol = viols.length > 0;
                        // Compute positions taken by other players this inning
                        var takenByOthers = {};
                        var benchCountInInning = 0;
                        for (var tpi = 0; tpi < players.length; tpi++) {
                          if (players[tpi] === info.name) { continue; }
                          var tpos = (grid[players[tpi]] || [])[i] || "";
                          if (tpos === "Bench") { benchCountInInning++; }
                          else if (tpos) { takenByOthers[tpos] = true; }
                        }
                        if (benchCountInInning >= 1) { takenByOthers["Bench"] = true; }
                        return (
                          <td key={i} style={{ padding:"4px 5px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                            <select value={pos}
                              disabled={lineupLocked}
                              onChange={function(player, inning) { return function(e) { setPos(player, inning, e.target.value); }; }(info.name, i)}
                              style={{ width:"64px", padding:"4px 2px", borderRadius:"5px", fontSize:"11px", fontWeight:"bold",
                                background: pos ? (POS_COLORS[pos] + (lineupLocked ? "99" : "cc")) : "#f8f4ee",
                                color: pos ? "#fff" : "#9aaaaa",
                                border: hasViol ? "2px solid " + C.red : "1px solid " + (pos ? "rgba(255,255,255,0.3)" : "rgba(15,31,61,0.1)"),
                                cursor: lineupLocked ? "default" : "pointer", outline:"none", fontFamily:"inherit", textAlign:"center",
                                opacity: lineupLocked ? 0.8 : 1 }}>
                              <option value="">-</option>
                              {ALL_POSITIONS.map(function(p) {
                                var taken = takenByOthers[p] && p !== pos;
                                return <option key={p} value={p} disabled={taken} style={{ color: taken ? "#bbb" : undefined }}>{p === "Bench" ? "X" : p}{taken ? " ·" : ""}</option>;
                              })}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ background:"#f5efe4" }}>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", position:"sticky", left:0, background:"#f5efe4", zIndex:1, minWidth:"90px" }}>Position</th>
                  {innArr.map(function(i) {
                    var done = inningComplete[i];
                    return (
                      <th key={i} style={{ padding:"6px 10px", textAlign:"center", fontSize:"10px", color: done ? "#27ae60" : C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid " + (done ? "rgba(39,174,96,0.35)" : "rgba(15,31,61,0.08)"), minWidth:"90px", background: done ? "rgba(39,174,96,0.07)" : "transparent" }}>
                        Inn {i+1}
                        {done ? <div style={{ fontSize:"11px", lineHeight:"1", marginTop:"2px", color:"#27ae60" }}>✓</div> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_POSITIONS.map(function(pos, ri) {
                  var rowBg = ri % 2 === 0 ? "#fff" : "#faf8f5";
                  var posColor = POS_COLORS[pos] || "#555";
                  return (
                    <tr key={pos}>
                      <td style={{ padding:"6px 12px", fontWeight:"bold", fontSize:"12px", position:"sticky", left:0, background:rowBg, zIndex:1, borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                        <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"4px", background:posColor+"cc", color:"#fff", fontSize:"11px", fontWeight:"bold", minWidth:"36px", textAlign:"center" }}>{pos}</span>
                      </td>
                      {innArr.map(function(i) {
                        // Find which player is at this position this inning
                        var assignedPlayer = "";
                        for (var pi = 0; pi < players.length; pi++) {
                          if ((grid[players[pi]] || [])[i] === pos) { assignedPlayer = players[pi]; break; }
                        }
                        var isEmpty = !assignedPlayer && pos !== "Bench";
                        // For Bench: find all benched players
                        var benchedPlayers = [];
                        if (pos === "Bench") {
                          for (var bpi = 0; bpi < players.length; bpi++) {
                            if ((grid[players[bpi]] || [])[i] === "Bench") { benchedPlayers.push(players[bpi]); }
                          }
                        }
                        return (
                          <td key={i} style={{ padding:"5px 8px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)",
                            background: isEmpty ? "rgba(200,16,46,0.04)" : rowBg }}>
                            {pos === "Bench" ? (
                              <div>
                                {(function() {
                                  var outP = [];
                                  for (var opi = 0; opi < players.length; opi++) {
                                    if ((grid[players[opi]] || [])[i] === "Out") { outP.push(players[opi]); }
                                  }
                                  return [
                                    benchedPlayers.length === 0 && outP.length === 0 ? (
                                      <span key="empty" style={{ fontSize:"11px", color:"rgba(15,31,61,0.2)" }}>-</span>
                                    ) : null,
                                    benchedPlayers.map(function(bp) {
                                      return (
                                        <div key={bp} style={{ fontSize:"11px", color:C.navy, fontWeight:"bold", padding:"2px 6px", borderRadius:"4px", background:"rgba(15,31,61,0.1)", marginBottom:"2px", textAlign:"center" }}>{firstName(bp)}</div>
                                      );
                                    }),
                                    outP.map(function(op) {
                                      return (
                                        <div key={"out-" + op} style={{ fontSize:"11px", color:"#dc2626", fontWeight:"bold", padding:"2px 6px", borderRadius:"4px", background:"rgba(220,38,38,0.12)", marginBottom:"2px", textAlign:"center" }}>{"OUT " + firstName(op)}</div>
                                      );
                                    }),
                                  ];
                                })()}
                              </div>
                            ) : assignedPlayer ? (
                              <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy }}>{firstName(assignedPlayer)}</div>
                            ) : (
                              <div style={{ fontSize:"11px", color:"rgba(200,16,46,0.5)", fontWeight:"bold" }}>-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showDiamond ? (
          <DefenseDiamond
            roster={roster}
            grid={grid}
            innings={innings}
            selectedInning={diamondInning}
            onSelectInning={setDiamondInning}
          />
        ) : null}

      </div>
    );
  }

  // ============================================================
  // BATTING TAB
  // ============================================================
  function renderBatting() {

    function getBatScore(info) {
      if (!info) { return 0; }
      var bs = info.batSkills || [];
      var total = 0;
      for (var i = 0; i < bs.length; i++) {
        var b = BAT_SKILLS[bs[i]];
        if (b) { total += b.bonus; }
      }
      return total;
    }

    function movePlayer(idx, dir) {
      if (lineupLocked) return;
      var newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= battingOrder.length) return;
      var order = battingOrder.slice();
      var item = order.splice(idx, 1)[0];
      order.splice(newIdx, 0, item);
      persistBatting(order);
      setBattingOrderDirty(true);
      setPreSuggestOrder(null);
    }

    function suggestOrder() {
      setPreSuggestOrder(battingOrder.slice());
      var scored = roster.map(function(r) {
        return { name: r.name, score: getBatScore(r) };
      });
      scored.sort(function(a, b) { return b.score - a.score; });
      persistBatting(scored.map(function(x) { return x.name; }));
      setBattingOrderDirty(false); setBattingOrderSaved(false);
      track("suggest_batting_order", {
        has_stats: Object.keys(seasonStats || {}).length > 0 ? "yes" : "no"
      });
    }

    // Aggregate season stats per player across all played games
    var seasonStats = {};
    for (var si = 0; si < schedule.length; si++) {
      var game = schedule[si];
      if (!game.result || !game.battingPerf) { continue; }
      for (var pname in game.battingPerf) {
        var perf = game.battingPerf[pname];
        if (!seasonStats[pname]) {
          seasonStats[pname] = { ab:0, h:0, r:0, rbi:0, bb:0, games:0 };
        }
        var perfAb = parseInt(perf.ab || 0, 10);
        seasonStats[pname].ab   += perfAb;
        seasonStats[pname].h    += parseInt(perf.h   || 0, 10);
        seasonStats[pname].r    += parseInt(perf.r   || 0, 10);
        seasonStats[pname].rbi  += parseInt(perf.rbi || 0, 10);
        seasonStats[pname].bb   += parseInt(perf.bb  || 0, 10);
        if (perfAb > 0) { seasonStats[pname].games++; }
      }
    }
    var hasAnyStats = Object.keys(seasonStats).length > 0;

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", gap:"8px", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={S.sectionTitle}>Batting Order</div>
            {battingOrderDirty && !battingOrderSaved ? (
              <span style={{ fontSize:"10px", color:"#d4a017", fontWeight:"bold", letterSpacing:"0.04em" }}>● Unsaved changes</span>
            ) : null}
            {battingOrderSaved ? (
              <span style={{ fontSize:"10px", color:C.win, fontWeight:"bold" }}>✓ Saved</span>
            ) : null}
          </div>
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            {battingOrderDirty ? (
              <button style={{ ...S.btn("ghost"), color:C.win, border:"1px solid rgba(39,174,96,0.4)" }}
                onClick={function() {
                  persistBatting(battingOrder);
                  setBattingOrderDirty(false);
                  setBattingOrderSaved(true);
                  setPreSuggestOrder(null);
                  setTimeout(function() { setBattingOrderSaved(false); }, 2000);
                }}>
                💾 Save Order
              </button>
            ) : null}
            <button style={{ ...S.btn(lineupLocked ? "ghost" : "gold"), opacity: lineupLocked ? 0.4 : 1, cursor: lineupLocked ? "default" : "pointer" }} onClick={suggestOrder} disabled={lineupLocked}>Suggest Order</button>
            {preSuggestOrder ? (
              <button style={{ ...S.btn("ghost"), fontSize:"11px", padding:"5px 10px", color:"#92620a", border:"1px solid rgba(146,98,10,0.35)" }}
                onClick={function() {
                  persistBatting(preSuggestOrder);
                  setPreSuggestOrder(null);
                  setBattingOrderDirty(false);
                  setBattingOrderSaved(false);
                }}>
                ↩ Undo
              </button>
            ) : null}
            {!lineupLocked ? (
              <div style={{ position:"relative", display:"inline-block" }}
                onMouseEnter={function(e) { if (battingOrderDirty) { var t = e.currentTarget.querySelector(".fin-tip"); if (t) t.style.display = "block"; } }}
                onMouseLeave={function(e) { var t = e.currentTarget.querySelector(".fin-tip"); if (t) t.style.display = "none"; }}>
                <button
                  disabled={battingOrderDirty}
                  style={{ ...S.btn("ghost"), color: battingOrderDirty ? C.textMuted : C.win, border:"1px solid " + (battingOrderDirty ? "rgba(0,0,0,0.12)" : "rgba(39,174,96,0.35)"), opacity: battingOrderDirty ? 0.5 : 1, cursor: battingOrderDirty ? "default" : "pointer" }}
                  onClick={function() { setLockFlowOpen(true); }}>
                  ✓ Finalize
                </button>
                {battingOrderDirty ? (
                  <div className="fin-tip" style={{ display:"none", position:"absolute", bottom:"calc(100% + 6px)", right:0, background:"#1e293b", color:"#fff", fontSize:"11px", borderRadius:"6px", padding:"5px 9px", whiteSpace:"nowrap", pointerEvents:"none", zIndex:99, boxShadow:"0 2px 8px rgba(0,0,0,0.25)" }}>
                    💾 Save order first to Finalize
                    <div style={{ position:"absolute", bottom:"-5px", right:"14px", width:"10px", height:"10px", background:"#1e293b", transform:"rotate(45deg)", borderRadius:"1px" }} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {battingOrderDirty ? (
            <div style={{ fontSize:"11px", color:"#92620a", marginTop:"4px", textAlign:"right" }}>
              💾 Save order to enable Finalize
            </div>
          ) : null}
        </div>

        {hasAnyStats ? (
          <div style={{ ...S.card, padding:"12px 14px", marginBottom:"14px", background:"rgba(15,31,61,0.03)", border:"1px solid rgba(15,31,61,0.1)" }}>
            <div style={{ fontSize:"10px", color:C.textMuted, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.1em" }}>Season Batting Stats</div>
            {(function() {
              var tg = 0, tab = 0, th = 0, tr = 0, trbi = 0;
              var keys = Object.keys(seasonStats);
              for (var ki = 0; ki < keys.length; ki++) {
                var st = seasonStats[keys[ki]];
                if ((st.games || 0) > tg) tg = st.games || 0;
                tab  += parseInt(st.ab  || 0, 10);
                th   += parseInt(st.h   || 0, 10);
                tr   += parseInt(st.r   || 0, 10);
                trbi += parseInt(st.rbi || 0, 10);
              }
              var teamAvgStr = tab > 0 ? fmtAvg(th, tab) : "---";
              var teamAvgNum = tab > 0 ? th / tab : null;
              var avgColor = teamAvgNum !== null && teamAvgNum >= 0.300 ? C.win : teamAvgNum !== null && teamAvgNum >= 0.200 ? "#d4a017" : C.textMuted;
              var divider = <div style={{ width:"1px", height:"28px", background:C.border, margin:"0 4px" }} />;
              var statCell = function(label, val, color) {
                return (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:"40px" }}>
                    <div style={{ fontSize:"15px", fontWeight:"bold", color: color || C.navy }}>{val}</div>
                    <div style={{ fontSize:"9px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
                  </div>
                );
              };
              return (
                <div style={{ display:"flex", alignItems:"center", background:"rgba(15,31,61,0.05)", borderRadius:"6px",
                  padding:"8px 12px", marginBottom:"10px", justifyContent:"space-around" }}>
                  {statCell("G", tg)}
                  {divider}
                  {statCell("AB", tab)}
                  {statCell("H", th)}
                  {statCell("AVG", teamAvgStr, avgColor)}
                  {divider}
                  {statCell("R", tr)}
                  {statCell("RBI", trbi)}
                </div>
              );
            })()}
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    {[
                      { key:"name", label:"Player", sortable:true,  align:"left"   },
                      { key:"g",    label:"G",      sortable:false, align:"center" },
                      { key:"ab",   label:"AB",     sortable:false, align:"center" },
                      { key:"h",    label:"H",      sortable:false, align:"center" },
                      { key:"avg",  label:"AVG",    sortable:true,  align:"center" },
                      { key:"r",    label:"R",      sortable:true,  align:"center" },
                      { key:"rbi",  label:"RBI",    sortable:false, align:"center" },
                    ].map(function(col) {
                      var isActive = statsSortCol === col.key;
                      var indicator = col.sortable ? (isActive ? (statsSortDir === "asc" ? " ↑" : " ↓") : " ↕") : "";
                      return (
                        <th key={col.key}
                          onClick={col.sortable ? function(k) { return function() {
                            if (statsSortCol === k) {
                              setStatsSortDir(statsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setStatsSortCol(k);
                              setStatsSortDir(k === "name" ? "asc" : "desc");
                            }
                          }; }(col.key) : undefined}
                          style={{ padding:"5px 8px", textAlign:col.align, fontSize:"10px", letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:"2px solid rgba(15,31,61,0.08)", whiteSpace:"nowrap",
                            cursor: col.sortable ? "pointer" : "default",
                            color: isActive ? C.navy : C.textMuted,
                            fontWeight: isActive ? "bold" : "normal" }}>
                          {col.label}<span style={{ color: isActive ? C.red : "rgba(15,31,61,0.25)", fontSize:"9px" }}>{indicator}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(function() {
                    var rows = battingOrder.filter(function(name) { return !!seasonStats[name]; });
                    rows = rows.slice().sort(function(a, b) {
                      var sa = seasonStats[a]; var sb = seasonStats[b];
                      if (statsSortCol === "name") {
                        var fa = (roster.find(function(p) { return p.name === a; }) || {});
                        var fb = (roster.find(function(p) { return p.name === b; }) || {});
                        var na = ((fa.firstName || "") + " " + (fa.lastName || "")).toLowerCase().trim() || a.toLowerCase();
                        var nb = ((fb.firstName || "") + " " + (fb.lastName || "")).toLowerCase().trim() || b.toLowerCase();
                        var cmp = na.localeCompare(nb);
                        return statsSortDir === "asc" ? cmp : -cmp;
                      }
                      if (statsSortCol === "r") {
                        var cmp = sa.r - sb.r;
                        return statsSortDir === "asc" ? cmp : -cmp;
                      }
                      if (statsSortCol === "avg") {
                        var avgA = sa.ab > 0 ? sa.h / sa.ab : -1;
                        var avgB = sb.ab > 0 ? sb.h / sb.ab : -1;
                        if (avgA === -1 && avgB === -1) return 0;
                        if (avgA === -1) return 1;
                        if (avgB === -1) return -1;
                        var cmp = avgA - avgB;
                        return statsSortDir === "asc" ? cmp : -cmp;
                      }
                      return 0;
                    });
                    return rows.map(function(name) {
                      var st = seasonStats[name];
                      var avg = st.ab > 0 ? (st.h / st.ab) : null;
                      var avgStr = fmtAvg(st.h, st.ab);
                      var avgColor = avg !== null && avg >= 0.300 ? C.win : avg !== null && avg >= 0.200 ? "#d4a017" : C.text;
                      return (
                        <tr key={name} style={{ borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                          <td style={{ padding:"6px 8px", fontWeight:"bold" }}>{firstName(name)}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center", color:C.textMuted }}>{st.games}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center" }}>{fmtStat(st.ab)}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center" }}>{fmtStat(st.h)}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center", fontWeight:"bold", color:avgColor }}>{avgStr}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center" }}>{fmtStat(st.r)}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center" }}>{fmtStat(st.rbi)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"10px" }}>
          Use ▲▼ arrows or drag to reorder. Enter game stats in the Schedule tab after each game.
        </div>

        <div>
          {battingOrder.map(function(name, idx) {
            var info = null;
            for (var ri = 0; ri < roster.length; ri++) { if (roster[ri].name === name) { info = roster[ri]; break; } }
            if (!info) { return null; }
            var bs = info.batSkills || [];
            var score = getBatScore(info);
            var scoreColor = score > 3 ? C.win : score > 0 ? "#d4a017" : score < 0 ? C.red : "#555";
            var fieldPositions = [];
            for (var ii = 0; ii < innings; ii++) {
              var pos = (grid[name] || [])[ii];
              if (pos && pos !== "Bench") { fieldPositions.push(pos); }
            }
            var st = seasonStats[name];

            return (
              <div key={name}
                draggable={!lineupLocked}
                onDragStart={function(n) { return function(e) { if (lineupLocked) return; e.dataTransfer.effectAllowed="move"; setDragPlayer(n); }; }(name)}
                onDragOver={function(e) { e.preventDefault(); e.dataTransfer.dropEffect="move"; }}
                onDrop={function(n) { return function() { handleDrop(n); setDragPlayer(null); }; }(name)}
                onDragEnd={function() { setDragPlayer(null); }}
                onTouchMove={function(e) {
                  // Only handle if drag was activated via handle — prevents scroll interference
                  if (!window._bTouchDrag || !window._bTouchDrag.active) { return; }
                  e.preventDefault();
                  var td = window._bTouchDrag;
                  var y = e.touches[0].clientY;
                  var dy = y - td.startY;
                  // Require 8px threshold before moving to avoid accidental reorder on tap
                  if (Math.abs(dy) < 8) { return; }
                  var cards = e.currentTarget.parentNode.children;
                  var cardH = cards[0] ? cards[0].getBoundingClientRect().height + 6 : 60;
                  var moved = Math.round(dy / cardH);
                  var newIdx = Math.max(0, Math.min(battingOrder.length - 1, td.currentIdx + moved));
                  if (newIdx !== td.currentIdx) {
                    var order = battingOrder.slice();
                    var item = order.splice(td.currentIdx, 1)[0];
                    order.splice(newIdx, 0, item);
                    persistBatting(order);
                    setBattingOrderDirty(true);
                    window._bTouchDrag = { active:true, name:td.name, startY:td.startY, currentIdx:newIdx };
                    bumpTouchDrag(function(v) { return v + 1; });
                  }
                }}
                onTouchEnd={function() {
                  window._bTouchDrag = { active:false, name:null, startY:0, currentIdx:null };
                  bumpTouchDrag(function(v) { return v + 1; });
                }}
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", borderRadius:"8px", marginBottom:"6px",
                  background: (dragPlayer === name || (touchDrag.active && touchDrag.name === name)) ? "rgba(200,16,46,0.06)" : "#fff",
                  border:"1px solid " + ((dragPlayer === name || (touchDrag.active && touchDrag.name === name)) ? "rgba(200,16,46,0.4)" : "rgba(15,31,61,0.08)"),
                  cursor:"grab", touchAction:"auto", transition:"background 0.1s, border 0.1s",
                  transform: (touchDrag.active && touchDrag.name === name) ? "scale(1.02)" : "scale(1)" }}>

                <div
                  onTouchStart={function(n, i) { return function(e) {
                    if (lineupLocked) return;
                    // Drag only activates from the handle (number circle) — not the whole card
                    // This keeps normal scroll working anywhere else on the card
                    e.stopPropagation();
                    window._bTouchDrag = { active:true, name:n, startY:e.touches[0].clientY, currentIdx:i };
                    bumpTouchDrag(function(v) { return v + 1; });
                  }; }(name, idx)}
                  style={{ width:"26px", height:"26px", borderRadius:"50%", background: lineupLocked ? "rgba(15,31,61,0.2)" : C.navy, color:"#fff", fontSize:"12px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, touchAction:"none", cursor: lineupLocked ? "default" : "grab", userSelect:"none" }}>
                  {idx + 1}
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"2px" }}>
                    <span style={{ fontWeight:"bold", fontSize:"13px" }}>{firstName(name)}</span>
                    <PlayerHandBadge hand={info.battingHand} />
                  </div>
                  <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                    {bs.map(function(key) {
                      var b = BAT_SKILLS[key]; if (!b) { return null; }
                      return <span key={key} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"8px", background:b.color+"22", color:b.color, fontWeight:"bold" }}>{b.label}</span>;
                    })}
                  </div>
                </div>

                {st ? (
                  <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                    {[
                      ["AVG", fmtAvg(st.h, st.ab), st.ab > 0 && (st.h/st.ab) >= 0.300 ? C.win : st.ab > 0 && (st.h/st.ab) >= 0.200 ? "#d4a017" : C.textMuted],
                      ["RBI", fmtStat(st.rbi), C.textMuted],
                      ["BB",  fmtStat(st.bb),  C.textMuted]
                    ].map(function(row) {
                      return (
                        <div key={row[0]} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:"12px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                          <div style={{ fontSize:"9px", color:"rgba(15,31,61,0.3)", letterSpacing:"0.06em" }}>{row[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize:"12px", fontWeight:"bold", color:scoreColor, minWidth:"28px", textAlign:"right" }}>
                    {score > 0 ? "+" + score : score !== 0 ? score : ""}
                  </div>
                )}

                <div style={{ display:"flex", gap:"2px", flexShrink:0 }}>
                  {fieldPositions.slice(0, 3).map(function(pos, fi) {
                    return <span key={fi} style={{ fontSize:"9px", padding:"1px 4px", borderRadius:"3px", background:POS_COLORS[pos]+"cc", color:"#fff", opacity: fi === 0 ? 1 : 0.6 }}>{pos}</span>;
                  })}
                </div>

                {!lineupLocked ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:"2px", flexShrink:0 }}>
                    <button
                      onClick={function(i) { return function(e) { e.stopPropagation(); movePlayer(i, -1); }; }(idx)}
                      disabled={idx === 0}
                      style={{ width:"26px", height:"26px", border:"1px solid rgba(15,31,61,0.15)", borderRadius:"5px",
                        background: idx === 0 ? "rgba(15,31,61,0.04)" : "#fff",
                        color: idx === 0 ? "rgba(15,31,61,0.2)" : C.navy,
                        cursor: idx === 0 ? "default" : "pointer",
                        fontSize:"13px", lineHeight:1, padding:0,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                      ▲
                    </button>
                    <button
                      onClick={function(i) { return function(e) { e.stopPropagation(); movePlayer(i, 1); }; }(idx)}
                      disabled={idx === battingOrder.length - 1}
                      style={{ width:"26px", height:"26px", border:"1px solid rgba(15,31,61,0.15)", borderRadius:"5px",
                        background: idx === battingOrder.length - 1 ? "rgba(15,31,61,0.04)" : "#fff",
                        color: idx === battingOrder.length - 1 ? "rgba(15,31,61,0.2)" : C.navy,
                        cursor: idx === battingOrder.length - 1 ? "default" : "pointer",
                        fontSize:"13px", lineHeight:1, padding:0,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                      ▼
                    </button>
                  </div>
                ) : null}

              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================
  // SONGS TAB — helpers
  // ============================================================
  function isDefaultTime(start, end) {
    var defaults = ["", "0:00", "00:00"];
    var endDefaults = ["", "0:10", "00:10"];
    if (!start && !end) return true;
    return defaults.indexOf(start || "") >= 0 && endDefaults.indexOf(end || "") >= 0;
  }

  function shareSongsList() {
    var lines = [];
    lines.push(activeTeam ? activeTeam.name + " — Walk-Up Songs" : "Walk-Up Songs");
    lines.push("---");
    battingOrder.forEach(function(name, idx) {
      var player = roster.find(function(r) { return r.name === name; });
      if (!player) return;
      lines.push("#" + (idx + 1) + " " + firstName(name));
      if (player.walkUpSong)   lines.push("🎵 " + player.walkUpSong);
      if (player.walkUpArtist) lines.push("🎤 " + player.walkUpArtist);
      if (player.walkUpStart && player.walkUpEnd && !isDefaultTime(player.walkUpStart, player.walkUpEnd)) lines.push("⏱ " + player.walkUpStart + " → " + player.walkUpEnd);
      if (player.walkUpNotes)  lines.push("📝 " + player.walkUpNotes);
      if (player.walkUpLink)   lines.push("🔗 " + player.walkUpLink);
      lines.push("");
    });
    var text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ title: "Walk-Up Songs", text: text });
    } else {
      navigator.clipboard.writeText(text).then(function() {
        alert("Songs list copied to clipboard!");
      });
    }
  }

  function printSongsList() {
    var doc = new jsPDF({ unit:"pt", format:"letter" });
    var y = 40;
    var pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(activeTeam ? activeTeam.name + " — Walk-Up Songs" : "Walk-Up Songs", pageW / 2, y, { align:"center" });
    y += 30;

    // Check if any players have default/blank times — if so, add a note
    var hasDefaultTimes = battingOrder.some(function(name) {
      var player = roster.find(function(r) { return r.name === name; });
      return player && (player.walkUpSong || player.walkUpArtist) && isDefaultTime(player.walkUpStart, player.walkUpEnd);
    });
    if (hasDefaultTimes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text("* Players without a specific start time will play from the beginning of the song.", 40, y);
      doc.setTextColor(0, 0, 0);
      y += 18;
    }

    battingOrder.forEach(function(name, idx) {
      var player = roster.find(function(r) { return r.name === name; });
      if (!player) return;

      if (y > 700) { doc.addPage(); y = 40; }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("#" + (idx + 1) + "  " + name, 40, y);
      y += 18;

      if (player.walkUpSong) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Song: " + player.walkUpSong, 56, y);
        y += 15;
      }
      if (player.walkUpArtist) {
        doc.text("Artist: " + player.walkUpArtist, 56, y);
        y += 15;
      }
      if (player.walkUpStart && player.walkUpEnd && !isDefaultTime(player.walkUpStart, player.walkUpEnd)) {
        doc.text("Time: " + player.walkUpStart + " to " + player.walkUpEnd, 56, y);
        y += 15;
      }
      if (player.walkUpNotes) {
        doc.setTextColor(120, 120, 120);
        doc.text("Note: " + player.walkUpNotes, 56, y);
        doc.setTextColor(0, 0, 0);
        y += 15;
      }
      if (player.walkUpLink) {
        doc.setTextColor(37, 99, 235);
        doc.text("Link: " + player.walkUpLink, 56, y);
        doc.setTextColor(0, 0, 0);
        y += 15;
      }
      y += 10;
    });

    doc.save((activeTeam ? activeTeam.name.replace(/\s+/g, "-") : "team") + "-walkup-songs.pdf");
  }

  // ============================================================
  // SONGS TAB
  // ============================================================
  function renderSongs() {
    return (
      <div>
        {/* ── Header row ───────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", flexWrap:"wrap", gap:"8px" }}>
          <div style={{ fontWeight:"bold", fontSize:"16px", color:C.navy }}>Walk-Up Songs</div>
          <div style={{ display:"flex", gap:"4px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px" }}>
            {(primaryTab === "gameday" && lineupLocked ? [["Game Day View","display"]] : [["Game Day View","display"],["Edit","edit"]]).map(function(opt) {
              var active = songsView === opt[1];
              return (
                <button key={opt[1]}
                  style={{ padding:"5px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                    background: active ? C.white : "transparent",
                    color: active ? C.navy : C.textMuted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                  onClick={function(v) { return function() { setSongsView(v); }; }(opt[1])}>
                  {opt[0]}
                </button>
              );
            })}
          </div>
        </div>

        {songsView === "edit" ? (
          <div>
            <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"12px", padding:"8px 10px", background:"rgba(15,31,61,0.04)", borderRadius:"8px" }}>
              Players are listed in batting order. To change the order, update the Batting tab first.
            </div>
            {battingOrder.map(function(name, idx) {
              var player = roster.find(function(r) { return r.name === name; });
              if (!player) return null;
              var _isAbsentEdit = absentTonight.indexOf(name) >= 0;
              return (
                <div key={name} style={{ ...S.card, marginBottom:"8px", opacity: _isAbsentEdit ? 0.45 : 1, pointerEvents: _isAbsentEdit ? "none" : "auto" }}>
                  <div style={{ fontWeight:"bold", fontSize:"13px", color:C.navy, marginBottom:"10px" }}>
                    #{idx + 1} &nbsp; {firstName(name)}{_isAbsentEdit ? <span style={{ fontSize:"11px", color:C.red, marginLeft:"8px", fontWeight:"normal" }}>(Out Tonight)</span> : null}
                  </div>
                  <div style={{ display:"grid", gap:"6px" }}>
                    <input
                      style={{ width:"100%", padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", boxSizing:"border-box" }}
                      type="text" placeholder="Song title"
                      value={player.walkUpSong || ""}
                      onChange={function(e) { updatePlayer(name, { walkUpSong: e.target.value || null }); }}
                    />
                    <input
                      style={{ width:"100%", padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", boxSizing:"border-box" }}
                      type="text" placeholder="Artist name"
                      value={player.walkUpArtist || ""}
                      onChange={function(e) { updatePlayer(name, { walkUpArtist: e.target.value || null }); }}
                    />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
                      <input
                        style={{ padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit" }}
                        type="text" placeholder="Start e.g. 0:45"
                        value={player.walkUpStart || ""}
                        onChange={function(e) { updatePlayer(name, { walkUpStart: e.target.value || null }); }}
                      />
                      <input
                        style={{ padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit" }}
                        type="text" placeholder="End e.g. 1:10"
                        value={player.walkUpEnd || ""}
                        onChange={function(e) { updatePlayer(name, { walkUpEnd: e.target.value || null }); }}
                      />
                    </div>
                    <input
                      style={{ width:"100%", padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", boxSizing:"border-box" }}
                      type="text" placeholder="Notes for coordinator"
                      value={player.walkUpNotes || ""}
                      onChange={function(e) { updatePlayer(name, { walkUpNotes: e.target.value || null }); }}
                    />
                    <input
                      style={{ width:"100%", padding:"7px 10px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", boxSizing:"border-box" }}
                      type="url" placeholder="Song link (e.g. YouTube or Spotify URL)"
                      value={player.walkUpLink || ""}
                      onChange={function(e) { updatePlayer(name, { walkUpLink: e.target.value || null }); }}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
              <button style={S.btn("primary")} onClick={shareSongsList}>Share Songs List</button>
              <button style={S.btn("ghost")} onClick={printSongsList}>Print Songs List</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Game Day View header actions */}
            <div style={{ display:"flex", gap:"8px", marginBottom:"10px", flexWrap:"wrap" }}>
              <button style={S.btn("primary")} onClick={shareSongsList}>Share</button>
              <button style={S.btn("ghost")} onClick={printSongsList}>Print</button>
            </div>
            <div style={{ fontSize:"11px", color:"#64748b", marginBottom:"14px", padding:"8px 10px", background:"rgba(245,200,66,0.12)", borderRadius:"8px", border:"1px solid rgba(245,200,66,0.3)" }}>
              ⚡ Order matches current batting lineup. If you update the batting order, tap Edit then return here to re-sync.
            </div>

            {activeBattingOrder.map(function(name, idx) {
              var player = roster.find(function(r) { return r.name === name; });
              if (!player) return null;
              var hasSong = player.walkUpSong || player.walkUpArtist || player.walkUpStart || player.walkUpNotes || player.walkUpLink;
              var showTime = player.walkUpStart && player.walkUpEnd && !isDefaultTime(player.walkUpStart, player.walkUpEnd);
              return (
                <div key={name} style={{ background:C.white, border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px", marginBottom:"8px",
                  opacity: hasSong ? 1 : 0.5 }}>
                  <div style={{ fontWeight:"bold", fontSize:"13px", color:C.navy, marginBottom: hasSong ? "8px" : 0 }}>
                    #{idx + 1} &nbsp; {firstName(name)}
                  </div>
                  {hasSong ? (
                    <div>
                      {player.walkUpSong ? (
                        <div style={{ fontSize:"15px", fontWeight:"600", color:"#1e293b", marginBottom:"3px" }}>
                          🎵 {player.walkUpSong}
                        </div>
                      ) : null}
                      {player.walkUpArtist ? (
                        <div style={{ fontSize:"12px", color:"#64748b", marginBottom:"2px" }}>
                          🎤 {player.walkUpArtist}
                        </div>
                      ) : null}
                      {showTime ? (
                        <div style={{ fontSize:"12px", color:"#64748b", marginBottom:"2px" }}>
                          ⏱ {player.walkUpStart} → {player.walkUpEnd}
                        </div>
                      ) : null}
                      {player.walkUpNotes ? (
                        <div style={{ fontSize:"11px", color:"#94a3b8", fontStyle:"italic", marginBottom:"2px" }}>
                          📝 {player.walkUpNotes}
                        </div>
                      ) : null}
                      {player.walkUpLink ? (
                        <div style={{ fontSize:"12px", marginBottom:"2px" }}>
                          <a href={player.walkUpLink} target="_blank" rel="noopener noreferrer" style={{ color:"#2563eb", textDecoration:"none" }}>🔗 Open Song</a>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ fontSize:"11px", color:"#94a3b8" }}>No song set</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // SNACK DUTY TAB
  // ============================================================
  function renderSnackDuty() {
    var today = new Date(); today.setHours(0,0,0,0);

    // Sort games by date; no-date games go to end
    var sorted = schedule.slice().sort(function(a, b) {
      var da = a.date ? new Date(a.date + "T12:00:00") : new Date(9999,0,1);
      var db = b.date ? new Date(b.date + "T12:00:00") : new Date(9999,0,1);
      return da - db;
    });

    // Filter out canceled games
    var games = sorted.filter(function(g) { return g.result !== "X"; });

    if (!schedule.length) {
      return (
        <div style={{ padding:"24px 16px", textAlign:"center", color:C.textMuted, fontSize:"14px" }}>
          No games on the schedule yet.<br />
          <span style={{ fontSize:"12px" }}>Add games in the Schedule tab first.</span>
        </div>
      );
    }

    return (
      <div style={{ padding:"12px 0 32px" }}>
        <div style={{ padding:"0 16px 12px", display:"flex", alignItems:"baseline", gap:"8px" }}>
          <span style={{ fontSize:"18px", fontWeight:"bold", color:C.navy }}>🍎 Snack Duty</span>
          <span style={{ fontSize:"12px", color:C.textMuted }}>
            {games.filter(function(g) { return !!g.snackDuty; }).length} of {games.length} assigned
          </span>
        </div>

        {games.map(function(game) {
          var gd = game.date ? new Date(game.date + "T12:00:00") : null;
          var isPast = gd && gd < today;
          var isToday = gd && gd.getTime() === today.getTime();
          var assignment = { playerName: game.snackDuty || "", note: game.snackNote || "" };
          var hasAssignment = !!assignment.playerName;

          var resultColor = game.result === "W" ? C.win : game.result === "L" ? C.red : C.tie;
          var dateStr = gd ? gd.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) : "—";

          return (
            <div key={game.id} style={{
              margin:"0 12px 10px",
              background: isPast && !isToday ? "rgba(15,31,61,0.03)" : C.cardBg,
              border: "1px solid " + (isToday ? C.gold : C.border),
              borderRadius:"10px",
              padding:"12px 14px",
              opacity: isPast && !isToday ? 0.7 : 1,
              boxShadow: isToday ? "0 0 0 2px " + C.gold + "44" : "none"
            }}>
              {/* Game header row */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"bold", color: isPast && !isToday ? C.textMuted : C.navy }}>
                    {isToday && <span style={{ fontSize:"10px", background:C.gold, color:C.navy, borderRadius:"4px", padding:"1px 6px", fontWeight:"bold", marginRight:"6px", letterSpacing:"0.06em" }}>TODAY</span>}
                    📅 {dateStr}
                    {game.time ? <span style={{ fontWeight:"normal", color:C.textMuted, fontSize:"12px", marginLeft:"8px" }}>• {game.time}</span> : null}
                  </div>
                  <div style={{ fontSize:"13px", color: isPast && !isToday ? C.textMuted : C.text, marginTop:"2px" }}>
                    {game.home ? "vs " : "@ "}<strong>{game.opponent || "TBD"}</strong>
                    {game.location ? <span style={{ fontWeight:"normal", color:C.textMuted, fontSize:"12px" }}> — {game.location}</span> : null}
                  </div>
                </div>
                <div>
                  {game.result ? (
                    <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"10px", fontWeight:"bold", background: resultColor + "22", color: resultColor }}>
                      {game.result}{game.ourScore ? " " + game.ourScore + "-" + game.theirScore : ""}
                    </span>
                  ) : (
                    <span style={{ fontSize:"11px", color:C.subtleText }}>—</span>
                  )}
                </div>
              </div>

              {/* Snack assignment row */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:"12px", color:C.textMuted, flexShrink:0 }}>🍎 Snack Duty:</span>
                <select
                  value={assignment.playerName || ""}
                  onChange={function(gid) { return function(e) {
                    updateSnackField(gid, "playerName", e.target.value);
                  }; }(game.id)}
                  disabled={lineupLocked}
                  style={{ flex:"1 1 140px", minWidth:"120px", padding:"5px 8px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", background:C.cardBg, color: hasAssignment ? C.text : C.textMuted, opacity: lineupLocked ? 0.5 : 1 }}>
                  <option value="">— select player —</option>
                  {roster.slice().sort(function(a,b){ return (a.firstName||a.name||'').toLowerCase().localeCompare((b.firstName||b.name||'').toLowerCase()); }).map(function(p) {
                    return <option key={p.name} value={p.firstName || p.name}>{p.firstName || p.name}</option>;
                  })}
                </select>
                {hasAssignment && (
                  <button
                    onClick={function(gid) { return function() { clearSnackAssignment(gid); }; }(game.id)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:"14px", color:C.textMuted, padding:"2px 4px", lineHeight:1 }}
                    title="Clear">✕</button>
                )}
              </div>


            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // SCHEDULE TAB
  // ============================================================
  function renderSchedule() {
    var wins = 0; var losses = 0; var ties = 0;
    for (var si = 0; si < schedule.length; si++) {
      if (schedule[si].result === "W") { wins++; }
      else if (schedule[si].result === "L") { losses++; }
      else if (schedule[si].result === "T") { ties++; }
      // result "X" = canceled, excluded from record
    }

    var sorted = schedule.slice().sort(function(a, b) {
      return new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00");
    });

    function startEdit(game) {
      var g = {};
      for (var k in game) { g[k] = game[k]; }
      if (!g.battingPerf) { g.battingPerf = {}; }
      setNewGame(g);
      setEditingGame(game);
      setShowGameForm(true);
      var scrollEl = document.getElementById('app-scroll-body');
      if (scrollEl) { scrollEl.scrollTop = 0; }
    }

    function buildShareUrl(game) {
      var payload = {
        team: activeTeam ? activeTeam.name + (activeTeam.ageGroup ? " " + activeTeam.ageGroup : "") : "Lineup",
        game: game,
        grid: grid,
        batting: battingOrder,
        roster: roster.map(function(r) { return r.name; }),
        songs: (function() {
          var s = {};
          roster.forEach(function(p) {
            if (p.walkUpSong || p.walkUpArtist) {
              s[p.name] = { song: p.walkUpSong || null, artist: p.walkUpArtist || null, start: p.walkUpStart || null, end: p.walkUpEnd || null };
            }
          });
          return s;
        })()
      };
      var id = generateShareId();
      // Fire-and-forget — save completes well before recipient opens the link
      dbSaveShareLink(id, payload);
      return window.location.href.split("?")[0] + "?s=" + id;
    }

    function handleShareGame(game) {
      var url = buildShareUrl(game);
      if (navigator.share) {
        navigator.share({ title:"Lineup - " + game.opponent, url:url });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() { alert("Lineup link copied!"); });
      } else {
        setShareGame({ url:url, game:game });
        setShowShare(true);
      }
    }

    return (
      <div>
        {wins + losses + ties > 0 ? (
          <div style={{ display:"flex", gap:"10px", padding:"12px 16px", borderRadius:"10px", background:"linear-gradient(135deg,#0f1f3d,#1a3260)", marginBottom:"14px" }}>
            {[["W", wins, C.win], ["L", losses, C.red], ["T", ties, "#d4a017"]].map(function(row) {
              return (
                <div key={row[0]} style={{ textAlign:"center", flex:1 }}>
                  <div style={{ fontSize:"22px", fontWeight:"bold", color:row[2] }}>{row[1]}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em" }}>{row[0]}</div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
          <button style={S.btn("primary")} onClick={function() {
            setNewGame({ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:{}, snackDuty:"", gameBall:[], gameBallSearch:"", scoreReported:false });
            setEditingGame(null);
            setShowGameForm(true);
            setImportMode(null);
          }}>+ Add Game</button>
          <button style={S.btn("ghost")} onClick={function() {
            setImportMode(importMode ? null : "choose");
            setShowGameForm(false);
          }}>{importMode ? "Cancel Import" : "Import Schedule"}</button>
        </div>

        {importMode === "choose" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>How do you have your schedule?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[
                ["photo",  "Take a Photo or Choose Screenshot", "Point your camera at a printed schedule, or pick a screenshot from your phone"],
                ["text",   "Paste from Email or Website",       "Copy schedule text from an email, GroupMe, or website and paste it here"],
                ["manual", "Type it in Manually",               "Enter games one at a time - date, time, opponent, field"]
              ].map(function(row) {
                return (
                  <div key={row[0]} onClick={function(m) { return function() {
                    if (m === "photo")  { setImportMode("image"); }
                    else if (m === "manual") { setShowGameForm(true); setImportMode(null); }
                    else { setImportMode(m); }
                  }; }(row[0])}
                    style={{ padding:"16px 18px", borderRadius:"10px", border:"2px solid rgba(15,31,61,0.1)",
                      cursor:"pointer", background:"rgba(15,31,61,0.02)", display:"flex", alignItems:"center", gap:"14px" }}>
                    <div style={{ fontSize:"26px", flexShrink:0 }}>
                      {row[0] === "photo" ? "Cam" : row[0] === "text" ? "Txt" : "Add"}
                    </div>
                    <div>
                      <div style={{ fontWeight:"bold", fontSize:"14px", color:C.navy, marginBottom:"3px" }}>{row[1]}</div>
                      <div style={{ fontSize:"12px", color:C.textMuted, lineHeight:"1.4" }}>{row[2]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {importMode === "image" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>Import from Photo</div>
            <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"14px" }}>
              Take a photo of your printed schedule, or choose a screenshot from your camera roll.
            </div>

            {!importState.loading && !(importState.preview && importState.preview.length > 0) ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

                <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                  padding:"18px", borderRadius:"12px", cursor:"pointer", textAlign:"center",
                  background:"linear-gradient(135deg,#c8102e,#9b0c22)", color:"#fff",
                  fontWeight:"bold", fontSize:"15px", fontFamily:"inherit", boxShadow:"0 3px 12px rgba(200,16,46,0.35)" }}>
                  Take Photo / Choose from Gallery
                  <input type="file" accept="image/*" capture="environment"
                    onChange={function(e) {
                      var file = e.target.files && e.target.files[0];
                      if (!file) { return; }
                      e.target.value = "";
                      resizeImage(file).then(function(resized) {
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                          var b64 = ev.target.result.split(",")[1];
                          parseScheduleImage(b64, resized.type || file.type);
                        };
                        reader.readAsDataURL(resized);
                      });
                    }}
                    style={{ display:"none" }} />
                </label>

                <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                  padding:"16px", borderRadius:"12px", cursor:"pointer", textAlign:"center",
                  background:"rgba(15,31,61,0.06)", color:C.navy,
                  fontWeight:"bold", fontSize:"14px", fontFamily:"inherit",
                  border:"2px dashed rgba(15,31,61,0.2)" }}>
                  Choose Existing Photo / Screenshot
                  <input type="file" accept="image/*"
                    onChange={function(e) {
                      var file = e.target.files && e.target.files[0];
                      if (!file) { return; }
                      e.target.value = "";
                      resizeImage(file).then(function(resized) {
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                          var b64 = ev.target.result.split(",")[1];
                          parseScheduleImage(b64, resized.type || file.type);
                        };
                        reader.readAsDataURL(resized);
                      });
                    }}
                    style={{ display:"none" }} />
                </label>

                <div style={{ textAlign:"center", fontSize:"11px", color:C.textMuted, padding:"4px 0" }}>
                  Works with printed schedules, screenshots, photos of a whiteboard, or any image with game dates
                </div>
              </div>
            ) : null}

            {importState.loading ? (
              <div style={{ padding:"24px", borderRadius:"10px", background:"rgba(15,31,61,0.04)", textAlign:"center" }}>
                <div style={{ fontSize:"22px", marginBottom:"8px" }}>AI</div>
                <div style={{ fontWeight:"bold", fontSize:"13px", color:C.navy, marginBottom:"4px" }}>Reading your schedule...</div>
                <div style={{ fontSize:"11px", color:C.textMuted }}>AI is extracting game dates, times, and opponents</div>
              </div>
            ) : null}

            {importState.error ? (
              <div style={{ color:C.red, fontSize:"12px", padding:"10px 12px", background:"rgba(200,16,46,0.06)", borderRadius:"8px", marginBottom:"8px" }}>
                {importState.error} - Try the text import option instead.
              </div>
            ) : null}

            {importState.preview && importState.preview.length > 0 ? (
              <div>
                <div style={{ fontSize:"13px", color:C.win, marginBottom:"10px", fontWeight:"bold" }}>
                  Found {importState.preview.length} game{importState.preview.length !== 1 ? "s" : ""}
                </div>
                {importState.preview.map(function(g, gi) {
                  return (
                    <div key={gi} style={{ fontSize:"12px", padding:"8px 12px", background:"rgba(39,174,96,0.06)", borderRadius:"8px", marginBottom:"5px", border:"1px solid rgba(39,174,96,0.2)" }}>
                      <div style={{ fontWeight:"bold" }}>{g.opponent}</div>
                      <div style={{ color:C.textMuted, fontSize:"11px" }}>
                        {g.date} {g.time ? "at " + g.time : ""} {g.location ? "| " + g.location : ""}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                  <button style={{ ...S.btn("primary"), flex:1, padding:"12px" }} onClick={confirmImport}>
                    Add {importState.preview.length} Games
                  </button>
                  <button style={S.btn("ghost")} onClick={function() {
                    setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] });
                  }}>Retry</button>
                </div>
              </div>
            ) : null}

            <button style={{ ...S.btn("ghost"), marginTop:"12px", width:"100%", padding:"10px" }}
              onClick={function() { setImportMode("choose"); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>
              Back
            </button>
          </div>
        ) : null}

        {importMode === "text" ? (
          <div style={{ ...S.card, marginBottom:"14px" }}>
            <div style={S.sectionTitle}>Paste Schedule Text</div>
            <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"10px" }}>
              Copy the schedule from an email, GroupMe message, or website and paste it below. Any format works.
            </div>
            <textarea rows={7} value={importState.text}
              onChange={function(e) { var next = {}; for (var k in importState) { next[k]=importState[k]; } next.text = e.target.value; setImportState(next); }}
              placeholder={"Paste your schedule here..."}
              style={{ ...S.input, marginBottom:"12px", resize:"vertical", lineHeight:"1.6", fontSize:"13px", minHeight:"120px" }} />
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <button style={{ ...S.btn("primary"), flex:1, padding:"12px", fontSize:"13px" }}
                onClick={function() { parseScheduleText(importState.text); }}
                disabled={!importState.text.trim()}>
                {importState.loading ? "Reading schedule..." : "Read Schedule with AI"}
              </button>
              <button style={S.btn("ghost")} onClick={function() { setImportMode("choose"); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>Back</button>
            </div>
            {importState.error ? <div style={{ color:C.red, fontSize:"12px", marginTop:"10px", padding:"8px 12px", background:"rgba(200,16,46,0.06)", borderRadius:"6px" }}>{importState.error}</div> : null}
            {importState.preview && importState.preview.length > 0 ? (
              <div style={{ marginTop:"14px" }}>
                <div style={{ fontSize:"13px", color:C.win, marginBottom:"10px", fontWeight:"bold" }}>
                  Found {importState.preview.length} game{importState.preview.length !== 1 ? "s" : ""}
                </div>
                {importState.preview.map(function(g, gi) {
                  return (
                    <div key={gi} style={{ fontSize:"12px", padding:"8px 12px", background:"rgba(39,174,96,0.06)", borderRadius:"8px", marginBottom:"5px", border:"1px solid rgba(39,174,96,0.2)" }}>
                      <div style={{ fontWeight:"bold" }}>{g.opponent}</div>
                      <div style={{ color:C.textMuted, fontSize:"11px" }}>{g.date} {g.time ? "at " + g.time : ""} {g.location ? "| " + g.location : ""}</div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                  <button style={{ ...S.btn("primary"), flex:1, padding:"12px" }} onClick={confirmImport}>
                    Add {importState.preview.length} Games to Schedule
                  </button>
                  <button style={S.btn("ghost")} onClick={function() { setImportMode(null); setImportState({ mode:null, text:"", image:null, loading:false, error:"", preview:[] }); }}>Cancel</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showGameForm ? (
          <div style={{ ...S.card, marginBottom:"14px", borderLeft:"3px solid " + C.red }}>
            <div style={{ fontWeight:"bold", fontSize:"14px", marginBottom:"14px" }}>
              {editingGame ? "Edit Game" : "Add New Game"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
              {[
                ["Opponent *", "opponent", "text"],
                ["Date *", "date", "date"],
                ["Time", "time", "text"],
                ["Location", "location", "text"]
              ].map(function(row) {
                return (
                  <div key={row[1]}>
                    <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>{row[0]}</div>
                    <input type={row[2]} value={newGame[row[1]] || ""} placeholder={row[0]}
                      maxLength={row[2] === "text" ? 50 : undefined}
                      onChange={function(field) { return function(e) { var g = {}; for (var k in newGame) { g[k]=newGame[k]; } g[field]=e.target.value; setNewGame(g); }; }(row[1])}
                      style={S.input} />
                  </div>
                );
              })}
            </div>
            <div style={{ marginBottom:"10px" }}>
              <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Snack Duty</div>
              <input type="text" value={newGame.snackDuty || ""} placeholder="Parent bringing snacks (e.g. Smith family)"
                maxLength={80}
                onChange={function(e) { var g={}; for(var k in newGame){g[k]=newGame[k];} g.snackDuty=e.target.value; setNewGame(g); }}
                style={S.input} />
            </div>
            {roster.length > 0 ? (
              <div style={{ marginBottom:"10px" }}>
                <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px" }}>Game Ball</div>
                <input type="text" value={newGame.gameBallSearch || ""} placeholder="Search players..."
                  maxLength={40}
                  onChange={function(e) { var g={}; for(var k in newGame){g[k]=newGame[k];} g.gameBallSearch=e.target.value; setNewGame(g); }}
                  style={{ ...S.input, marginBottom:"6px" }} />
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {roster
                    .slice()
                    .sort(function(a,b){ return (a.firstName||a.name||'').toLowerCase().localeCompare((b.firstName||b.name||'').toLowerCase()); })
                    .filter(function(p) {
                      var q = (newGame.gameBallSearch || "").toLowerCase();
                      return !q || (p.firstName||p.name||'').toLowerCase().includes(q);
                    })
                    .map(function(p) {
                      var pname = p.firstName || p.name || '';
                      var sel = Array.isArray(newGame.gameBall) && newGame.gameBall.includes(pname);
                      return (
                        <button key={pname}
                          onClick={function(n) { return function() {
                            var g={}; for(var k in newGame){g[k]=newGame[k];}
                            var current = Array.isArray(g.gameBall) ? g.gameBall : [];
                            var isSelected = current.includes(n);
                            g.gameBall = isSelected ? current.filter(function(x){ return x !== n; }) : current.concat(n);
                            setNewGame(g);
                          }; }(pname)}
                          style={{ padding:"4px 10px", borderRadius:"16px",
                            border: sel ? "2px solid #1B2A4A" : "1.5px solid #ccc",
                            background: sel ? "#1B2A4A" : "#fff",
                            color: sel ? "#fff" : "#333",
                            fontSize:"13px", cursor:"pointer", fontWeight: sel ? 600 : 400 }}>
                          {pname}
                        </button>
                      );
                    })
                  }
                </div>
                {Array.isArray(newGame.gameBall) && newGame.gameBall.length > 0 && (
                  <div style={{ fontSize:"12px", color:"#1B2A4A", marginTop:"4px" }}>
                    🏆 {newGame.gameBall.join(', ')}
                  </div>
                )}
              </div>
            ) : null}
            <div style={{ marginBottom:"10px" }}>
              <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px" }}>Result</div>
              <div style={{ display:"flex", gap:"6px" }}>
                {["W","L","T",""].map(function(r) {
                  var label = r === "" ? "Pending" : r;
                  var active = newGame.result === r;
                  return (
                    <button key={label} onClick={function(rv) { return function() { var g={}; for(var k in newGame){g[k]=newGame[k];} g.result=rv; setNewGame(g); }; }(r)}
                      style={{ padding:"6px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"12px", fontFamily:"inherit",
                        background: active ? (r === "W" ? C.win : r === "L" ? C.red : r === "T" ? "#d4a017" : C.navy) : "rgba(15,31,61,0.06)",
                        color: active ? "#fff" : C.textMuted }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {newGame.result && newGame.result !== "" ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                {[["Our Score","ourScore"],["Their Score","theirScore"]].map(function(row) {
                  return (
                    <div key={row[1]}>
                      <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>{row[0]}</div>
                      <input type="number" min="0" max="99" value={newGame[row[1]] || ""}
                        onChange={function(field) { return function(e) { var g={}; for(var k in newGame){g[k]=newGame[k];} g[field]=e.target.value; setNewGame(g); }; }(row[1])}
                        style={{ ...S.input, width:"80px" }} />
                    </div>
                  );
                })}
              </div>
            ) : null}
            {newGame.result && newGame.result !== "" && roster.length > 0 ? (
              <div style={{ marginBottom:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                  <div style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                    Batting Stats (optional)
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <label style={{ ...S.btn("ghost"), display:"inline-block", cursor:"pointer", fontSize:"10px", padding:"4px 10px" }}>
                      Import from Photo/PDF
                      <input type="file" accept="image/*,application/pdf"
                        onChange={function(e) {
                          var file = e.target.files && e.target.files[0];
                          if (!file) { return; }
                          setResultImport({ gameId: editingGame ? editingGame.id : null, loading:true, error:"" });
                          e.target.value = "";
                          resizeImage(file).then(function(resized) {
                            var reader = new FileReader();
                            reader.onerror = function() {
                              setResultImport({ gameId:null, loading:false, error:"Could not read file. Try entering stats manually." });
                            };
                            reader.onload = function(ev) {
                              var b64 = ev.target.result.split(",")[1];
                              var sType = file.type === "application/pdf" ? "pdf" : "image";
                              parseGameResult(sType, b64, resized.type || file.type)
                                .then(function(parsed) {
                                  track(sType === "text" ? "import_result_text" : "import_result_photo", {});
                                  var g = {}; for (var k in newGame) { g[k] = newGame[k]; }
                                  if (parsed.result)     { g.result     = parsed.result; }
                                  if (parsed.ourScore)   { g.ourScore   = parsed.ourScore; }
                                  if (parsed.theirScore) { g.theirScore = parsed.theirScore; }
                                  if (parsed.battingPerf) {
                                    var bp = {}; for (var k2 in (g.battingPerf || {})) { bp[k2] = g.battingPerf[k2]; }
                                    for (var pn in parsed.battingPerf) { bp[pn] = parsed.battingPerf[pn]; }
                                    g.battingPerf = bp;
                                  }
                                  setNewGame(g);
                                  setResultImport({ gameId: null, loading:false, error:"" });
                                })
                                .catch(function(err) {
                                  var msg = err && err.code === 'AI_NOT_CONFIGURED'
                                    ? "AI import is temporarily unavailable. Enter stats manually."
                                    : "Could not read file. Try entering stats manually.";
                                  setResultImport({ gameId:null, loading:false, error: msg });
                                });
                            };
                            reader.readAsDataURL(resized);
                          });
                        }}
                        style={{ display:"none" }} />
                    </label>
                    <label style={{ ...S.btn("ghost"), display:"inline-block", cursor:"pointer", fontSize:"10px", padding:"4px 10px" }}>
                      Camera / Gallery
                      <input type="file" accept="image/*" capture="environment"
                        onChange={function(e) {
                          var file = e.target.files && e.target.files[0];
                          if (!file) { return; }
                          setResultImport({ gameId: editingGame ? editingGame.id : null, loading:true, error:"" });
                          e.target.value = "";
                          resizeImage(file).then(function(resized) {
                            var reader = new FileReader();
                            reader.onerror = function() {
                              setResultImport({ gameId:null, loading:false, error:"Could not read photo. Try entering stats manually." });
                            };
                            reader.onload = function(ev) {
                              var b64 = ev.target.result.split(",")[1];
                              parseGameResult("image", b64, resized.type || file.type)
                                .then(function(parsed) {
                                  track("import_result_photo", {});
                                  var g = {}; for (var k in newGame) { g[k] = newGame[k]; }
                                  if (parsed.result)     { g.result     = parsed.result; }
                                  if (parsed.ourScore)   { g.ourScore   = parsed.ourScore; }
                                  if (parsed.theirScore) { g.theirScore = parsed.theirScore; }
                                  if (parsed.battingPerf) {
                                    var bp = {}; for (var k2 in (g.battingPerf || {})) { bp[k2] = g.battingPerf[k2]; }
                                    for (var pn in parsed.battingPerf) { bp[pn] = parsed.battingPerf[pn]; }
                                    g.battingPerf = bp;
                                  }
                                  setNewGame(g);
                                  setResultImport({ gameId:null, loading:false, error:"" });
                                })
                                .catch(function(err) {
                                  var msg = err && err.code === 'AI_NOT_CONFIGURED'
                                    ? "AI import is temporarily unavailable. Enter stats manually."
                                    : "Could not read photo. Try entering stats manually.";
                                  setResultImport({ gameId:null, loading:false, error: msg });
                                });
                            };
                            reader.readAsDataURL(resized);
                          });
                        }}
                        style={{ display:"none" }} />
                    </label>
                  </div>
                </div>
                {resultImport.loading ? (
                  <div style={{ padding:"10px 12px", borderRadius:"8px", background:"rgba(15,31,61,0.04)", color:C.textMuted, fontSize:"12px", marginBottom:"8px", textAlign:"center" }}>
                    Reading stats with AI...
                  </div>
                ) : null}
                {resultImport.error ? (
                  <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(200,16,46,0.06)", color:C.red, fontSize:"11px", marginBottom:"8px" }}>
                    {resultImport.error}
                  </div>
                ) : null}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                    <thead>
                      <tr style={{ background:"#f5efe4" }}>
                        {["Player","AB","H","R","RBI","Avg"].map(function(h) {
                          return <th key={h} style={{ padding:"5px 8px", textAlign: h==="Player" ? "left" : "center", fontSize:"10px", color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"1px solid rgba(15,31,61,0.1)", whiteSpace:"nowrap" }}>{h}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map(function(info) {
                        var perf = (newGame.battingPerf && newGame.battingPerf[info.name]) || {};
                        function updatePerf(field) {
                          return function(e) {
                            var bp = {};
                            for (var k in (newGame.battingPerf || {})) { bp[k] = newGame.battingPerf[k]; }
                            if (!bp[info.name]) { bp[info.name] = {}; }
                            var p = {}; for (var k2 in bp[info.name]) { p[k2] = bp[info.name][k2]; }
                            p[field] = e.target.value;
                            bp[info.name] = p;
                            var g = {}; for (var gk in newGame) { g[gk] = newGame[gk]; }
                            g.battingPerf = bp;
                            setNewGame(g);
                          };
                        }
                        var cellStyle = { padding:"2px 4px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" };
                        var inputStyle = { width:"40px", padding:"3px 4px", borderRadius:"4px", border:"1px solid rgba(15,31,61,0.12)", textAlign:"center", fontSize:"12px", fontFamily:"inherit", background:"#f8f4ee" };
                        return (
                          <tr key={info.name}>
                            <td style={{ padding:"5px 8px", fontWeight:"bold", fontSize:"12px", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>{firstName(info.name)}</td>
                            {["ab","h","r","rbi"].map(function(field) {
                              return (
                                <td key={field} style={cellStyle}>
                                  <input type="number" min="0" max="20" value={perf[field] || ""}
                                    onChange={updatePerf(field)}
                                    style={inputStyle} />
                                </td>
                              );
                            })}
                            <td style={cellStyle}>
                              <span style={{ fontSize:"12px", fontWeight:"bold", color: perf.ab > 0 ? (perf.h/perf.ab >= 0.300 ? C.win : perf.h/perf.ab >= 0.200 ? "#d4a017" : C.text) : C.textMuted }}>
                                {perf.ab > 0 ? fmtAvg(perf.h, perf.ab) : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <div style={{ display:"flex", gap:"8px" }}>
              <button style={S.btn("primary")} onClick={saveGameForm} disabled={!newGame.date || !newGame.opponent}>
                {editingGame ? "Save Changes" : "Add Game"}
              </button>
              <button style={S.btn("ghost")} onClick={function() { setShowGameForm(false); setEditingGame(null); }}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div>
          {sorted.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px", color:C.textMuted, fontSize:"13px" }}>
              No games yet. Add your schedule to get started.
            </div>
          ) : null}
          {sorted.map(function(game) {
            var isCanceled = game.result === "X";
            var isPlayed = !!game.result && !isCanceled;
            var resultColor = game.result === "W" ? C.win : game.result === "L" ? C.red : game.result === "T" ? "#d4a017" : "#888";
            var cancelColor = C.canceled;
            return (
              <div key={game.id} style={{ ...S.card, borderLeft:"3px solid " + (isCanceled ? cancelColor : isPlayed ? resultColor : C.red), padding:"14px 16px", opacity: isCanceled ? 0.72 : 1 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
                      <div style={{ fontWeight:"bold", fontSize:"15px" }}>{game.opponent}</div>
                      {isCanceled ? (
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"10px", fontWeight:"bold", background:cancelColor+"22", color:cancelColor, letterSpacing:"0.05em" }}>
                          Canceled
                        </span>
                      ) : isPlayed && game.result ? (
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"10px", fontWeight:"bold", background:resultColor+"22", color:resultColor }}>
                          {game.result} {game.ourScore ? game.ourScore + "-" + game.theirScore : ""}
                        </span>
                      ) : (function() {
                        var today2 = new Date(); today2.setHours(0,0,0,0);
                        var gd = game.date ? new Date(game.date + "T12:00:00") : null;
                        var isPast2 = gd && gd < today2;
                        if (isPast2) {
                          return (
                            <span style={{ display:"inline-flex", gap:"3px", alignItems:"center" }}>
                              {["W","L","T"].map(function(r) {
                                var rc = r==="W"?C.win:r==="L"?C.red:"#d4a017";
                                return (
                                  <button key={r} style={{ padding:"2px 10px", borderRadius:"8px", border:"1px solid "+rc+"66", cursor:"pointer", fontWeight:"bold", fontSize:"11px", fontFamily:"inherit", background:rc+"11", color:rc }}
                                    onClick={function(rv) { return function() {
                                      var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                                      g2.result = rv;
                                      persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                                      setInlineScoreGame(game.id);
                                    }; }(r)}>{r}</button>
                                );
                              })}
                              <button style={{ padding:"2px 8px", borderRadius:"8px", border:"1px solid "+cancelColor+"66", cursor:"pointer", fontWeight:"bold", fontSize:"11px", fontFamily:"inherit", background:cancelColor+"11", color:cancelColor }}
                                onClick={function() {
                                  var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                                  g2.result = "X";
                                  persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                                }}>Rain</button>
                            </span>
                          );
                        }
                        return <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"rgba(200,16,46,0.08)", color:C.red, letterSpacing:"0.08em", textTransform:"uppercase" }}>Upcoming</span>;
                      })()}
                    </div>
                    {inlineScoreGame === game.id && !isCanceled ? (
                      <div style={{ display:"flex", gap:"6px", alignItems:"center", marginTop:"6px", flexWrap:"wrap" }}>
                        <input type="number" min="0" max="99" placeholder="Us"
                          defaultValue={game.ourScore || ""}
                          onChange={function(gid) { return function(e) {
                            var g2={}; for(var k in game){g2[k]=game[k];} g2.ourScore=e.target.value;
                            persistSchedule(schedule.map(function(x){return x.id===gid?g2:x;}));
                          }; }(game.id)}
                          style={{ width:"56px", padding:"4px 6px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", textAlign:"center" }} />
                        <span style={{ fontSize:"12px", color:C.textMuted }}>-</span>
                        <input type="number" min="0" max="99" placeholder="Them"
                          defaultValue={game.theirScore || ""}
                          onChange={function(gid) { return function(e) {
                            var g2={}; for(var k in game){g2[k]=game[k];} g2.theirScore=e.target.value;
                            persistSchedule(schedule.map(function(x){return x.id===gid?g2:x;}));
                          }; }(game.id)}
                          style={{ width:"56px", padding:"4px 6px", borderRadius:"6px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"13px", fontFamily:"inherit", textAlign:"center" }} />
                        <button style={{ ...S.btn("ghost"), fontSize:"11px", padding:"4px 10px" }}
                          onClick={function() { setInlineScoreGame(null); }}>Done</button>
                      </div>
                    ) : null}
                    <div style={{ fontSize:"12px", color:C.textMuted, display:"flex", gap:"12px", flexWrap:"wrap" }}>
                      {game.date ? <span>{new Date(game.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</span> : null}
                      {game.time ? <span>{game.time}</span> : null}
                      {game.location ? <span>{game.location}</span> : null}
                    </div>
                    {isPlayed ? (
                      <div style={{ marginTop:"6px", paddingTop:"6px", borderTop:"1px solid " + C.subtleBorder, display:"flex", alignItems:"center", gap:"8px" }}>
                        <input
                          type="checkbox"
                          id={"county-" + game.id}
                          checked={!!game.scoreReported}
                          onChange={function(gid, val) { return function() {
                            persistSchedule(schedule.map(function(x) {
                              if (x.id !== gid) { return x; }
                              var g2 = {}; for (var k in x) { g2[k] = x[k]; }
                              g2.scoreReported = val;
                              return g2;
                            }));
                          }; }(game.id, !game.scoreReported)}
                          style={{ width:"15px", height:"15px", accentColor:C.gold, cursor:"pointer", flexShrink:0 }} />
                        <label htmlFor={"county-" + game.id} style={{ fontSize:"12px", color: game.scoreReported ? C.text : C.textMuted, cursor:"pointer", userSelect:"none" }}>
                          {game.scoreReported ? "✓ Score reported to the County" : "Report score to the County"}
                        </label>
                      </div>
                    ) : null}
                    {(function() {
                      var sa = { playerName: game.snackDuty || "", note: game.snackNote || "" };
                      var hasSa = !!sa.playerName;
                      return (
                        <div style={{ marginTop:"6px", paddingTop:"6px", borderTop:"1px solid " + C.subtleBorder }}>
                          <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
                            <span style={{ fontSize:"11px", color:C.textMuted, flexShrink:0 }}>🍎 Snack Duty</span>
                            <select
                              value={sa.playerName || ""}
                              onChange={function(gid) { return function(e) {
                                updateSnackField(gid, "playerName", e.target.value);
                              }; }(game.id)}
                              style={{ flex:"1 1 110px", minWidth:"100px", padding:"3px 6px", borderRadius:"5px", border:"1px solid rgba(15,31,61,0.15)", fontSize:"12px", fontFamily:"inherit", background:C.cardBg, color: hasSa ? C.text : C.textMuted }}>
                              <option value="">— Assign —</option>
                              {roster.slice().sort(function(a,b){ return (a.firstName||a.name||'').toLowerCase().localeCompare((b.firstName||b.name||'').toLowerCase()); }).map(function(p) {
                                return <option key={p.name} value={p.firstName || p.name}>{p.firstName || p.name}</option>;
                              })}
                            </select>
                            {hasSa && (
                              <button onClick={function(gid) { return function() { clearSnackAssignment(gid); }; }(game.id)}
                                style={{ background:"none", border:"none", cursor:"pointer", fontSize:"12px", color:C.textMuted, padding:"1px 3px", lineHeight:1 }} title="Clear">✕</button>
                            )}
                            <div style={{marginTop:'6px'}}>
                              <span style={{fontSize:'12px',color:'#666',fontWeight:500}}>🏆 Game Ball: </span>
                              <span style={{fontSize:'13px',color:'#1B2A4A',fontWeight: Array.isArray(game.gameBall) && game.gameBall.length > 0 ? 600 : 400}}>
                                {Array.isArray(game.gameBall) && game.gameBall.length > 0
                                  ? game.gameBall.join(', ')
                                  : <span style={{color:'#aaa'}}>—</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {(function() {
                      var todayStr = new Date().toLocaleDateString('en-CA');
                      var isPast = game.date && game.date <= todayStr;
                      if (isCanceled) {
                        return (
                          <button style={{ ...S.btn("ghost"), color:cancelColor, fontSize:"11px" }}
                            onClick={function() {
                              var g2 = {}; for (var k in game) { g2[k] = game[k]; }
                              g2.result = "";
                              persistSchedule(schedule.map(function(x) { return x.id === game.id ? g2 : x; }));
                            }}>Uncancel</button>
                        );
                      }
                      if (isPast && !game.scoreReported) {
                        return <button style={S.btn("primary")} onClick={function(g) { return function() {
                          var gCopy = {}; for (var k in g) { gCopy[k] = g[k]; }
                          if (!gCopy.battingPerf) { gCopy.battingPerf = {}; }
                          setNewGame(gCopy);
                          setEditingGame(g);
                          setShowGameForm(true);
                          setResultImport({ gameId:g.id, loading:false, error:"" });
                        }; }(game)}>{isPlayed ? "Edit Result" : "Add Result"}</button>;
                      }
                      return null;
                    })()}
                    <button style={S.btn("ghost")} onClick={function() { handleShareGame(game); }}>Share</button>
                    <button style={S.btn("ghost")} onClick={function(g) { return function() { startEdit(g); }; }(game)}>Edit</button>
                    <button style={{ ...S.btn("ghost"), color:C.red }} onClick={function(id) { return function() { if (confirm("Delete game?")) { deleteGame(id); } }; }(game.id)}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showShare ? (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"20px" }}>
            <div style={{ ...S.card, maxWidth:"420px", width:"100%", padding:"24px" }}>
              <div style={{ fontWeight:"bold", fontSize:"15px", marginBottom:"12px" }}>Share Lineup</div>
              <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"8px" }}>View-only link for coaches and parents:</div>
              <div style={{ padding:"10px", background:"#f8f4ee", borderRadius:"6px", fontSize:"11px", wordBreak:"break-all", marginBottom:"12px", border:"1px solid rgba(15,31,61,0.08)" }}>
                {shareGame ? shareGame.url : ""}
              </div>
              <div style={{ display:"flex", gap:"8px" }}>
                <button style={S.btn("primary")} onClick={function() {
                  var url = shareGame ? shareGame.url : "";
                  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url); }
                  setShowShare(false);
                }}>Copy Link</button>
                <button style={S.btn("ghost")} onClick={function() { setShowShare(false); setShareGame(null); }}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ============================================================
  // FEEDBACK TAB
  // ============================================================
  function renderFeedback() {
    var fbCats = ["General","Lineup Engine","Batting Order","Schedule","Sharing & Print","Performance","Other"];
    var fbChangePills = ["Fix a bug","Improve an existing feature","Add something new","Make it faster","Simplify the UI"];
    var bugLocs = ["Roster","Field Grid","Batting","Schedule","Print / PDF","Home Screen","Other"];
    var bugSevs = ["Blocks me completely","Annoying but I can work around it","Minor / cosmetic"];

    var allSubs = [];
    try {
      var fbSubs = loadJSON("feedback:submissions", []);
      var bugSubs = loadJSON("feedback:bugs", []);
      var combined = fbSubs.concat(bugSubs);
      combined.sort(function(a, b) { return b.timestamp - a.timestamp; });
      allSubs = combined.slice(0, 5);
    } catch(e) {}

    return (
      <div>

        {/* ── Section 1: General Feedback ───────────────────── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Share Feedback</div>
          <div style={{ color:C.textMuted, fontSize:"12px", marginBottom:"14px" }}>
            Help us improve the app. Tell us what’s working and what isn’t.
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Category</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {fbCats.map(function(cat) {
              var active = fbCategory === cat;
              return (
                <span key={cat} style={S.badge(C.navy, active)}
                  onClick={function(c) { return function() { setFbCategory(c); }; }(cat)}>
                  {cat}
                </span>
              );
            })}
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>Your Feedback</div>
          <textarea
            placeholder="Describe your feedback, suggestion, or idea..."
            value={fbBody}
            onChange={function(e) { setFbBody(e.target.value); }}
            style={{ ...S.input, minHeight:"120px", resize:"vertical", lineHeight:"1.5", display:"block", marginBottom:"12px" }}
          />

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>What would you like to see changed?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {fbChangePills.map(function(ct) {
              var active = fbChangeTypes.indexOf(ct) >= 0;
              return (
                <span key={ct} style={S.badge("#27ae60", active)}
                  onClick={function(cv) { return function() {
                    var idx = fbChangeTypes.indexOf(cv);
                    var next = fbChangeTypes.slice();
                    if (idx >= 0) { next.splice(idx, 1); } else { next.push(cv); }
                    setFbChangeTypes(next);
                  }; }(ct)}>
                  {ct}
                </span>
              );
            })}
          </div>

          <button style={S.btn("primary")} onClick={submitFeedback}>Send Feedback</button>
          {fbConfirm ? (
            <div style={{ marginTop:"10px", color:"#27ae60", fontSize:"12px", fontWeight:"bold" }}>{fbConfirm}</div>
          ) : null}
        </div>

        {/* ── Section 2: Report a Bug ──────────────────────── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Report an Issue</div>
          <div style={{ color:C.textMuted, fontSize:"12px", marginBottom:"14px" }}>
            Something not working right? Tell us what happened.
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Where did this happen?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {bugLocs.map(function(loc) {
              var active = bugLocation === loc;
              return (
                <span key={loc} style={S.badge(C.navy, active)}
                  onClick={function(l) { return function() { setBugLocation(l); }; }(loc)}>
                  {loc}
                </span>
              );
            })}
          </div>

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>What happened?</div>
          <textarea
            placeholder="Describe what happened and what you expected instead..."
            value={bugBody}
            onChange={function(e) { setBugBody(e.target.value); }}
            style={{ ...S.input, minHeight:"100px", resize:"vertical", lineHeight:"1.5", display:"block", marginBottom:"12px" }}
          />

          <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Severity</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"14px" }}>
            {bugSevs.map(function(sev) {
              var active = bugSeverity === sev;
              var sevColor = sev === "Blocks me completely" ? C.red : sev === "Annoying but I can work around it" ? "#d4a017" : "#6b7280";
              return (
                <span key={sev} style={S.badge(sevColor, active)}
                  onClick={function(s) { return function() { setBugSeverity(s); }; }(sev)}>
                  {sev}
                </span>
              );
            })}
          </div>

          <button style={S.btn("primary")} onClick={submitBug}>Report Issue</button>
          {bugConfirm ? (
            <div style={{ marginTop:"10px", color:"#27ae60", fontSize:"12px", fontWeight:"bold" }}>{bugConfirm}</div>
          ) : null}
        </div>

        {/* ── Submitted Feedback History ─────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onClick={function() { setFbHistoryOpen(!fbHistoryOpen); }}>
            <div style={{ fontSize:"11px", fontWeight:"bold", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {"Submitted Feedback" + (allSubs.length > 0 ? " (" + allSubs.length + " recent)" : "")}
            </div>
            <span style={{ fontSize:"11px", color:C.textMuted }}>{fbHistoryOpen ? "▲" : "▼"}</span>
          </div>
          {fbHistoryOpen ? (
            <div style={{ marginTop:"12px" }}>
              {allSubs.length === 0 ? (
                <div style={{ color:C.textMuted, fontSize:"12px" }}>No submissions yet.</div>
              ) : (
                <div>
                  {allSubs.map(function(sub) {
                    var dt = sub.timestamp ? new Date(sub.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " " + new Date(sub.timestamp).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : "";
                    var label = sub.category || sub.location || "";
                    var preview = (sub.body || "").length > 80 ? (sub.body || "").slice(0, 80) + "…" : (sub.body || "");
                    return (
                      <div key={sub.id} style={{ borderBottom:"1px solid rgba(15,31,61,0.06)", paddingBottom:"8px", marginBottom:"8px" }}>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"2px" }}>
                          <span style={{ fontSize:"10px", color:C.textMuted }}>{dt}</span>
                          {label ? <span style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"4px", background:"rgba(15,31,61,0.08)", color:C.navy, fontWeight:"bold" }}>{label}</span> : null}
                        </div>
                        <div style={{ fontSize:"11px", color:C.text }}>{preview}</div>
                      </div>
                    );
                  })}
                  <button style={{ ...S.btn("ghost"), color:C.red, marginTop:"4px" }}
                    onClick={function() {
                      if (confirm("Clear all saved feedback? This cannot be undone.")) {
                        try { localStorage.removeItem("feedback:submissions"); } catch(e2) {}
                        try { localStorage.removeItem("feedback:bugs"); } catch(e2) {}
                      }
                    }}>
                    Clear All
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    );
  }

  // ============================================================
  // PDF GENERATION
  // Builds a PDF from grid data using jsPDF (loaded from CDN).
  // No DOM-to-PDF conversion — built programmatically from data
  // so it works in the artifact sandbox and on mobile browsers.
  // ============================================================
  function generatePDF(mode) {
    // mode: "download" (default) or "share"
    if (mode === "share") { setPdfSharing(true); } else { setPdfLoading(true); }

    try {
        var doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
        var navy  = [15,31,61];
        var gold  = [245,200,66];
        var cream = [253,246,236];
        var W = 210; var margin = 14;
        var contentW = W - margin * 2;
        var y = margin;
        var teamName = activeTeam ? activeTeam.name : "My Team";
        var today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

        // ── Header ─────────────────────────────────────────────
        doc.setFillColor(navy[0], navy[1], navy[2]);
        doc.rect(0, 0, W, 28, "F");
        // M circle
        doc.setFillColor(200, 16, 46);
        doc.circle(margin + 7, 14, 6, "F");
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica","bold");
        doc.text("M", margin + 7, 16.5, { align:"center" });
        // Title
        doc.setTextColor(255,255,255);
        doc.setFontSize(16);
        doc.text(teamName + " - Game Day Lineup", margin + 18, 13);
        doc.setFontSize(9);
        doc.setFont("helvetica","normal");
        doc.setTextColor(180,200,220);
        doc.text(today, margin + 18, 20);
        y = 36;

        var innArr2 = [];
        for (var i = 0; i < innings; i++) { innArr2.push(i); }

        // ── Defensive section ────────────────────────────────────
        if (printOpt === "both" || printOpt === "defense") {
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica","bold");
          doc.text("DEFENSIVE ASSIGNMENTS", margin, y);
          y += 5;

          if (printDefView === "diamond") {
            // ── Diamond layout in PDF ──────────────────────────────
            var posLayoutPDF = [
              { pos:"LF", label:"Left Field",    cx:14,  cy:y },
              { pos:"LC", label:"Left Center",   cx:67,  cy:y },
              { pos:"RC", label:"Right Center",  cx:121, cy:y },
              { pos:"RF", label:"Right Field",   cx:174, cy:y },
              { pos:"SS", label:"Shortstop",     cx:68,  cy:y + 46 },
              { pos:"2B", label:"2nd Base",      cx:120, cy:y + 46 },
              { pos:"3B", label:"3rd Base",      cx:14,  cy:y + 46 },
              { pos:"P",  label:"Pitcher",       cx:94,  cy:y + 46 },
              { pos:"1B", label:"1st Base",      cx:174, cy:y + 46 },
              { pos:"C",  label:"Catcher",       cx:94,  cy:y + 92 }
            ];

            var pBoxW = 52; var pLineH = 4.2; var pHeaderH = 5.5;

            for (var pli2 = 0; pli2 < posLayoutPDF.length; pli2++) {
              var pl2 = posLayoutPDF[pli2];
              var pc3 = POS_COLORS[pl2.pos] || "#555";
              var pc3safe = pc3.length === 4 ? "#" + pc3[1]+pc3[1]+pc3[2]+pc3[2]+pc3[3]+pc3[3] : pc3;
              var rgb3 = [parseInt(pc3safe.slice(1,3),16)||85, parseInt(pc3safe.slice(3,5),16)||85, parseInt(pc3safe.slice(5,7),16)||85];
              var pBoxH2 = pHeaderH + innings * pLineH + 2;

              doc.setDrawColor(rgb3[0],rgb3[1],rgb3[2]);
              doc.setLineWidth(0.6);
              doc.roundedRect(pl2.cx, pl2.cy, pBoxW, pBoxH2, 1.5, 1.5, "S");
              doc.setFillColor(rgb3[0],rgb3[1],rgb3[2]);
              doc.roundedRect(pl2.cx, pl2.cy, pBoxW, pHeaderH, 1.5, 1.5, "F");
              doc.rect(pl2.cx, pl2.cy + 2, pBoxW, pHeaderH - 2, "F");
              doc.setTextColor(255,255,255);
              doc.setFontSize(6.5);
              doc.setFont("helvetica","bold");
              doc.text(pl2.label.toUpperCase(), pl2.cx + pBoxW/2, pl2.cy + 3.8, { align:"center" });

              for (var pinn = 0; pinn < innings; pinn++) {
                var pRowY = pl2.cy + pHeaderH + pinn * pLineH + pLineH/2 + 1;
                var pFound = "";
                for (var pri3 = 0; pri3 < roster.length; pri3++) {
                  if ((grid[roster[pri3].name]||[])[pinn] === pl2.pos) { pFound = roster[pri3].name; break; }
                }
                doc.setTextColor(170,170,170);
                doc.setFontSize(5.5);
                doc.text(String(pinn+1), pl2.cx + 3, pRowY + 1);
                if (pFound) {
                  doc.setTextColor(25,30,60);
                  doc.setFont("helvetica","bold");
                } else {
                  doc.setTextColor(200,200,200);
                  doc.setFont("helvetica","normal");
                }
                doc.setFontSize(6.5);
                doc.text(pFound ? firstName(pFound) : "-", pl2.cx + 8, pRowY + 1);
              }
            }
            y += 192;

            // Bench strip
            doc.setTextColor(navy[0],navy[1],navy[2]);
            doc.setFontSize(7.5);
            doc.setFont("helvetica","bold");
            doc.text("BENCH", margin, y);
            y += 4;
            var pBColW = contentW / innings;
            var pBRowH = 6;
            for (var pbi = 0; pbi < innings; pbi++) {
              doc.setFillColor(245,239,228);
              doc.rect(margin + pbi*pBColW, y, pBColW, pBRowH, "F");
              doc.setDrawColor(200,195,188);
              doc.setLineWidth(0.2);
              doc.rect(margin + pbi*pBColW, y, pBColW, pBRowH);
              doc.setTextColor(80,80,80);
              doc.setFontSize(6);
              doc.setFont("helvetica","bold");
              doc.text("Inn "+(pbi+1), margin + pbi*pBColW + pBColW/2, y + 4, {align:"center"});
            }
            y += pBRowH;
            var pMaxB = 0;
            for (var pbi2 = 0; pbi2 < innings; pbi2++) {
              var pCnt = roster.filter(function(r){return (grid[r.name]||[])[pbi2]==="Bench";}).length;
              if (pCnt > pMaxB) pMaxB = pCnt;
            }
            for (var pbr = 0; pbr < pMaxB; pbr++) {
              for (var pbi3 = 0; pbi3 < innings; pbi3++) {
                var pBRoster = roster.filter(function(r){return (grid[r.name]||[])[pbi3]==="Bench";});
                var pBName = pBRoster[pbr] ? pBRoster[pbr].name : "";
                doc.setFillColor(pbr%2===0?255:250);
                doc.rect(margin + pbi3*pBColW, y, pBColW, pBRowH, "F");
                doc.setDrawColor(220,215,208);
                doc.setLineWidth(0.2);
                doc.rect(margin + pbi3*pBColW, y, pBColW, pBRowH);
                if (pBName) {
                  doc.setTextColor(25,30,60);
                  doc.setFont("helvetica","bold");
                  doc.setFontSize(6.5);
                  doc.text(firstName(pBName), margin + pbi3*pBColW + pBColW/2, y + 4, {align:"center"});
                }
              }
              y += pBRowH;
            }
            // Out Tonight strip in PDF
            var pMaxOut = 0;
            for (var pobi = 0; pobi < innings; pobi++) {
              var pOutCnt = roster.filter(function(r){return (grid[r.name]||[])[pobi]==="Out";}).length;
              if (pOutCnt > pMaxOut) pMaxOut = pOutCnt;
            }
            if (pMaxOut > 0) {
              for (var pobi2 = 0; pobi2 < innings; pobi2++) {
                doc.setFillColor(254,226,226);
                doc.rect(margin + pobi2*pBColW, y, pBColW, pBRowH, "F");
                doc.setDrawColor(220,38,38);
                doc.setLineWidth(0.2);
                doc.rect(margin + pobi2*pBColW, y, pBColW, pBRowH);
                doc.setTextColor(220,38,38);
                doc.setFontSize(5.5);
                doc.setFont("helvetica","bold");
                doc.text("OUT TONIGHT", margin + pobi2*pBColW + pBColW/2, y + 4, {align:"center"});
              }
              y += pBRowH;
              for (var por = 0; por < pMaxOut; por++) {
                for (var pobi3 = 0; pobi3 < innings; pobi3++) {
                  var pOutRoster = roster.filter(function(r){return (grid[r.name]||[])[pobi3]==="Out";});
                  var pOutName = pOutRoster[por] ? pOutRoster[por].name : "";
                  doc.setFillColor(254,226,226);
                  doc.rect(margin + pobi3*pBColW, y, pBColW, pBRowH, "F");
                  doc.setDrawColor(220,38,38);
                  doc.setLineWidth(0.2);
                  doc.rect(margin + pobi3*pBColW, y, pBColW, pBRowH);
                  if (pOutName) {
                    doc.setTextColor(220,38,38);
                    doc.setFont("helvetica","bold");
                    doc.setFontSize(6.5);
                    doc.text(firstName(pOutName), margin + pobi3*pBColW + pBColW/2, y + 4, {align:"center"});
                  }
                }
                y += pBRowH;
              }
            }
            y += (printOpt === "both" ? 8 : 0);

          } else {
            // ── Grid table in PDF (existing) ──────────────────────

          var colW = contentW / (innArr2.length + 1);
          var nameColW = colW * 1.8;
          var innColW = (contentW - nameColW) / innArr2.length;
          var rowH = 8;

          // Header row
          doc.setFillColor(cream[0], cream[1], cream[2]);
          doc.rect(margin, y, contentW, rowH, "F");
          doc.setDrawColor(navy[0], navy[1], navy[2]);
          doc.setLineWidth(0.4);
          doc.rect(margin, y, contentW, rowH);
          doc.setFontSize(7.5);
          doc.setFont("helvetica","bold");
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.text("PLAYER", margin + 3, y + 5.2);
          for (var ii = 0; ii < innArr2.length; ii++) {
            var hx = margin + nameColW + ii * innColW + innColW / 2;
            doc.text("INN " + (ii + 1), hx, y + 5.2, { align:"center" });
          }
          y += rowH;

          // Data rows
          doc.setFont("helvetica","normal");
          for (var ri = 0; ri < roster.length; ri++) {
            var info2 = roster[ri];
            var rowBg = ri % 2 === 0 ? [255,255,255] : [250,248,245];
            doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
            doc.rect(margin, y, contentW, rowH, "F");
            doc.setDrawColor(220, 215, 208);
            doc.setLineWidth(0.2);
            doc.line(margin, y + rowH, margin + contentW, y + rowH);

            doc.setFontSize(8.5);
            doc.setFont("helvetica","bold");
            doc.setTextColor(navy[0], navy[1], navy[2]);
            doc.text(firstName(info2.name), margin + 3, y + 5.2);

            doc.setFont("helvetica","normal");
            for (var ci = 0; ci < innArr2.length; ci++) {
              var pos2 = (grid[info2.name] || [])[ci] || "";
              var cx = margin + nameColW + ci * innColW + innColW / 2;
              if (pos2 === "Out") {
                doc.setFillColor(254,226,226);
                doc.roundedRect(cx - innColW/2 + 2, y + 1.5, innColW - 4, rowH - 3, 1.5, 1.5, "F");
                doc.setTextColor(220,38,38);
                doc.setFontSize(7);
                doc.setFont("helvetica","bold");
                doc.text("OUT", cx, y + 5.4, { align:"center" });
              } else if (pos2 && pos2 !== "") {
                // Color pill per position
                var pc = POS_COLORS[pos2] || "#555";
                var pcsafe = pc.length === 4 ? "#" + pc[1]+pc[1]+pc[2]+pc[2]+pc[3]+pc[3] : pc;
                var rgb = [parseInt(pcsafe.slice(1,3),16)||85, parseInt(pcsafe.slice(3,5),16)||85, parseInt(pcsafe.slice(5,7),16)||85];
                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                doc.roundedRect(cx - innColW/2 + 2, y + 1.5, innColW - 4, rowH - 3, 1.5, 1.5, "F");
                doc.setTextColor(255,255,255);
                doc.setFontSize(7.5);
                doc.setFont("helvetica","bold");
                doc.text(pos2, cx, y + 5.4, { align:"center" });
              } else {
                doc.setTextColor(180,180,180);
                doc.setFontSize(8);
                doc.text("-", cx, y + 5.2, { align:"center" });
              }
            }
            y += rowH;
          }
            y += 8;
          } // end grid table else
        }

        // ── Batting Order ───────────────────────────────────────
        if (printOpt === "both" || printOpt === "batting") {
          // New page if not enough space
          if (y > 220) { doc.addPage(); y = margin; }

          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica","bold");
          doc.text("BATTING ORDER", margin, y);
          y += 5;
          doc.setFontSize(7);
          doc.setFont("helvetica","italic");
          doc.setTextColor(120, 120, 120);
          doc.text("Players are listed in batting order. To change the order, update the Batting tab first.", margin, y);
          doc.setTextColor(navy[0], navy[1], navy[2]);
          y += 5;

          var batCols = 2;
          var batColW = contentW / batCols;

          // Pre-compute per-player row heights (taller if song data exists)
          var batRowHeights = activeBattingOrder.map(function(bn) {
            var sp = roster.find(function(r) { return r.name === bn; });
            return (sp && (sp.walkUpSong || sp.walkUpArtist)) ? 14 : 9;
          });

          // Compute y offsets per logical row (rows are pairs of players)
          var batRowCount = Math.ceil(activeBattingOrder.length / batCols);
          var batRowYOffsets = [0];
          for (var bri = 0; bri < batRowCount - 1; bri++) {
            var leftH  = batRowHeights[bri * batCols]     || 9;
            var rightH = batRowHeights[bri * batCols + 1] || 9;
            batRowYOffsets.push(batRowYOffsets[bri] + Math.max(leftH, rightH));
          }

          for (var bi = 0; bi < activeBattingOrder.length; bi++) {
            var bname = activeBattingOrder[bi];
            var col = bi % batCols;
            var row = Math.floor(bi / batCols);
            var bx = margin + col * batColW;
            var by = y + batRowYOffsets[row];
            var leftH2  = batRowHeights[row * batCols]     || 9;
            var rightH2 = batRowHeights[row * batCols + 1] || 9;
            var cardH = Math.max(leftH2, rightH2) - 1;

            // Card background
            doc.setFillColor(255,255,255);
            doc.setDrawColor(220,215,208);
            doc.setLineWidth(0.3);
            doc.roundedRect(bx + 1, by, batColW - 2, cardH, 1.5, 1.5, "FD");

            // Number circle
            doc.setFillColor(navy[0], navy[1], navy[2]);
            doc.circle(bx + 6, by + 4.3, 3.2, "F");
            doc.setTextColor(255,255,255);
            doc.setFontSize(7);
            doc.setFont("helvetica","bold");
            doc.text(String(bi + 1), bx + 6, by + 5.6, { align:"center" });

            // Name
            doc.setTextColor(navy[0], navy[1], navy[2]);
            doc.setFontSize(9);
            doc.setFont("helvetica","bold");
            doc.text(firstName(bname), bx + 11, by + 5);

            // Song line (if present)
            var songPlayer = roster.find(function(r) { return r.name === bname; });
            if (songPlayer && (songPlayer.walkUpSong || songPlayer.walkUpArtist)) {
              doc.setFontSize(6.5);
              doc.setFont("helvetica", "italic");
              doc.setTextColor(80, 80, 80);
              var songLine = [songPlayer.walkUpSong, songPlayer.walkUpArtist].filter(Boolean).join(" — ");
              if (songPlayer.walkUpStart && songPlayer.walkUpEnd) {
                songLine += "  (" + songPlayer.walkUpStart + "–" + songPlayer.walkUpEnd + ")";
              }
              doc.text(songLine, bx + 11, by + 8.5, { maxWidth: batColW - 14 });
              doc.setTextColor(0, 0, 0);
              doc.setFont("helvetica", "normal");
            }

            // Field positions
            var fpos = [];
            var hasOut = false;
            for (var fii = 0; fii < innings; fii++) {
              var fp = (grid[bname] || [])[fii];
              if (!fp || fp === "") {
                fpos.push("-");
              } else if (fp === "Bench") {
                fpos.push("–");
              } else if (fp === "Out") {
                fpos.push("OUT");
                hasOut = true;
              } else {
                fpos.push(fp);
              }
            }
            if (fpos.length > 0) {
              var fposY = (songPlayer && (songPlayer.walkUpSong || songPlayer.walkUpArtist)) ? by + 12 : by + 7.5;
              if (hasOut) {
                doc.setTextColor(220,38,38);
                doc.setFontSize(6.5);
                doc.setFont("helvetica","bold");
              } else {
                doc.setTextColor(120, 130, 150);
                doc.setFontSize(6.5);
                doc.setFont("helvetica","normal");
              }
              doc.text(fpos.join(" "), bx + 11, fposY);
            }
          }
          var totalBatH = batRowYOffsets[batRowCount - 1] + (Math.max(batRowHeights[(batRowCount-1)*batCols] || 9, batRowHeights[(batRowCount-1)*batCols+1] || 9));
          y += totalBatH + 4;
          if (absentTonight.length > 0) {
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            var _absentNote = "* Not in tonight\u2019s lineup: " + absentTonight.map(function(n) { return n.split(" ")[0]; }).join(", ");
            doc.text(_absentNote, margin, y);
            y += 4;
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
          }
        }

        // ── Footer ──────────────────────────────────────────────
        var pageH = doc.internal.pageSize.height;
        doc.setTextColor(150, 160, 175);
        doc.setFontSize(7);
        doc.setFont("helvetica","normal");
        doc.text("Dugout Lineup - " + teamName + (activeTeam && activeTeam.ageGroup ? " " + activeTeam.ageGroup : ""), margin, pageH - 8);
        doc.text(today, W - margin, pageH - 8, { align:"right" });

        // ── Save or Share ────────────────────────────────────────
        var filename = teamName.replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-lineup-" + new Date().toISOString().slice(0,10) + ".pdf";
        if (mode === "share") {
          track("share_pdf", { team_id: activeTeamId, method: "pdf_download", share_type: "lineup_pdf", has_game_id: false });
        } else {
          track("download_pdf", {});
        }

        if (mode === "share") {
          // Web Share API v2 file sharing.
          // Use arraybuffer → explicit Blob to avoid jsPDF returning Uint8Array.
          // iOS Safari requires navigator.share() to be called synchronously
          // within the user-gesture chain — PDF generation must complete first.
          try {
            var ab   = doc.output("arraybuffer");
            var blob = new Blob([ab], { type:"application/pdf" });
            var file = new File([blob], filename, { type:"application/pdf" });
            var canShareFiles = (
              typeof navigator.share === "function" &&
              typeof navigator.canShare === "function" &&
              navigator.canShare({ files: [file] })
            );
            if (canShareFiles) {
              navigator.share({
                title: teamName + " Lineup",
                text:  "Game day lineup for " + teamName,
                files: [file]
              }).then(function() {
                setPdfSharing(false);
              }).catch(function(err) {
                if (err.name !== "AbortError") {
                  // Share failed — fall back to download silently
                  doc.save(filename);
                }
                setPdfSharing(false);
              });
            } else {
              // Device/browser doesn't support file sharing — download instead
              doc.save(filename);
              setPdfSharing(false);
            }
          } catch (shareErr) {
            console.warn("Share setup failed:", shareErr);
            doc.save(filename);
            setPdfSharing(false);
          }
        } else {
          doc.save(filename);
          setPdfLoading(false);
        }
    } catch(err) {
      setPdfLoading(false);
      setPdfSharing(false);
      console.error("PDF generation error:", err);
      alert("PDF generation failed: " + err.message);
    }
  }

  // ============================================================
  // LINKS TAB
  // ============================================================
  function renderLinks() {
    var LINKS = [
      {
        group: "Schedule & Registration",
        items: [
          {
            label: "County Official Game Schedule",
            desc: "Forsyth County 2026 Youth Baseball & Softball — full season schedule",
            url: COUNTY_SCHEDULE_URL,
            emoji: "📅",
            campaign: CAMPAIGNS.COUNTY_LEAGUE,
            content: CONTENT.SCHEDULE_TAB
          },
          {
            label: "Report Game Score",
            desc: "Submit the final score after a completed game — must be done within 24 hours",
            url: "https://forms.office.com/pages/responsepage.aspx?id=vf3EubbvekefszJiSiLNcOoWxPqaa4FBtgle0rAQ6bBURVExSDNDNEFTTkRaMVlRR0lNUDVGOUtFVy4u&route=shorturl",
            emoji: "📝",
            campaign: CAMPAIGNS.COUNTY_LEAGUE,
            content: CONTENT.GAME_INFO_CARD
          },
          {
            label: "Field & Cage Request",
            desc: "Request field or batting cage time from Forsyth County Parks",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeCIvqZlGsxonkWpFJ52q_6PWrOl3mmOTjTdiPGcz3ZQGzJDQ/viewform",
            emoji: "⚾",
            campaign: CAMPAIGNS.COUNTY_LEAGUE,
            content: CONTENT.GAME_INFO_CARD
          }
        ]
      },
      {
        group: "League & Club",
        items: [
          {
            label: "Sharon Springs Athletics",
            desc: "Sharon Springs community athletics — league info, teams, and events",
            url: "https://sharonspringsathletics.org/",
            emoji: "🏆",
            campaign: CAMPAIGNS.SHARON_SPRINGS,
            content: CONTENT.STANDINGS_LINK
          }
        ]
      },
      {
        group: "Weather & Alerts",
        items: [
          {
            label: "Inclement Weather Updates",
            desc: "Forsyth County Parks — field closures and weather delays",
            url: "https://parks.forsythco.com/Athletic-Leagues/Inclement-Weather-Information",
            emoji: "⛈️",
            campaign: CAMPAIGNS.GENERAL,
            content: CONTENT.SCHEDULE_TAB
          },
          {
            label: "Status Me Auto Alerts",
            desc: "Sign up for automatic game status notifications",
            url: "https://statusme.com/",
            emoji: "🔔",
            campaign: CAMPAIGNS.GENERAL,
            content: CONTENT.SCHEDULE_TAB
          }
        ]
      }
    ];

    return (
      <div>
        {LINKS.map(function(section) {
          return (
            <div key={section.group} style={S.card}>
              <div style={S.sectionTitle}>{section.group}</div>
              {section.items.map(function(link, li) {
                return (
                  <div key={li} style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"12px 0",
                      borderBottom: li < section.items.length - 1 ? "1px solid rgba(15,31,61,0.07)" : "none" }}>
                    <span style={{ fontSize:"22px", lineHeight:"1", marginTop:"2px", flexShrink:0 }}>{link.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:C.navy, marginBottom:"3px" }}>{link.label}</div>
                      <div style={{ fontSize:"11px", color:C.textMuted, lineHeight:"1.5", marginBottom:"5px" }}>{link.desc}</div>
                      <div style={{ fontSize:"12px" }}>
                        <a {...outboundLinkProps(link.url, { campaign: link.campaign, content: link.content })} style={{ color:"#2563eb", textDecoration:"none" }}>🔗 Click here</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // ABOUT TAB
  // ============================================================
  function renderAbout() {
    var onboardingSteps = [
      {
        title: "Step 1 \u2014 Install the App",
        body: "iOS: Tap the Share button in Safari, then \u201cAdd to Home Screen.\u201d Android: Tap \u22ee in Chrome, then \u201cAdd to Home Screen\u201d or \u201cInstall App.\u201d The app works offline after first load \u2014 no signal needed at the field."
      },
      {
        title: "Step 2 \u2014 Create Your Team",
        body: "From the Home screen, tap \u201cCreate New Team.\u201d Enter your team name, age group, and season year. Tap the team card to open it."
      },
      {
        title: "Step 3 \u2014 Build Your Roster",
        body: "Go to the Roster tab. Tap \u201cAdd Player\u201d for each player. Expand each player card to set fielding attributes, batting attributes, running, and preferred positions. The more you fill in, the better the auto-assign engine performs."
      },
      {
        title: "Step 4 \u2014 Add Your Schedule",
        body: "Go to the Team tab, then the Schedule sub-tab. Tap \u201cAdd Game\u201d to enter games manually, or use AI Photo Import to photograph your printed schedule \u2014 it parses automatically in seconds."
      },
      {
        title: "Step 5 \u2014 Generate a Lineup",
        body: "Go to the Game Day tab, then Defense. Set your innings (4, 5, or 6). Tap \u201cAuto-Assign.\u201d The engine places 10 players per inning with 1 on bench, rotating fairly across all positions."
      },
      {
        title: "Step 6 \u2014 Set the Batting Order",
        body: "Go to the Game Day tab, then Batting. Tap \u201cSuggest Order\u201d for a stats-driven recommendation. Use the up/down arrows to reorder on mobile, or drag cards on desktop."
      },
      {
        title: "Step 7 \u2014 Share With Your Team",
        body: "Go to the Team tab, then Schedule. Tap a game then \u201cShare Lineup.\u201d Send the link to parents and scorekeepers \u2014 no account needed to view."
      },
      {
        title: "Step 8 \u2014 Back Up Your Data",
        body: "Tap \u00b7\u00b7\u00b7 on any team card to Download Backup and save a JSON file. To restore, go to the Roster tab \u2014 if your roster is empty, tap \u201cRestore from backup file.\u201d Back up after every few games."
      }
    ];

    return (
      <div>
        {/* ── Section 0: What Is This App ─────────────────────── */}
        <div style={S.card}>
          <div style={{ fontSize:"15px", fontWeight:"bold", color:C.navy, marginBottom:"10px" }}>What is Dugout Lineup?</div>
          <div style={{ fontSize:"13px", color:C.text, lineHeight:"1.7", marginBottom:"10px" }}>
            Dugout Lineup is a free tool built for youth baseball and softball coaches. It takes the stress out of game day by helping you build a fair, smart field lineup in seconds — no spreadsheets, no paper charts, no arguments about who played where last game.
          </div>
          <div style={{ fontSize:"13px", color:C.text, lineHeight:"1.7", marginBottom:"10px" }}>
            Tell it your roster, your players' positions, and how many innings you're playing. Tap Auto-Assign and it rotates every kid fairly — keeping track of bench time, position preferences, and who played where across every inning.
          </div>
          <div style={{ fontSize:"13px", color:C.text, lineHeight:"1.7", marginBottom:"14px" }}>
            It also tracks your season schedule, batting stats, walk-up songs, and snack duty — everything a volunteer coach needs, right in their pocket.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
            {["Free forever","Works offline","No account needed","iOS + Android"].map(function(tag) {
              return (
                <span key={tag} style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"10px", background:"rgba(15,31,61,0.07)", color:C.navy, fontWeight:"bold" }}>{tag}</span>
              );
            })}
          </div>
        </div>
        {/* ── Section 1: App Info ──────────────────────────────── */}
        <div style={S.card}>
          <div style={{ fontSize:"20px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>Dugout Lineup &#x26be; <span style={{ fontSize:"13px", fontWeight:"normal", color:C.textMuted }}>v{APP_VERSION}</span></div>
          <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"12px" }}>Built for youth baseball coaches. Runs at the field.</div>
          <div style={{ marginBottom:"14px" }}>
            <a href="https://dugoutlineup.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:"12px", color:C.red, fontWeight:"bold", textDecoration:"none" }}>
              Open in Browser ↗
            </a>
          </div>
          <button style={S.btn("primary")}
            onClick={function() {
              var url = "https://dugoutlineup.com";
              var text = "Dugout Lineup — free lineup tool for youth baseball coaches. Runs at the field, works offline.";
              if (navigator.share) {
                navigator.share({ title: "Dugout Lineup", text: text, url: url }).catch(function() {});
              } else {
                try { navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); } catch(e) {}
              }
            }}>
            Share App Now
          </button>
        </div>

        {/* ── Section 2: How to Use (collapsible) ─────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onClick={function() { setAboutGuideOpen(!aboutGuideOpen); }}>
            <div style={S.sectionTitle}>How to Use This App</div>
            <span style={{ fontSize:"12px", color:C.textMuted, marginBottom:"14px" }}>{aboutGuideOpen ? "\u25b2" : "\u25bc"}</span>
          </div>
          {aboutGuideOpen ? (
            <div>
              {onboardingSteps.map(function(step, si) {
                return (
                  <div key={si} style={{ marginBottom:"14px", paddingBottom:"14px", borderBottom: si < onboardingSteps.length - 1 ? "1px solid rgba(15,31,61,0.07)" : "none" }}>
                    <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>{step.title}</div>
                    <div style={{ fontSize:"12px", color:C.text, lineHeight:"1.6" }}>{step.body}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

      </div>
    );
  }

  function renderUpdates() {
    return (
      <div style={S.card}>
        <div style={S.sectionTitle}>What&#x27;s New</div>
        {VERSION_HISTORY.map(function(v, vi) {
          var isCurrent = v.version === APP_VERSION;
          var isOpen = expandedVersion === v.version;
          return (
            <div key={v.version} style={{
              borderLeft: isCurrent ? "3px solid #27ae60" : "3px solid rgba(15,31,61,0.1)",
              background: isCurrent ? "rgba(39,174,96,0.04)" : "transparent",
              borderRadius: "0 6px 6px 0",
              padding: "10px 14px",
              marginBottom: vi < VERSION_HISTORY.length - 1 ? "12px" : "0"
            }}>
              <div
                onClick={function(ver) { return function() { setExpandedVersion(expandedVersion === ver ? null : ver); }; }(v.version)}
                style={{ display:"flex", gap:"10px", alignItems:"baseline", marginBottom: isOpen ? "8px" : "0", flexWrap:"wrap", cursor:"pointer" }}>
                <span style={{ fontSize:"14px", fontWeight:"bold", color:C.navy }}>v{v.version}</span>
                <span style={{ fontSize:"11px", color:C.textMuted }}>{v.date}</span>
                {isCurrent ? <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"10px", background:"#27ae60", color:"#fff", fontWeight:"bold" }}>Current</span> : null}
                <span style={{ marginLeft:"auto", fontSize:"11px", color:C.textMuted }}>{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen ? (
                <div>
                  <div style={{ fontSize:"0.95rem", fontWeight:"600", color:C.text, marginBottom:"6px", lineHeight:"1.4" }}>{v.headline}</div>
                  {v.userChanges && v.userChanges.length > 0 ? (
                    <ul style={{ margin:"0 0 6px 0", paddingLeft:"0", listStyle:"none" }}>
                      {v.userChanges.map(function(ch, ci) {
                        return (
                          <li key={ci} style={{ fontSize:"0.875rem", color:C.textMuted, marginBottom:"3px", lineHeight:"1.5", display:"flex", gap:"6px" }}>
                            <span style={{ color:"#b8a040", flexShrink:0 }}>✦</span>
                            <span>{ch}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {v.techNote ? (
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af", fontStyle:"italic" }}>🔧 {v.techNote}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // PIN MODAL
  // ============================================================
  function renderPinModal() {
    if (!pinModal) return null;
    var title, subtitle, showConfirm = false;
    if (pinModal === "unlock") {
      title = "🔒 Unlock Lineup"; subtitle = "Enter your coach PIN to unlock for editing.";
    } else if (pinModal === "finalize") {
      title = "Enter coach PIN to confirm lock"; subtitle = "Enter your PIN to lock and protect this lineup.";
    } else if (pinModal === "setup") {
      title = "🔐 Set Coach PIN"; subtitle = "Choose a 4-digit PIN to protect your finalized lineup.";
      showConfirm = true;
    } else if (pinModal === "change1") {
      title = "🔐 Change PIN"; subtitle = "Enter your current PIN to continue.";
    } else if (pinModal === "change2") {
      title = "🔐 Set New PIN"; subtitle = "Enter your new 4-digit PIN.";
      showConfirm = true;
    } else if (pinModal === "remove") {
      title = "Remove PIN"; subtitle = "Enter your PIN to remove lineup protection.";
    }
    function handlePinSubmit() {
      if (pinModal === "unlock") {
        if (pinInput !== coachPin) { setPinError("Incorrect PIN."); return; }
        persistLineupLocked(false);
        setPinModal(null); setPinInput(""); setPinError("");
      } else if (pinModal === "finalize") {
        if (pinInput !== coachPin) { setPinError("Incorrect PIN."); return; }
        persistLineupLocked(true);
        setPinModal(null); setPinInput(""); setPinError("");
      } else if (pinModal === "setup") {
        if (!/^\d{4}$/.test(pinInput)) { setPinError("PIN must be exactly 4 digits."); return; }
        if (pinInput !== pinConfirm) { setPinError("PINs don't match. Try again."); return; }
        persistCoachPin(pinInput);
        setPinModal(null); setPinInput(""); setPinConfirm(""); setPinError("");
      } else if (pinModal === "change1") {
        if (pinInput !== coachPin) { setPinError("Incorrect PIN."); return; }
        setPinModal("change2"); setPinInput(""); setPinConfirm(""); setPinError("");
      } else if (pinModal === "change2") {
        if (!/^\d{4}$/.test(pinInput)) { setPinError("PIN must be exactly 4 digits."); return; }
        if (pinInput !== pinConfirm) { setPinError("PINs don't match. Try again."); return; }
        persistCoachPin(pinInput);
        setPinModal(null); setPinInput(""); setPinConfirm(""); setPinError("");
      } else if (pinModal === "remove") {
        if (pinInput !== coachPin) { setPinError("Incorrect PIN."); return; }
        persistCoachPin("");
        setPinModal(null); setPinInput(""); setPinError("");
      }
    }
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
        onClick={function(e) { if (e.target === e.currentTarget) { setPinModal(null); setPinInput(""); setPinConfirm(""); setPinError(""); } }}>
        <div style={{ background:"#fff", borderRadius:"16px", padding:"24px", maxWidth:"300px", width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize:"17px", fontWeight:"bold", color:C.navy, marginBottom:"6px" }}>{title}</div>
          <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"16px", lineHeight:"1.5" }}>{subtitle}</div>
          <input type="password" inputMode="numeric" maxLength={4} placeholder="· · · ·"
            value={pinInput} onChange={function(e) { setPinInput(e.target.value.replace(/\D/g,"")); setPinError(""); }}
            onKeyDown={function(e) { if (e.key === "Enter") { handlePinSubmit(); } }}
            style={{ width:"100%", padding:"12px", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.2)", fontSize:"24px", letterSpacing:"12px", textAlign:"center", marginBottom:"8px", fontFamily:"monospace", boxSizing:"border-box" }}
            autoFocus />
          {showConfirm ? (
            <input type="password" inputMode="numeric" maxLength={4} placeholder="Confirm PIN"
              value={pinConfirm} onChange={function(e) { setPinConfirm(e.target.value.replace(/\D/g,"")); setPinError(""); }}
              onKeyDown={function(e) { if (e.key === "Enter") { handlePinSubmit(); } }}
              style={{ width:"100%", padding:"12px", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.2)", fontSize:"24px", letterSpacing:"12px", textAlign:"center", marginBottom:"8px", fontFamily:"monospace", boxSizing:"border-box" }} />
          ) : null}
          {pinError ? <div style={{ color:C.red, fontSize:"12px", marginBottom:"10px" }}>{pinError}</div> : null}
          <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
            <button onClick={function() { setPinModal(null); setPinInput(""); setPinConfirm(""); setPinError(""); }}
              style={{ ...S.btn("ghost"), flex:1 }}>Cancel</button>
            <button onClick={handlePinSubmit}
              style={{ ...S.btn("primary"), flex:1 }}>Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PRINT TAB
  // ============================================================
  function renderPrint() {
    var teamName = activeTeam ? activeTeam.name : "My Team";
    var today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
    var innArr = [];
    for (var i = 0; i < innings; i++) { innArr.push(i); }

    return (
      <div>
        {/* ── Share bottom sheet ─────────────────────────────────── */}
        {showShareSheet ? (
          <>
            <div onClick={function() { setShowShareSheet(false); }}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:10000 }} />
            <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:10001,
              background:"#fff", borderRadius:"16px 16px 0 0",
              padding:"20px 20px 36px", maxWidth:"500px", margin:"0 auto" }}>
              <div style={{ fontSize:"13px", fontWeight:"bold", color:C.navy, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"16px", textAlign:"center" }}>
                Share Lineup
              </div>
              {(backendHealth.status === 'slow' || backendHealth.status === 'down') ? (
                <div style={{ fontSize:"11px", color:"#92400e", background:"rgba(180,83,9,0.07)", border:"1px solid rgba(180,83,9,0.2)", borderRadius:"8px", padding:"8px 10px" }}>
                  ⏳ Server is warming up — sharing may take up to 30 seconds
                </div>
              ) : null}
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.2)", padding:"13px", fontSize:"14px", textAlign:"left" }}
                  onClick={function() { setShowShareSheet(false); shareCurrentLineup(); }}>
                  🔗 Share as Link
                </button>
                {(runtimeFlags.VIEWER_MODE || localStorage.getItem("flag:viewer_mode") === "1") ? (
                  <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.2)", padding:"13px", fontSize:"14px", textAlign:"left" }}
                    onClick={function() { setShowShareSheet(false); shareViewerLink(); }}>
                    👁 Share Viewer Link
                  </button>
                ) : null}
                <button style={{ ...S.btn("ghost"), border:"1px solid rgba(15,31,61,0.2)", padding:"13px", fontSize:"14px", textAlign:"left" }}
                  onClick={function() { setShowShareSheet(false); generatePDF("share"); }} disabled={pdfLoading || pdfSharing}>
                  📤 {pdfSharing ? "Preparing..." : "Share as PDF"}
                </button>
                <button style={{ ...S.btn("gold"), padding:"13px", fontSize:"14px" }}
                  onClick={function() { setShowShareSheet(false); generatePDF("download"); }} disabled={pdfLoading || pdfSharing}>
                  ⬇ {pdfLoading ? "Generating..." : "Download PDF"}
                </button>
                <button style={{ ...S.btn("ghost"), padding:"11px", fontSize:"13px", color:C.textMuted }}
                  onClick={function() { setShowShareSheet(false); }}>
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* ── Primary action bar ─────────────────────────────────── */}
        <div style={{ marginBottom:"12px" }}>
          <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
            {/* Share Lineup — opens bottom sheet */}
            <button style={{ ...S.btn("primary"), display:"flex", alignItems:"center", gap:"6px" }}
              onClick={function() { setShowShareSheet(true); }}>
              <span>📤</span> Share Lineup
            </button>
            {/* Edit Lineup — jumps to Lineups tab */}
            <button style={{ ...S.btn("gold"), display:"flex", alignItems:"center", gap:"6px" }}
              onClick={function() { setGameDayTab("lineups"); }}>
              <span>✏️</span> Edit Lineup
            </button>
            {/* Finalize — only when unlocked */}
            {!lineupLocked ? (
              <button
                style={{ ...S.btn("ghost"), color:C.win, border:"1px solid rgba(39,174,96,0.35)" }}
                onClick={function() { setLockFlowOpen(true); }}>
                ✓ Finalize
              </button>
            ) : null}
            {/* View Options toggle */}
            <button
              onClick={function() { setViewOptsExpanded(!viewOptsExpanded); }}
              style={{ ...S.btn("ghost"), marginLeft:"auto", display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", color:C.textMuted, border:"1px solid rgba(15,31,61,0.15)" }}>
              View Options {viewOptsExpanded ? "▲" : "▼"}
            </button>
          </div>

          {/* Secondary controls — collapsed by default */}
          {viewOptsExpanded ? (
            <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap", marginTop:"10px",
              padding:"10px 12px", background:"rgba(15,31,61,0.04)", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.08)" }}>
              {/* Both / Defense / Batting */}
              <div style={{ display:"flex", gap:"4px" }}>
                {[["Both","both"],["Defense","defense"],["Batting","batting"]].map(function(row) {
                  var active = printOpt === row[1];
                  return (
                    <button key={row[1]} onClick={function(v) { return function() { setPrintOpt(v); }; }(row[1])}
                      style={{ ...S.btn(active ? "primary" : "ghost"), padding:"5px 12px", fontSize:"11px" }}>
                      {row[0]}
                    </button>
                  );
                })}
              </div>
              {/* Grid / Diamond */}
              {(printOpt === "both" || printOpt === "defense") ? (
                <div style={{ display:"flex", gap:"4px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px", width:"fit-content" }}>
                  {[["Grid","grid"],["Diamond","diamond"]].map(function(opt) {
                    var active = printDefView === opt[1];
                    return (
                      <button key={opt[1]}
                        onClick={function(v) { return function() { setPrintDefView(v); if (v !== "diamond") { setPrintDiamondInning(null); } }; }(opt[1])}
                        style={{ padding:"4px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit",
                          background: active ? C.white : "transparent",
                          color: active ? C.navy : C.textMuted,
                          boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                        {opt[0]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── PIN Protection ── */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", marginBottom:"14px", background:"rgba(15,31,61,0.03)", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.08)" }}>
          <span style={{ fontSize:"14px" }}>🔐</span>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:"12px", fontWeight:"600", color:C.navy }}>Lineup PIN </span>
            <span style={{ fontSize:"11px", color:C.textMuted }}>{coachPin ? "Active — required to unlock" : "Not set — anyone can unlock"}</span>
          </div>
          {!coachPin ? (
            <button style={{ ...S.btn("ghost"), fontSize:"11px" }}
              onClick={function() { setPinModal("setup"); setPinInput(""); setPinConfirm(""); setPinError(""); }}>
              Set PIN
            </button>
          ) : (
            <div style={{ display:"flex", gap:"6px" }}>
              <button style={{ ...S.btn("ghost"), fontSize:"11px" }}
                onClick={function() { setPinModal("change1"); setPinInput(""); setPinConfirm(""); setPinError(""); }}>
                Change
              </button>
              <button style={{ ...S.btn("ghost"), fontSize:"11px", color:C.red, border:"1px solid rgba(200,16,46,0.25)" }}
                onClick={function() { setPinModal("remove"); setPinInput(""); setPinError(""); }}>
                Remove
              </button>
            </div>
          )}
        </div>

        <div id="print-card" style={{ background:"#fff", border:"2px solid #0f1f3d", borderRadius:"10px", padding:"20px", maxWidth:"800px" }}>
          <div style={{ textAlign:"center", borderBottom:"2px solid #0f1f3d", paddingBottom:"12px", marginBottom:"16px" }}>
            <div style={{ fontSize:"22px", fontWeight:"bold", color:"#0f1f3d" }}>{teamName} - Game Day Lineup</div>
            <div style={{ fontSize:"13px", color:"#6a7a9a", marginTop:"4px" }}>{today}</div>
          </div>

          {printOpt === "both" || printOpt === "defense" ? (
            <div style={{ marginBottom: printOpt === "both" ? "20px" : 0 }}>
              <div style={{ fontSize:"12px", fontWeight:"bold", color:"#0f1f3d", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px" }}>
                Defensive Assignments
              </div>
              {printDefView === "diamond" ? (
                (function() {
                  // posBoxP delegates to shared renderPosBox with print-tab inning filter
                  function posBoxP(pos, label) { return renderPosBox(pos, label, printDiamondInning); }
                  function getPrintPlayerFn(pos, inn) {
                    for (var pi = 0; pi < roster.length; pi++) {
                      if ((grid[roster[pi].name] || [])[inn] === pos) { return roster[pi].name; }
                    }
                    return "";
                  }
                  var benchByInningP = [];
                  for (var bip = 0; bip < innings; bip++) {
                    benchByInningP.push(roster.filter(function(r){ return (grid[r.name]||[])[bip] === "Bench"; }).map(function(r){ return r.name; }));
                  }
                  return (
                    <div>
                      {/* ── Inning selector — single scrollable row ─── */}
                      <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", marginBottom:"10px", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"2px" }}>
                        <span style={{ fontSize:"9px", color:"#6a7a9a", fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
                        <button onClick={function() { setPrintDiamondInning(null); }}
                          style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                            background: printDiamondInning === null ? "#0f1f3d" : "rgba(15,31,61,0.07)",
                            color: printDiamondInning === null ? "#fff" : "#6a7a9a" }}>All</button>
                        {innArr.map(function(i) {
                          var active = printDiamondInning === i;
                          return (
                            <button key={i} onClick={function(idx) { return function() { setPrintDiamondInning(idx); }; }(i)}
                              style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                                background: active ? "#c8102e" : "rgba(15,31,61,0.07)",
                                color: active ? "#fff" : "#6a7a9a" }}>
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    {renderFieldSVG(getPrintPlayerFn, printDiamondInning, innArr)}
                    <div style={{ marginTop:"8px", borderTop:"2px solid rgba(15,31,61,0.15)", paddingTop:"10px" }}>
                        <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
                        {(function() {
                          var pbDisplay = printDiamondInning !== null ? [benchByInningP[printDiamondInning] || []] : benchByInningP;
                          var pbLabels  = printDiamondInning !== null ? [printDiamondInning] : innArr;
                          return (
                            <div style={{ overflowX:"auto" }}>
                              <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                                <thead>
                                  <tr style={{ background:"#f5efe4" }}>
                                    {pbLabels.map(function(i) { return <th key={i} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", borderBottom:"2px solid rgba(15,31,61,0.15)", minWidth:"60px" }}>Inn {i+1}</th>; })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(function() {
                                    var maxB = 0;
                                    for (var di = 0; di < pbDisplay.length; di++) { if (pbDisplay[di].length > maxB) maxB = pbDisplay[di].length; }
                                    var rows = [];
                                    for (var r = 0; r < maxB; r++) {
                                      rows.push(<tr key={r}>{pbLabels.map(function(lbl, ci) { var pn = pbDisplay[ci][r] || ""; return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color:pn?"#0f1f3d":"#ccc" }}>{pn ? firstName(pn) : "-"}</td>; })}</tr>);
                                    }
                                    return rows;
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    <th style={{ padding:"6px 10px", textAlign:"left", borderBottom:"2px solid #0f1f3d", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Player</th>
                    {innArr.map(function(i) {
                      return <th key={i} style={{ padding:"6px 8px", textAlign:"center", borderBottom:"2px solid #0f1f3d", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Inn {i+1}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.map(function(info, ri) {
                    return (
                      <tr key={info.name} style={{ background: ri % 2 === 0 ? "#fff" : "#faf8f5" }}>
                        <td style={{ padding:"6px 10px", fontWeight:"bold", borderBottom:"1px solid rgba(15,31,61,0.06)" }}>
                          {firstName(info.name)}
                        </td>
                        {innArr.map(function(i) {
                          var pos = (grid[info.name] || [])[i] || "";
                          return (
                            <td key={i} style={{ padding:"5px 6px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)" }}>
                              {pos === "Bench" ? (
                                <span style={{ display:"inline-block", padding:"2px 6px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:"#888", color:"#fff" }}>X</span>
                              ) : pos ? (
                                <span style={{ display:"inline-block", padding:"2px 6px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px",
                                  background: (POS_COLORS[pos] || "#555") + "cc", color:"#fff" }}>
                                  {pos}
                                </span>
                              ) : (
                                <span style={{ color:"#ccc" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
              {/* Position legend */}
              <div style={{ marginTop:"10px", paddingTop:"8px", borderTop:"1px solid rgba(15,31,61,0.1)", display:"flex", flexWrap:"wrap", gap:"6px 14px" }}>
                {[["P","Pitcher"],["C","Catcher"],["1B","First Base"],["2B","Second Base"],["3B","Third Base"],["SS","Shortstop"],["LF","Left Field"],["LC","Left Center"],["RC","Right Center"],["RF","Right Field"],["X","Bench"]].map(function(pair) {
                  return (
                    <span key={pair[0]} style={{ fontSize:"9px", color:"#6a7a9a", whiteSpace:"nowrap" }}>
                      <strong style={{ color:"#0f1f3d" }}>{pair[0]}</strong> = {pair[1]}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {printOpt === "both" || printOpt === "batting" ? (
            <div>
              <div style={{ fontSize:"12px", fontWeight:"bold", color:"#0f1f3d", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>
                Batting Order
              </div>
              <div style={{ fontSize:"10px", color:"#64748b", fontStyle:"italic", marginBottom:"10px" }}>
                Players are listed in batting order. To change the order, update the Batting tab first.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"6px" }}>
                {activeBattingOrder.map(function(name, idx) {
                  var info = null;
                  for (var ri = 0; ri < roster.length; ri++) { if (roster[ri].name === name) { info = roster[ri]; break; } }
                  var fieldPos = [];
                  for (var ii = 0; ii < innings; ii++) {
                    var pos = (grid[name] || [])[ii];
                    if (!pos || pos === "") {
                      fieldPos.push("-");
                    } else if (pos === "Bench") {
                      fieldPos.push("–");
                    } else {
                      fieldPos.push(pos);
                    }
                  }
                  return (
                    <div key={name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 10px", border:"1px solid rgba(15,31,61,0.1)", borderRadius:"6px", background:"#fff" }}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"50%", background:"#0f1f3d", color:"#fff", fontSize:"10px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:"bold", fontSize:"12px" }}>{firstName(name)}</div>
                        {fieldPos.length > 0 ? (
                          <div style={{ fontSize:"9px", color:"#8a9aaa" }}>{fieldPos.join(", ")}</div>
                        ) : null}
                        {(function() {
                          var p = roster.find(function(r) { return r.name === name; });
                          if (!p || (!p.walkUpSong && !p.walkUpArtist)) return null;
                          return (
                            <div style={{ marginTop:"4px", paddingTop:"4px", borderTop:"1px solid rgba(15,31,61,0.08)" }}>
                              {p.walkUpSong && <div style={{ fontSize:"10px", fontWeight:"600", color:"#1e293b" }}>🎵 {p.walkUpSong}</div>}
                              {p.walkUpArtist && <div style={{ fontSize:"9px", color:"#64748b" }}>🎤 {p.walkUpArtist}</div>}
                              {p.walkUpStart && p.walkUpEnd && <div style={{ fontSize:"9px", color:"#94a3b8" }}>⏱ {p.walkUpStart} → {p.walkUpEnd}</div>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
              {absentTonight.length > 0 ? (
                <div style={{ marginTop:"10px", paddingTop:"8px", borderTop:"1px solid rgba(15,31,61,0.08)", fontSize:"10px", color:"#94a3b8", fontStyle:"italic" }}>
                  Not playing tonight: {absentTonight.map(function(n) { return n.split(" ")[0]; }).join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ============================================================
  // SHARED LINEUP VIEW (read-only, opened via share link)
  // ============================================================
  // renderViewerMode — extracted to components/Viewer/ViewerMode.jsx

  // renderSharedView — extracted to SharedView component above App()

  // ============================================================
  // MAIN RETURN
  // ============================================================

  // Maintenance mode — must be first check, before share links, auth, everything
  var _bypassMaintenance = localStorage.getItem('bypass:maintenance') === '1';
  var _maintenanceOn = runtimeFlags.MAINTENANCE_MODE ||
                       localStorage.getItem('flag:MAINTENANCE_MODE') === '1';
  if (flagsLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        minHeight:'100vh', background:'#0f1f3d' }}>
        <div style={{ fontSize:'32px' }}>⚾</div>
      </div>
    );
  }
  if (_maintenanceOn && !_bypassMaintenance) {
    return <MaintenanceScreen version={APP_VERSION} />;
  }

  // Check for shared lineup in URL — short ?s= link (async) or legacy ?share= (base64)
  if (new URLSearchParams(window.location.search).get("s")) {
    if (shareLoading) {
      return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#fdf8f0", gap:"16px" }}>
          <div style={{ fontSize:"32px" }}>⚾</div>
          <div style={{ fontSize:"14px", color:"#6a7a9a", fontFamily:"Georgia,serif" }}>Loading lineup…</div>
        </div>
      );
    }
    if (sharePayload) {
      var _vp = new URLSearchParams(window.location.search);
      var _viewerFlagOn = runtimeFlags.VIEWER_MODE || localStorage.getItem("flag:viewer_mode") === "1";
      var isViewer = _viewerFlagOn && (_vp.get("view") === "true" || _vp.get("role") === "viewer");
      return <ErrorBoundary fallback="Viewer Mode">{isViewer ? <ViewerMode payload={sharePayload} /> : <SharedView payload={sharePayload} renderFieldSVG={renderFieldSVG} />}</ErrorBoundary>;
    }
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#fdf8f0", gap:"12px" }}>
        <div style={{ fontSize:"32px" }}>😕</div>
        <div style={{ fontSize:"14px", color:"#6a7a9a", fontFamily:"Georgia,serif" }}>This share link couldn't be found.</div>
      </div>
    );
  }

  // AUTH GATE — parked. Not active in prod until Phase 4C cutover is confirmed.
  // Do NOT uncomment without explicit Phase 4C sign-off.
  /*
  // AUTH GATE
  // Dev-only bypass: in browser console run `localStorage.setItem('auth_bypass','1')`
  // then reload. `import.meta.env.DEV` is false in production builds — Vite removes this.
  var _authBypassed = import.meta.env.DEV && localStorage.getItem('auth_bypass') === '1';
  if (!_authBypassed) {
    if (authState === 'loading') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚾</div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading…</p>
          </div>
        </div>
      );
    }
    if (authState === 'unauthenticated') {
      if (authScreen === 'request') {
        return (
          <RequestAccessScreen
            onBack={() => setAuthScreen('login')}
            requestAccess={requestAccess}
          />
        );
      }
      return (
        <LoginScreen
          onRequestAccess={() => setAuthScreen('request')}
          sendMagicLink={sendMagicLink}
        />
      );
    }
    if (authState === 'pending_approval') {
      return (
        <PendingApprovalScreen
          onTryLogin={() => setAuthState('unauthenticated')}
        />
      );
    }
  }
  */

  try {
    var urlParams = new URLSearchParams(window.location.search);
    var shareParam = urlParams.get("share");
    if (shareParam) {
      var payload = JSON.parse(decodeURIComponent(escape(atob(shareParam))));
      var _viewerFlagOn64 = runtimeFlags.VIEWER_MODE || localStorage.getItem("flag:viewer_mode") === "1";
      var isViewer64 = _viewerFlagOn64 && (urlParams.get("view") === "true" || urlParams.get("role") === "viewer");
      return <ErrorBoundary fallback="Viewer Mode">{isViewer64 ? <ViewerMode payload={payload} /> : <SharedView payload={payload} renderFieldSVG={renderFieldSVG} />}</ErrorBoundary>;
    }
  } catch (e) {}

  var PRIMARY_TABS = [
    { key:"home",    label:"Home",     icon:"🏠" },
    { key:"team",    label:"My Team",  icon:"👥" },
    { key:"gameday", label:"Game Day", icon:"🏟" },
    liveScoringEnabled ? { key:"scoring", label:"Scoring", icon:"\u26BE" } : null,
    { key:"more",    label:"Support",  icon:"⚙️" },
  ].filter(Boolean);
  var ROSTER_SUBTABS = [
    { key:"players", label:"Players" },
    { key:"songs",   label:"Songs"   },
  ];
  var GAMEDAY_SUBTABS = [
    { key:"lineups",  label:"Lineups"             },
    { key:"songs",    label:"Songs"               },
    { key:"gamemode", label:"GAME MODE", launcher:true },
  ];
  var SEASON_SUBTABS = [
    { key:"schedule", label:"Schedule" },
    { key:"snack",    label:"Snacks"   },
  ];
  var MORE_SUBTABS = [
    { key:"about",    label:"About"    },
    { key:"updates",  label:"Updates"  },
    { key:"links",    label:"Links"    },
    { key:"feedback", label:"Feedback" },
    { key:"legal",    label:"Legal"    },
    { key:"faq",      label:"FAQ"      },
  ];

  // Sub-tab bar — rendered inside tabContent when Game Day or Season is active
  var subTabBar = null;
  var subTabStyle = function(active) { return {
    flex:"0 0 auto", padding:"7px 16px", borderRadius:"6px", border:"none", cursor:"pointer",
    fontSize:"12px", fontWeight:"bold", fontFamily:"Georgia,serif",
    letterSpacing:"0.03em", textTransform:"uppercase", textAlign:"center",
    background: active ? C.navy : "rgba(15,31,61,0.07)",
    color: active ? "#fff" : C.textMuted,
    boxShadow: active ? "0 2px 6px rgba(15,31,61,0.2)" : "none",
    borderBottom: active ? "2px solid " + C.gold : "2px solid transparent",
    transform: active ? "translateY(-1px)" : "none"
  }; };

  if (primaryTab === "gameday") {
    // Show GAME MODE for any team with roster + schedule set up
    var _showGameMode = roster.length > 0 && schedule.length > 0;

    subTabBar = (
      <div style={{ display:"flex", gap:"4px", alignItems:"center", padding:"8px 12px 4px", background:C.cream, borderBottom:"1px solid " + C.border }}>
        {GAMEDAY_SUBTABS.map(function(st) {
          if (st.launcher) {
            if (!_showGameMode) { return null; }
            var gmActive = gameModeActive;
            return (
              <button key={st.key}
                onClick={function() { setGameModeActive(true); }}
                style={{ flex:"0 0 auto", padding: gmActive ? "7px 16px" : "7px 14px", borderRadius:"6px",
                  border: gmActive ? "2px solid " + C.gold : "none",
                  cursor:"pointer",
                  fontSize: gmActive ? "14px" : "12px",
                  fontWeight:"bold", fontFamily:"Georgia,serif",
                  letterSpacing:"0.04em", textTransform:"uppercase",
                  background: gmActive ? C.gold : "#e05c2a",
                  color: gmActive ? C.navy : "#fff",
                  boxShadow: gmActive ? "0 3px 10px rgba(245,200,66,0.5)" : "0 2px 6px rgba(224,92,42,0.35)",
                  transform: gmActive ? "translateY(-2px)" : "none",
                  transition:"all 0.15s" }}>
                {st.label}
              </button>
            );
          }
          return (
            <button key={st.key}
              onClick={function(k) { return function() { setGameDayTab(k); setParentViewActive(false); }; }(st.key)}
              style={subTabStyle(gameDayTab === st.key)}>
              {st.label}
            </button>
          );
        })}
        {/* MyPlayer View toggle — always visible on Game Day */}
        <button
          onClick={function() { setParentViewActive(!parentViewActive); if (!parentViewActive) setSelectedParentPlayer(null); }}
          style={{ flex:"0 0 auto", marginLeft:"auto", padding:"5px 10px", borderRadius:"6px",
            border: parentViewActive ? "2px solid " + C.navy : "1px solid rgba(15,31,61,0.18)",
            cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"Georgia,serif",
            letterSpacing:"0.04em",
            background: parentViewActive ? C.navy : "rgba(15,31,61,0.06)",
            color: parentViewActive ? "#fff" : C.textMuted,
            flexShrink:0 }}>
          {parentViewActive ? "← Back" : "👁 MyPlayer"}
        </button>
        {/* Innings selector — global game setting, always visible on Game Day */}
        <div style={{ display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
          <span style={{ fontSize:"10px", color:C.textMuted, letterSpacing:"0.04em" }}>Inn:</span>
          {[6,7].map(function(n) {
            return (
              <button key={n}
                disabled={lineupLocked}
                style={{ padding:"3px 10px", borderRadius:"6px", border:"none", cursor: lineupLocked ? "default" : "pointer",
                  fontSize:"11px", fontWeight:"bold", fontFamily:"Georgia,serif",
                  background: innings === n ? C.navy : "rgba(15,31,61,0.07)",
                  color: innings === n ? "#fff" : C.textMuted,
                  opacity: lineupLocked ? 0.4 : 1 }}
                onClick={function(nn) { return function() {
                  if (lineupLocked) return;
                  persistInnings(nn);
                  setLineupDirty(true);
                  var ng = {};
                  for (var pi = 0; pi < players.length; pi++) {
                    var p = players[pi];
                    var existing = grid[p] || [];
                    var row = [];
                    for (var i = 0; i < nn; i++) { row.push(existing[i] || ""); }
                    ng[p] = row;
                  }
                  persistGrid(ng);
                }; }(n)}>
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (primaryTab === "more") {
    subTabBar = (
      <div style={{ display:"flex", gap:"4px", padding:"8px 12px 4px", background:C.cream, borderBottom:"1px solid " + C.border }}>
        {MORE_SUBTABS.map(function(st) {
          return (
            <button key={st.key}
              onClick={function(k) { return function() { setMoreTab(k); }; }(st.key)}
              style={subTabStyle(moreTab === st.key)}>
              {st.label}
            </button>
          );
        })}
      </div>
    );
  }

  var contextLabel = null;
  if (primaryTab === "gameday" && gameDayTab === "defense") {
    contextLabel = (gridView === "player" ? "By Player" : "By Position") + " \u2022 " + innings + " Innings";
  } else if (primaryTab === "gameday" && gameDayTab === "batting") {
    contextLabel = "Batting Order \u2022 " + roster.length + " Players";
  } else if (primaryTab === "gameday" && gameDayTab === "lineups") {
    contextLabel = "Print / Share View";
  } else if (primaryTab === "team" && teamSubTab === "schedule") {
    contextLabel = "Schedule";
  }

  var tabContent = (
    <div>
      {contextLabel ? (
        <div style={{ padding:"5px 16px", background:"rgba(15,31,61,0.04)", borderBottom:"1px solid " + C.border,
          fontSize:"11px", color:C.textMuted, letterSpacing:"0.05em", fontWeight:"600" }}>
          {contextLabel}
        </div>
      ) : null}
      {primaryTab === "gameday" && lineupLocked ? (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px",
          background:"rgba(39,174,96,0.08)", borderBottom:"2px solid rgba(39,174,96,0.3)" }}>
          <span style={{ fontSize:"18px" }}>🔒</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:"bold", fontSize:"13px", color:C.win }}>Lineup Finalized</div>
            <div style={{ fontSize:"11px", color:C.textMuted }}>Editing is locked. Unlock to make changes.</div>
          </div>
          <button style={{ ...S.btn("ghost"), fontSize:"11px", color:C.win, border:"1px solid rgba(39,174,96,0.4)" }}
            onClick={function() {
              if (coachPin) { setPinModal("unlock"); setPinInput(""); setPinError(""); }
              else { persistLineupLocked(false); }
            }}>
            Unlock
          </button>
        </div>
      ) : null}
      {primaryTab === "team" ? renderTeamTab() : null}
      <ErrorBoundary fallback="Game Day">
        <ErrorBoundary fallback="MyPlayer View">
          {primaryTab === "gameday" && parentViewActive ? (
            <ParentView
              roster={roster}
              battingOrder={battingOrder}
              grid={grid}
              selectedParentPlayer={selectedParentPlayer}
              setSelectedParentPlayer={setSelectedParentPlayer}
              S={S}
              C={C}
              POS_COLORS={POS_COLORS}
            />
          ) : null}
        </ErrorBoundary>
        {primaryTab === "gameday" && !parentViewActive && gameDayTab === "lineups" ? renderLineups() : null}
        {primaryTab === "gameday" && !parentViewActive && gameDayTab === "songs"   ? renderSongs()   : null}
      </ErrorBoundary>
      {primaryTab === "more" && moreTab === "feedback" ? renderFeedback() : null}
      {primaryTab === "more" && moreTab === "links"    ? renderLinks()    : null}
      {primaryTab === "more" && moreTab === "about"    ? renderAbout()    : null}
      {primaryTab === "more" && moreTab === "updates"  ? renderUpdates()  : null}
      {primaryTab === "more" && moreTab === "legal"    ? <LegalSection C={C} S={S} /> : null}
      {primaryTab === "more" && moreTab === "faq"      ? <FAQSection C={C} S={S} />   : null}
      {primaryTab === "scoring" && liveScoringEnabled ? (
        <ScoringMode
          activeTeam={activeTeam}
          activeTeamId={activeTeamId}
          user={user}
          session={session}
          schedule={schedule}
          roster={roster}
          battingOrder={activeBattingOrder}
          onClose={function() { setPrimaryTab("gameday"); }}
        />
      ) : null}
    </div>
  );

  // renderParentView — extracted to components/GameDay/ParentView.jsx

  function renderTeamTab() {
    var today = new Date(); today.setHours(0,0,0,0);

    // Record from schedule (result strings set by score reporting)
    var wins = 0; var losses = 0; var ties = 0;
    for (var ri = 0; ri < schedule.length; ri++) {
      if (schedule[ri].result === "W") { wins++; }
      else if (schedule[ri].result === "L") { losses++; }
      else if (schedule[ri].result === "T") { ties++; }
    }

    // Next upcoming game
    var sortedUpcoming = schedule.slice()
      .filter(function(g) { return g.result !== "X" && !g.scoreReported && g.date && new Date(g.date + "T12:00:00") >= today; })
      .sort(function(a, b) { return new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00"); });
    var nextGame = sortedUpcoming[0] || null;

    // Status warnings
    var missingPrefs = roster.filter(function(p) { return !p.prefs || p.prefs.length === 0; }).length;
    var noSnacks = schedule.filter(function(g) {
      return g.result !== "X" && !g.snackDuty && g.date && new Date(g.date + "T12:00:00") >= today;
    }).length;

    var TEAM_SUBTABS = [
      { key:"roster",   label:"🧢 Roster"   },
      { key:"schedule", label:"📅 Schedule" },
      { key:"snacks",   label:"🍎 Snacks"   },
    ];

    return (
      <div style={{ paddingBottom:"80px" }}>

        {/* ── Team dashboard header ──────────────────────────────── */}
        <div style={{ background:C.white, borderRadius:"12px", padding:"16px",
          margin:"12px 12px 0", border:"1px solid " + C.border,
          boxShadow:"0 1px 4px rgba(15,31,61,0.06)" }}>
          <div style={{ fontWeight:"bold", fontSize:"18px", color:C.navy, marginBottom:"2px" }}>
            {activeTeam ? activeTeam.name : ""}
          </div>
          <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"12px" }}>
            {activeTeam ? ((activeTeam.ageGroup || "") + (activeTeam.sport ? " \u00b7 " + (activeTeam.sport.charAt(0).toUpperCase() + activeTeam.sport.slice(1)) : "")) : ""}
          </div>

          {/* Stats row */}
          <div style={{ display:"flex", borderTop:"1px solid " + C.border, paddingTop:"12px", marginTop:"4px" }}>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:"16px", marginBottom:"2px" }}>👥</div>
              <div style={{ fontSize:"20px", fontWeight:"bold", color:C.navy, lineHeight:1 }}>{roster.length}</div>
              <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:"3px" }}>Players</div>
            </div>
            <div style={{ flex:1, textAlign:"center", borderLeft:"1px solid " + C.border }}>
              <div style={{ fontSize:"16px", marginBottom:"2px" }}>🏆</div>
              <div style={{ fontSize:"20px", fontWeight:"bold", lineHeight:1 }}>
                <span style={{ color:C.win }}>{wins}</span>
                <span style={{ color:C.textMuted }}>–</span>
                <span style={{ color:C.red }}>{losses}</span>
                {ties > 0 ? <><span style={{ color:C.textMuted }}>–</span><span style={{ color:C.tie }}>{ties}</span></> : null}
              </div>
              <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:"3px" }}>Record</div>
            </div>
            <div style={{ flex:1, textAlign:"center", borderLeft:"1px solid " + C.border }}>
              <div style={{ fontSize:"16px", marginBottom:"2px" }}>📅</div>
              {nextGame ? (
                <>
                  <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy, lineHeight:1.2 }}>
                    {new Date(nextGame.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}
                  </div>
                  {nextGame.time ? <div style={{ fontSize:"11px", color:C.textMuted }}>{nextGame.time}</div> : null}
                </>
              ) : (
                <div style={{ fontSize:"12px", color:C.textMuted, lineHeight:1.2 }}>–</div>
              )}
              <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:"3px" }}>Next Game</div>
            </div>
          </div>

        </div>

        {/* ── Status warnings ────────────────────────────────────── */}
        {(missingPrefs > 0 || noSnacks > 0) ? (
          <div style={{ margin:"8px 12px 0", padding:"12px 14px", borderRadius:"10px",
            background:"rgba(245,200,66,0.12)", border:"1px solid rgba(245,200,66,0.4)" }}>
            <div style={{ fontWeight:"bold", marginBottom:"8px", color:C.navy, fontSize:"12px", display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"15px" }}>⚠️</span> Needs attention
            </div>
            {missingPrefs > 0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom: noSnacks > 0 ? "6px" : 0,
                background:"rgba(255,255,255,0.55)", borderRadius:"6px", padding:"8px 10px" }}>
                <span style={{ fontSize:"18px", flexShrink:0 }}>{(activeTeam && (activeTeam.sport || "baseball").toLowerCase() === "softball") ? "🥎" : "⚾"}</span>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"600", color:C.navy }}>Missing position preferences</div>
                  <div style={{ fontSize:"11px", color:C.textMuted }}>{missingPrefs} player{missingPrefs !== 1 ? "s" : ""} — set in Roster tab</div>
                </div>
              </div>
            ) : null}
            {noSnacks > 0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:"8px",
                background:"rgba(255,255,255,0.55)", borderRadius:"6px", padding:"8px 10px" }}>
                <span style={{ fontSize:"18px", flexShrink:0 }}>🍎</span>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"600", color:C.navy }}>Snacks unassigned</div>
                  <div style={{ fontSize:"11px", color:C.textMuted }}>{noSnacks} upcoming game{noSnacks !== 1 ? "s" : ""} — assign in Snacks tab</div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Team subtab bar ────────────────────────────────────── */}
        <div style={{ display:"flex", gap:"4px", padding:"12px 12px 0" }}>
          {TEAM_SUBTABS.map(function(st) {
            return (
              <button key={st.key}
                onClick={function(k) { return function() { setTeamSubTab(k); }; }(st.key)}
                style={subTabStyle(teamSubTab === st.key)}>
                {st.label}
              </button>
            );
          })}
        </div>

        {/* ── Subtab content ─────────────────────────────────────── */}
        <div style={{ marginTop:"4px" }}>
          {teamSubTab === "roster"   ? renderRoster()    : null}
          {teamSubTab === "schedule" ? renderSchedule()  : null}
          {teamSubTab === "snacks"   ? renderSnackDuty() : null}
        </div>

      </div>
    );
  }

  function renderExitSheet() {
    if (!showExitSheet) return null;
    var teamName = activeTeam ? activeTeam.name : "this team";
    return (
      <div
        onClick={function() { setShowExitSheet(false); }}
        style={{ position:"fixed", inset:0, zIndex:1500, background:"rgba(0,0,0,0.5)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
        <div
          onClick={function(e) { e.stopPropagation(); }}
          style={{ background:C.navy, borderTop:"2px solid " + C.red, borderRadius:"16px 16px 0 0", padding:"20px 20px 0", paddingBottom:"max(20px, env(safe-area-inset-bottom, 20px))", fontFamily:"Georgia,serif" }}>
          <div style={{ textAlign:"center", marginBottom:"4px" }}>
            <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.2)", margin:"0 auto 16px" }} />
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"4px" }}>
              Leave team?
            </div>
            <div style={{ fontSize:"17px", fontWeight:"bold", color:"#fff", marginBottom:"6px" }}>
              {teamName}
            </div>
            {lineupDirty && !lineupLocked ? (
              <div style={{ fontSize:"12px", color:"#f5c842", marginBottom:"4px" }}>
                ⚠ You have unsaved lineup changes
              </div>
            ) : null}
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", marginBottom:"16px" }}>
              Your roster and schedule are saved. You can return to this team anytime from the home screen.
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"12px" }}>
            <button
              onClick={function() { setShowExitSheet(false); }}
              style={{ width:"100%", padding:"14px", borderRadius:"10px", background:C.gold, border:"none", color:C.navy, fontSize:"15px", fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer" }}>
              Keep Working
            </button>
            <button
              onClick={function() { setShowExitSheet(false); setScreen("home"); setPrimaryTab("home"); setHomeMode("welcome"); }}
              style={{ width:"100%", padding:"13px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.6)", fontSize:"14px", fontFamily:"Georgia,serif", cursor:"pointer" }}>
              ← Go to Home Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderBottomNav() {
    return (
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:C.navy, borderTop:"2px solid " + C.red, display:"flex", paddingBottom: isStandalone ? "env(safe-area-inset-bottom, 0px)" : "env(safe-area-inset-bottom, 12px)" }}>
        {PRIMARY_TABS.map(function(t) {
          var active = primaryTab === t.key;
          var disabled = (t.key !== "more" && t.key !== "home" && screen !== "app");
          return (
            <button key={t.key}
              onClick={function(k, d) { return function() {
                if (k === "home") {
                  if (primaryTab === "team" || primaryTab === "gameday") { setShowExitSheet(true); return; }
                  setScreen("home"); setPrimaryTab("home"); setHomeMode("welcome"); return;
                }
                if (d) return;
                setPrimaryTab(k);
                if (k !== "more") setScreen("app");
              }; }(t.key, disabled)}
              style={{ flex:1, padding: isLandscape ? "4px 4px" : "10px 4px", border:"none", fontSize:"9px", fontWeight:"bold", fontFamily:"Georgia,serif", letterSpacing:"0.03em", textTransform:"uppercase", textAlign:"center", lineHeight:1.3, background:C.navy,
                cursor: disabled ? "default" : "pointer",
                color: active ? C.gold : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.9)",
                borderTop: active ? "2px solid " + C.gold : "2px solid transparent",
                opacity: disabled ? 0.4 : 1,
                marginTop:"-2px" }}>
              <div style={{ fontSize:"18px", marginBottom:"3px" }}>{t.icon}</div>
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Always column: header + top tabs + scrollable content ──────────────
  // TODO: extract — deferred (Header depends on syncStatus, isLandscape, screen, activeTeam, isOnline, activeTeamId — extract after OfflineIndicator is stable and state prop drilling pattern is established)
  return (
    <div style={{ height: isStandalone ? "100dvh" : "100svh", display:"flex", flexDirection:"column", overflow:"hidden", background: primaryTab === "more" ? "linear-gradient(160deg,#0f1f3d 0%,#1a3260 55%,#2a0a0a 100%)" : C.cream, fontFamily:"Georgia,'Times New Roman',serif", color:C.text }}>
      <div style={Object.assign({}, S.header, isLandscape ? { padding:"5px 16px" } : {})}>
        <div style={S.logoWrap} onClick={function() {
          if (primaryTab === "team" || primaryTab === "gameday") { setShowExitSheet(true); return; }
          setScreen("home"); setPrimaryTab("home"); setHomeMode("welcome");
        }}>
          <div style={Object.assign({}, S.logoCircle, isLandscape ? { width:"30px", height:"30px", fontSize:"13px" } : {})}>{screen === "app" && primaryTab !== "more" && activeTeam ? activeTeam.name.charAt(0).toUpperCase() : "L"}</div>
          <div>
            <div style={Object.assign({}, S.logoTitle, isLandscape ? { fontSize:"14px" } : {})}>{screen === "app" && primaryTab !== "more" && activeTeam ? activeTeam.name : "Dugout Lineup"}</div>
            {!isLandscape && <div style={S.logoSub}>{screen === "app" && primaryTab !== "more" && activeTeam ? (activeTeam.ageGroup || "") + " " + (activeTeam.year || "") + "  ⌂" : "Youth Baseball & Softball"}</div>}
            {screen === "app" && primaryTab !== "more" && isSupabaseEnabled ? (
              <div title={syncStatus === "synced" ? "Saved to cloud" : syncStatus === "syncing" ? "Saving..." : syncStatus === "error" ? "Sync error — data saved locally" : ""}
                style={{ width:"7px", height:"7px", borderRadius:"50%", marginTop:"3px",
                  background: syncStatus === "synced" ? "#27ae60" : syncStatus === "syncing" ? "#f5c842" : syncStatus === "error" ? "#c8102e" : "rgba(255,255,255,0.15)" }}>
              </div>
            ) : null}
          </div>
        </div>
        <ErrorBoundary fallback="Offline Status">
          <OfflineIndicator
            isOnline={isOnline}
            hasCache={!!(activeTeamId && loadJSON("team:" + activeTeamId + ":roster", null))}
            isLandscape={isLandscape}
          />
        </ErrorBoundary>
      </div>
      {subTabBar}
      <div id="app-scroll-body" style={Object.assign({}, S.body, showInstallBanner && !gameModeActive ? { paddingBottom:"136px" } : {})}>
        <div style={{ width:"100%", maxWidth:"480px", marginLeft:"auto", marginRight:"auto", paddingLeft:"16px", paddingRight:"16px", boxSizing:"border-box" }}>
          {(primaryTab === "home" || (!activeTeam && primaryTab !== "more")) ? renderHome() : tabContent}
        </div>
      </div>
      <ErrorBoundary fallback="Now Batting">
        {!gameModeActive && primaryTab === "gameday" && activeBattingOrder && activeBattingOrder.length > 0 ? (
          <NowBattingBar
            battingOrder={activeBattingOrder}
            currentIndex={currentBatterIndex}
            activeInning={diamondInning !== null ? diamondInning + 1 : null}
            roster={roster}
            onAdvance={function() {
              persistCurrentBatterIndex((currentBatterIndex + 1) % activeBattingOrder.length);
            }}
            onBack={function() {
              persistCurrentBatterIndex((currentBatterIndex - 1 + activeBattingOrder.length) % activeBattingOrder.length);
            }}
          />
        ) : null}
      </ErrorBoundary>
      {showInstallBanner && !gameModeActive ? (
        <div style={{ position:"fixed", bottom:"calc(56px + env(safe-area-inset-bottom, 0px))", left:0, right:0, zIndex:199,
          background:"#1a2f5e", borderTop:"1px solid rgba(245,200,66,0.4)",
          padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:2 }}>
              📲 Install Dugout Lineup
            </div>
            {isIOS ? (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", lineHeight:1.5 }}>
                Tap <span style={{ fontWeight:700, color:"#f5c842" }}>⎙ Share</span> then tap{" "}
                <span style={{ fontWeight:700, color:"#f5c842" }}>"Add to Home Screen"</span>
              </div>
            ) : deferredPrompt ? (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>
                One-tap access on game day — no browser needed
              </div>
            ) : (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>
                In Chrome, tap ⋮ menu → "Add to Home Screen"
              </div>
            )}
          </div>
          {!isIOS && deferredPrompt ? (
            <button onClick={handleInstallClick}
              style={{ padding:"8px 18px", fontSize:12, fontWeight:700,
                background:"#f5c842", color:"#0f1f3d", border:"none",
                borderRadius:6, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
              Install
            </button>
          ) : null}
        </div>
      ) : null}
      {!gameModeActive ? renderBottomNav() : null}
      {renderExitSheet()}
      {gameModeActive ? (
        <GameModeScreen
          teamId={activeTeamId}
          roster={roster}
          grid={grid}
          battingOrder={activeBattingOrder}
          innings={innings}
          sport={activeTeam ? activeTeam.sport : "baseball"}
          absentTonight={absentTonight}
          currentBatterIndex={currentBatterIndex}
          initialInning={gameModeInning}
          onSwap={gameModeSwap}
          onBatterAdvance={function() {
            persistCurrentBatterIndex((currentBatterIndex + 1) % activeBattingOrder.length);
          }}
          onBatterBack={function() {
            persistCurrentBatterIndex((currentBatterIndex - 1 + activeBattingOrder.length) % activeBattingOrder.length);
          }}
          onInningChange={persistGameModeInning}
          onBatterReset={function() {
            persistCurrentBatterIndex(0);
            persistGameModeInning(0);
          }}
          onExit={function() { setGameModeActive(false); }}
        />
      ) : null}
      {needRefresh && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e293b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          maxWidth: '90vw',
        }}>
          <span>⚡ New version available</span>
          <button
            onClick={() => updateServiceWorker(true)}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0,
            }}>
            Update Now
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              flexShrink: 0,
            }}>
            ×
          </button>
        </div>
      )}
      {renderPinModal()}
      <ErrorBoundary fallback="Lock Flow">
        {lockFlowOpen ? (
          <LockFlow
            activeWarnings={warnings}
            nextGame={(function() {
              var today = new Date(); today.setHours(0,0,0,0);
              var up = schedule.filter(function(g) { return !g.result && g.date && new Date(g.date+"T12:00:00") >= today; });
              up.sort(function(a,b) { return new Date(a.date) - new Date(b.date); });
              return up.length ? up[0] : null;
            })()}
            hasPin={!!coachPin}
            onConfirmLock={function() {
              persistLineupLocked(true);
            }}
            onRequestPin={function() { setPinModal("finalize"); setPinInput(""); setPinError(""); }}
            onClose={function() { setLockFlowOpen(false); }}
          />
        ) : null}
      </ErrorBoundary>
      {editingTeam ? (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
          onClick={function(e) { if (e.target === e.currentTarget) { setEditingTeam(null); } }}>
          <div style={{ background:"#0f1f3d", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"14px", padding:"24px", width:"100%", maxWidth:"380px" }}>
            <div style={{ fontSize:"15px", fontWeight:"bold", color:"#fff", marginBottom:"18px", fontFamily:"Georgia,serif" }}>Edit Team</div>
            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px" }}>Team Name</div>
              <input type="text" value={editingTeam.name} maxLength={40} autoFocus
                onChange={function(e) { var t={}; for(var k in editingTeam){t[k]=editingTeam[k];} t.name=e.target.value; setEditingTeam(t); }}
                style={{ width:"100%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", padding:"10px 12px", color:"#fff", fontFamily:"Georgia,serif", fontSize:"13px", outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:"10px", marginBottom:"20px" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px" }}>Age Group</div>
                <select value={editingTeam.ageGroup}
                  onChange={function(e) { var t={}; for(var k in editingTeam){t[k]=editingTeam[k];} t.ageGroup=e.target.value; setEditingTeam(t); }}
                  style={{ width:"100%", background:"#1a2a4a", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", padding:"10px 12px", color: editingTeam.ageGroup ? "#fff" : "rgba(255,255,255,0.35)", fontFamily:"Georgia,serif", fontSize:"13px", outline:"none", boxSizing:"border-box", appearance:"none", cursor:"pointer" }}>
                  <option value="">— Age —</option>
                  {["5U","6U","7U","8U","9U","10U","11U","12U"].map(function(ag) {
                    return <option key={ag} value={ag}>{ag}</option>;
                  })}
                </select>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px" }}>Sport</div>
                <select value={editingTeam.sport}
                  onChange={function(e) { var t={}; for(var k in editingTeam){t[k]=editingTeam[k];} t.sport=e.target.value; setEditingTeam(t); }}
                  style={{ width:"100%", background:"#1a2a4a", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", padding:"10px 12px", color:"#fff", fontFamily:"Georgia,serif", fontSize:"13px", outline:"none", boxSizing:"border-box", appearance:"none", cursor:"pointer" }}>
                  <option value="baseball">Baseball</option>
                  <option value="softball">Softball</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={saveTeamEdits} disabled={!editingTeam.name.trim()}
                style={{ flex:1, padding:"12px", borderRadius:"8px", border:"none", cursor: editingTeam.name.trim() ? "pointer" : "default", fontWeight:"bold", fontSize:"14px", fontFamily:"Georgia,serif", background: editingTeam.name.trim() ? "linear-gradient(135deg,#f5c842,#e6a817)" : "rgba(255,255,255,0.1)", color: editingTeam.name.trim() ? "#0f1f3d" : "rgba(255,255,255,0.3)" }}>
                Save
              </button>
              <button onClick={function() { setEditingTeam(null); }}
                style={{ padding:"12px 16px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.18)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:"13px", fontFamily:"Georgia,serif", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
