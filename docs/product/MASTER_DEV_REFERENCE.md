# Lineup Generator — Master Development & Deployment Reference

> **Last Updated:** April 27, 2026 (v2.5.1 — post-deploy infrastructure cleanup)

## Core Principles (Non-Negotiable)
- **Local-first always.** Local validation is a gate, not a suggestion. Never push to main without a clean local build confirmed.
- **Windows/PowerShell only.** Never use Mac/Unix commands.
- **One command at a time.** Specify which window, show expected output, provide error recovery steps.
- **No manual steps where automation is possible.** Use Claude Code commands for all file changes, version bumps, and deploys.
- **Every change ships with updated docs.** No exceptions.
- **Auth must never block lineup viewing.** Read-only access always works without login. Editing requires auth. Share links always work unauthenticated.

---

## Session Start Command (Run Every Session)
In the lineup generator project:

1. Run: git status — show any uncommitted changes and untracked files
2. Run: git log --oneline -5 — show last 5 commits
3. Run: git stash list — check for WIP stashes that need cleanup before starting
4. Show: APP_VERSION from frontend/src/App.jsx (line 144)
5. Show: version from frontend/package.json
6. Show: open P0 items from docs/product/DOC_TEST_DEBT.md (lines containing "P0" with no "✅ Resolved")
7. Confirm: neither .claude/settings.local.json nor frontend/.claude/settings.local.json is tracked by git (run: git ls-files .claude/settings.local.json frontend/.claude/settings.local.json — output should be empty)
8. State: the session goal and whether it is Ship Gate exempt (meta-governance or [hotfix-exception])

All eight outputs before starting any work.


---

## Environments

- **Local** — development and validation only
- **Production** — dugoutlineup.com — live users

Rules:
- Never test experimental features directly in production without a feature flag
- Feature flags live at `frontend/src/config/featureFlags.js`
- No staging environment — feature flags are the safety net

---

## Pre-Work Checklist (Before Writing Any Code)

- [ ] What is the current `APP_VERSION` in `frontend/src/App.jsx`?
- [ ] Any pending uncommitted changes? (`git status`)
- [ ] Local dev server confirmed working? (`cd frontend && npm run dev`)
- [ ] For data/schema changes — migration file written and NOT executed directly?
- [ ] For risky changes — feature flag in place?

---

## Development Rules

### Logic Changes
- Enumerate all edge cases before writing code
- Call out regression risk explicitly
- For data changes: define migration safety and rollback path
- SQL migrations: always write to file — never execute directly

### UI Changes
Manually verify all states before pushing:
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Populated state
- [ ] Offline state
- [ ] Mobile portrait
- [ ] Mobile landscape

### UI Primitives

Reusable components in `frontend/src/components/ui/`. Use these instead of one-off inline implementations.

| Primitive | File | Description |
|-----------|------|-------------|
| Toast | `ui/Toast.jsx` | Top-anchored transient notification — `role=status`, `aria-live=polite`, safe-area-inset-top anchor, auto-dismiss with hover/focus pause, optional action button, tone variants (`info`/`success`/`warning`) |

### If Untestable Locally
State explicitly and define a safe production validation approach before pushing.

---

## Game-Day Validation (Non-Negotiable Before Every Deploy)

Required before any deploy touching lineup, game mode, or share links:

- [ ] Generate lineup in under 60 seconds
- [ ] Open Game Mode — inning advance works
- [ ] Field positions visible at a glance
- [ ] Batting order clearly readable
- [ ] Share link opens on mobile without login
- [ ] Bottom nav stays pinned while scrolling
- [ ] Game Mode is full screen — nav hidden, batter names dominant

---

## Full Deployment Checklist

Use this Claude Code command — fill in bracketed values:
In the lineup generator project, execute the full deployment
checklist in this exact order. Do not skip any step.

STEP 0 — Enable maintenance mode (no deploy needed):
  In Supabase SQL Editor run:
  UPDATE feature_flags 
  SET enabled = true, updated_at = now()
  WHERE flag_name = 'MAINTENANCE_MODE' AND team_id IS NULL;

  Wait 10 seconds. Open dugoutlineup.com in incognito —
  confirm maintenance screen appears.

  Coach bypass to verify prod while maintenance is on:
  https://dugoutlineup.com/?coach_access=mudhen2026

