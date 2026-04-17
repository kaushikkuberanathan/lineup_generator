# Lineup Generator — Master Development & Deployment Reference

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
| Backend | lineup-generator-backend.onrender.com | Express on Render free tier |
| Database | Supabase dashboard | Postgres + RLS |
| Uptime monitor | uptimerobot.com — monitor #802733786 | Pings /ping every 5 min |
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

## Outstanding Manual Actions

- [ ] Migrations 002 and 003 status — confirm if roster_history and original feature_flags tables were ever executed
- [ ] Add `ADMIN_KEY` to Render environment variables
- [ ] Drop deprecated column: `ALTER TABLE team_data DROP COLUMN snack_duty`
- [ ] Fix silent admin approval bug — `.isUUID()` rejects numeric team ID `1774297491626`

---

## Next Session Priorities

1. Extract `renderSharedView` into proper React component (fixes blank screen on bare `?s=` share links)
2. Remove `VIEWER_MODE` gate from Share Viewer Link button
3. Game Mode via share link (`?mode=dugout`) for dugout coaches
4. Make `shareCurrentLineup()` always generate `&view=true` links

---

## Strategic North Star

> You've built a great system for shipping safely — now shift focus to making the product usable in 30 seconds on a baseball field.

Product priorities above deployment process, always:
1. Share link bulletproof — coach generates, everyone sees, zero friction
2. Game Mode dugout-ready under pressure
3. Onboarding zero friction — magic link or no-auth read-only