STEP 1 — Version bumps (all files):
In frontend/src/App.jsx:

Change APP_VERSION to: "[NEW_VERSION]"
Prepend to VERSION_HISTORY array at the top:
{
version: '[NEW_VERSION]',
date: '[YYYY-MM-DD]',
changes: [
'[CHANGE 1]',
'[CHANGE 2]'
]
},

In frontend/package.json:

Change "version" to: "[NEW_VERSION]"

In backend/package.json:

Change "version" to: "[NEW_VERSION]"

STEP 2 — Docs update:
In docs/product/ROADMAP.md:

Add a new entry:
v[NEW_VERSION] — [YYYY-MM-DD]

[CHANGE 1]
[CHANGE 2]



In CLAUDE.md:

Find the version history section and prepend:
v[NEW_VERSION] ([YYYY-MM-DD]): [ONE LINE SUMMARY]

STEP 3 — Local build validation:
Run: cd frontend && npm run build
If build has errors, stop and report them. Do not proceed.
Chunk size warnings are acceptable. Actual errors are not.
Report "Build clean" before proceeding.
STEP 4 — Commit and push (only after confirmed clean build):
git add -A
git commit -m "[TYPE]: [short description] (v[NEW_VERSION])"
git push origin main
STEP 5 — Confirm:
Show full build output, git commit hash, and confirm push
succeeded with remote branch reference.
STEP 6 — Verify prod as coach:
  Visit: https://dugoutlineup.com/?coach_access=mudhen2026
  Confirm new version in About tab.
  Run game-day validation checklist.
STEP 7 — Disable maintenance mode:
  UPDATE feature_flags 
  SET enabled = false, updated_at = now()
  WHERE flag_name = 'MAINTENANCE_MODE' AND team_id IS NULL;

  Reload incognito — confirm normal app returns.

### Version Bump Rules
- Patch (`x.x.X`) — bug fixes, copy, style tweaks
- Minor (`x.X.0`) — new features, new screens, new components
- Major (`X.0.0`) — architecture changes, breaking schema changes

### Commit Message Format
type: short description (vX.X.X)
Types: `fix`, `feat`, `chore`, `refactor`, `docs`

---

## Post-Deploy Verification (Every Deploy)

Allow 2–3 minutes for Vercel, then:

- [ ] Open `dugoutlineup.com` on Android Chrome — hard reload
- [ ] Confirm version number in About tab matches deployed version
- [ ] Confirm "Server unavailable" pill does not appear
- [ ] Smoke test the specific feature that changed
- [ ] If share links changed — test `?s=<id>&view=true&enable_flag=viewer_mode` on mobile
- [ ] If data/Supabase changed — verify read and write round-trip
- [ ] Run game-day validation checklist if any lineup/game mode change

---

## Rollback Procedure

If production issue detected after deploy:

1. Identify last stable commit:
   `git log --oneline -10`

2. Revert the bad commit:
   `git revert <commit_hash>`

3. Run full deployment checklist with reverted version

4. Verify production health:
   - https://lineup-generator-backend.onrender.com/ping responds under 2s
   - dugoutlineup.com loads correctly
   - Lineup view works
   - Share link works without login

Target: resolved within 10 minutes of detection.

---

## Network Resilience (Offline Expectations)

If backend unavailable:
- Last saved lineup must still render from localStorage
- No blocking screen for viewing lineup
- Share links must degrade gracefully — clear error, never blank screen

**Android PWA Screenshot Policy**
Android OS blocks screenshots in standalone PWA mode — this is expected behavior, not a bug. Do not investigate. Share Link is the intended workaround. iOS unaffected.

---

## Incident Response

Triggers: UptimeRobot alert OR "Server unavailable" pill in prod

1. Check: https://lineup-generator-backend.onrender.com/ping
2. Check: Render dashboard logs
3. Check: https://status.supabase.com
4. If backend down → check Render for crashed dyno, restart if needed
5. If data issue → check Supabase RLS policies and recent migrations
6. If still broken after 5 min → execute rollback procedure

---

## Auth Principle (Non-Negotiable)

- Viewing lineup must NOT require login
- Editing requires auth
- Share links must always work for unauthenticated users
- Auth must never block Game Mode or share link rendering

---

## Infrastructure Reference

| Service | URL | Purpose |
|---|---|---|
| Frontend | dugoutlineup.com | Vercel, auto-deploys from main |
| Backend | lineup-generator-backend.onrender.com | Express on Render Starter plan ($7/mo, no spin-down) |
| Database | Supabase dashboard | Postgres + RLS |
| Uptime monitor | uptimerobot.com — monitor #802733786 | Pings prod /ping every 5 minutes; alerts via email + push notification (mobile app — see ## Incident Response) |
| Repo | github.com/kaushikkuberanathan/lineup_generator | monorepo |

> **NOTE:** UptimeRobot only monitors /ping (HTTP 200). Real functional health (DB connectivity, share link rendering, lineup generation) is validated by the GitHub Actions health-check.yml cron — check .github/workflows/health-check.yml for details.

### Key File Locations
frontend/src/App.jsx                    — APP_VERSION + VERSION_HISTORY
frontend/src/config/featureFlags.js     — feature flag definitions
frontend/src/hooks/useBackendHealth.js  — backend health polling
frontend/package.json                   — frontend version
backend/package.json                    — backend version
docs/product/ROADMAP.md                 — roadmap + version log
docs/product/MASTER_DEV_REFERENCE.md   — this file
docs/product/CHARTER.md                 — product charter (vision, scope, personas, metrics, principles, risks, governance)
docs/product/ONE_PAGER.md              — single-page scannable product summary
docs/product/FEATURE_MAP.md             — authoritative feature-to-doc-to-test mapping (18 features)
docs/product/DOC_TEST_DEBT.md           — documentation and test debt ledger (P0/P1/P2 items)
CLAUDE.md                               — project rules + Ship Gate + version history

---

## Document Governance

Product documents are versioned alongside the app. Both CHARTER.md and ONE_PAGER.md increment their internal version number on any phase transition or structural scope change.

| Document | Review Cadence | Trigger |
|----------|----------------|---------|
| `CHARTER.md` | Quarterly + on phase transitions | Phase gate, scope change, major persona shift |
| `ONE_PAGER.md` | Monthly | Phase status changes, non-goal updates |
| `ROADMAP.md` | Every release | Required in deploy checklist |
| `CLAUDE.md` | Every release + rule changes | Required in deploy checklist |
| `PERSONAS.md` | On phase transitions | Last refreshed v2.2.31 (8-persona rewrite) |
| `FEATURE_MAP.md` | Every release + feature change | See CLAUDE.md § Feature Map Update Rules |
| `DOC_TEST_DEBT.md` | Every other session (Audit Cadence) | See CLAUDE.md § Audit Cadence |

**Version bump rule:** On any phase change, update CHARTER.md version header, ONE_PAGER.md version header, and the Phase Status table in ONE_PAGER.md before the release commit.

---

## Feature Flags Reference

All flags live in the Supabase `feature_flags` table (global flags have `team_id = null`). Toggle instantly without a deploy — changes take effect on next page load.

| Flag | Default | Current | Purpose |
|---|---|---|---|
| MAINTENANCE_MODE | false | false | Show maintenance screen during deploys |
| GAME_MODE | true | true | Full-screen live game overlay |
| VIEWER_MODE | false | false | Read-only share link viewer mode |
| ACCESSIBILITY_V1 | false | false | Font floor, touch targets, contrast uplift |

Toggle SQL (replace FLAG_NAME and true/false as needed):
```sql
UPDATE feature_flags 
SET enabled = true, updated_at = now()
WHERE flag_name = 'FLAG_NAME' AND team_id IS NULL;
```

Add a new flag:
```sql
INSERT INTO feature_flags (flag_name, enabled, team_id, description)
VALUES ('NEW_FLAG', false, null, 'What this flag does');
```

RLS: anon role has SELECT only. No public write.
Coach bypass: https://dugoutlineup.com/?coach_access=mudhen2026
Revoke bypass: https://dugoutlineup.com/?clear_bypass=1

---

## team_data.schedule — Game Object Shape

Each element in `team_data.schedule` (JSONB array) follows this shape. All fields are optional at write time; missing fields default to the values shown.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | string | `Date.now().toString()` | Unique game ID (timestamp string) |
| `date` | string | `""` | ISO date string or empty |
| `time` | string | `""` | Display time string |
| `location` | string | `""` | Park/field name |
| `opponent` | string | `""` | Opponent team name |
| `result` | string | `""` | `'W'` · `'L'` · `'T'` · `''` |
| `ourScore` | string | `""` | Legacy display score (manual entry) |
| `theirScore` | string | `""` | Legacy display score (manual entry) |
| `battingPerf` | object | `{}` | Per-player batting stats keyed by player name |
| `snackDuty` | string | `""` | Parent name for snack duty |
| `snackNote` | string | `""` | Extra snack note |
| `gameBall` | array | `[]` | Player name strings who received game ball |
| `gameBallSearch` | string | `""` | Transient UI search string (not persisted to DB) |
| `scoreReported` | boolean | `false` | Whether score was submitted to league |
| `usScore` | number\|null | `null` | Final score — our team (set by `finalizeSchedule()`) |
| `oppScore` | number\|null | `null` | Final score — opponent (set by `finalizeSchedule()`) |
| `gameStatus` | string | `'scheduled'` | `'scheduled'` · `'final'` |
| `finalizedAt` | string\|null | `null` | ISO timestamp when game was finalized |
| `finalizedBy` | string\|null | `null` | `scorer_user_id` who finalized (local UUID or auth UID) |

**MERGE_FIELDS** (fields rescued from localStorage over DB on hydration):
```js
['scoreReported', 'snackDuty', 'snackNote', 'gameBall',
 'usScore', 'oppScore', 'gameStatus', 'finalizedAt']
```
These fields are written locally (by coaches on-device) and must not be overwritten by a DB hydration that lags behind.

**Finalization path** (`finalizeSchedule.js`):
- Called by `endGame()` in `useLiveScoring.js`
- Writes `usScore`, `oppScore`, `gameStatus='final'`, `finalizedAt`, `finalizedBy` to localStorage then Supabase
- Idempotent — re-calling on a `'final'` game is a no-op
- On Supabase failure: writes `pending_sync:<teamId>:finalize` to localStorage and returns `{ ok: false, error: 'sync_failed' }`; does NOT release scorer lock

---

## Supabase Schema — Live Scoring Tables

Three tables support the Live Scoring feature. All use `(game_id, team_id)` as the natural key.

### `live_game_state`
One row per active game+team. Upserted on every pitch, run, or outcome.

| Column | Type | Notes |
|--------|------|-------|
| `game_id` | text | |
| `team_id` | text | |
| `inning` | int | 1-based |
| `half_inning` | text | `'top'` or `'bottom'` |
| `outs` | int | 0–3 (resets at 3) |
| `balls` | int | current batter balls |
| `strikes` | int | current batter strikes |
| `my_score` | int | our team total runs |
| `opponent_score` | int | opponent total runs |
| `batting_order_index` | int | wraps around batting order |
| `runners` | jsonb | `[{ runnerId, base }]` base 1|2|3 |
| `current_batter` | jsonb | `{ id, name, number, orderPosition }` or null |
| `runs_this_half` | int | our runs in current half (mercy rule gate) |
| `opp_runs_this_half` | int | opponent runs in current half |
| `updated_at` | timestamptz | |

> `opp_balls` and `opp_strikes` are tracked in local React state only (transient, reset per batter — no Supabase column needed).

### `game_scoring_sessions`
One row per active game+team. Upserted when scorer claims; deleted on release.

| Column | Type | Notes |
|--------|------|-------|
| `game_id` | text | |
| `team_id` | text | |
| `scorer_user_id` | text | UUID v4 from localStorage (`scorer_local_id`). **FK to auth.users dropped** — restore at Phase 4C. |
| `scorer_name` | text | first name or 'Coach' |
| `last_heartbeat` | timestamptz | updated every 20 s by the scorer's device |

### `scoring_audit_log`
Append-only. One row per action (pitch, run, lock claim/release, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `game_id` | text | |
| `team_id` | text | |
| `actor_user_id` | text | **FK to auth.users dropped** — restore at Phase 4C. |
| `action` | text | e.g. `'pitch_recorded'`, `'at_bat_resolved'`, `'lock_claimed'` |
| `payload` | jsonb | action-specific data |
| `recorded_at` | timestamptz | |

### RLS Policies (Current — Pre-Auth)
All three tables have an open `allow_scorer_writes` policy (anon role can write). Phase 4C: drop these and re-add `auth.uid() = scorer_user_id` scoped policies.

---

## Outstanding Manual Actions

### Resolved (April 27, 2026)
- [x] Migrations 002 and 003 status — confirmed applied via Supabase verification on April 27, 2026: `team_data_history` table active (columns: id, team_id, snapshot, roster_count, written_at, write_source); `profiles` table has 1 row; `team_memberships` table has 10 rows
- [x] Add `ADMIN_KEY` to Render environment variables — confirmed present in backend/.env and Render
- [x] Fix silent admin approval bug — `.isUUID()` rejects numeric team ID `1774297491626` — resolved

### Still Pending
- [ ] Drop deprecated column: `ALTER TABLE team_data DROP COLUMN snack_duty` — column verified as still present in Supabase on April 27, 2026 (jsonb type). BEFORE DROPPING: audit codebase for any remaining read/write references to `snack_duty` (grep frontend/ and backend/). If clean, run the ALTER in Supabase SQL Editor. If references exist, they must be removed first.

---

## Analytics — Mixpanel Events

**48 Mixpanel events** as of v2.5.2. Full reference: `docs/analytics/ANALYTICS.md`.

Recent additions:
- `inning_undo_dismissed` (v2.5.2) — fires when the half-inning undo toast closes via the ✕ dismiss button or natural 10s expiry (previously auto-close was silent).

Count/outs strip pattern (v2.5.2): two pills rendered at both LiveScoringPanel.jsx render sites (STATE 1 splash + main scorer). Tokens: Count pill bg `rgba(255,255,255,0.06)` (neutral); Outs pill bg `rgba(255,140,66,0.12)` (warm tint), active dot `#FF8C42`, label `#FFB89A`. Inning indicator stays leftmost, outside both pills. Display-only — no scoring logic touched.

- Mercy banner pattern: both home and opponent render at top-of-panel as full-width stripes (#7c2d12). Explicit half-inning guards (gs.halfInning === myTeamHalf vs !==) gate render eligibility.

---

## v2.6.0 Backlog

### P0 — Critical bugs (user-impacting, ship first in v2.6.0)
- [ ] **Diagnose share/print not working in prod** — confirmed broken on April 24, 2026 (game day) and April 27, 2026 (production smoke test post-v2.5.1 deploy). Root cause UNKNOWN. NOT caused by `renderSharedView` hooks violation — that fix shipped in v2.1.6 (commit 46f071a, `SharedView` component at App.jsx:2560). Investigation needed: reproduce locally, check browser console errors on `?s=` URLs, verify share/print buttons render, check whether share payload generation is failing or share view rendering is failing.
- [ ] **Audit `snack_duty` codebase usage** before dropping the column (see ## Outstanding Manual Actions). This is a prerequisite for that drop, not the drop itself.

### P0 — Infrastructure (complete before next feature sprint)
- [ ] CI workflow `BACKEND_URL` audit — backend job + smoke job both hardcode prod URL; evaluate whether to point at a dev/preview backend or make tests environment-aware
- [ ] Verify `RESEND_DOMAIN_VERIFIED=true` is set in Render production environment variables (local `.env` confirmed; Render dashboard not checked this session)

### P1 — Active bugs (Stories 15/16 from v2.3.4 backlog)
- [ ] Story 15: RLS policy blocking `team_data` writes in some dev scenarios — investigate auth state issue
- [ ] Story 16: "No batting order set" UI in dev real-game mode — likely sibling of Story 15 (team_data Supabase READ failing); fix 15 first

### P2 — Scoring subsystem retro items
- [ ] Story 19: Opponent runners on bases — diamond parity with home team during opponent half
- [ ] Story 20: Half-flip helper extraction (4 sites reset inning state independently; converge on `flipHalfInning(gs, cause)`)
- [ ] Story 21: "No pitches yet" stale copy when pitches occurred mid-at-bat
- [ ] Story 30: `isFlagEnabled` DB-read refactor (logged in v2.5.0)

---

## Strategic North Star

> You've built a great system for shipping safely — now shift focus to making the product usable in 30 seconds on a baseball field.

Product priorities above deployment process, always:
1. Share link bulletproof — coach generates, everyone sees, zero friction
2. Game Mode dugout-ready under pressure
3. Onboarding zero friction — magic link or no-auth read-only
