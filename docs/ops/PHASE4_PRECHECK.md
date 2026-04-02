# Phase 4 Auth Cutover — Pre-Cutover Checklist

> NOTE: Phase 4 phone OTP cutover abandoned.
> Auth replaced with email magic-link + Google OAuth.
> This document is archived for reference only.

## What Phase 4 Is

Adding `requireAuth` middleware to the existing routes in `backend/index.js` — the
routes that coaches use today without authentication. After this change, every
Supabase call from the frontend will need a valid session token.

**This is a breaking change for all coaches.** They will be prompted to log in the
next time they open the app. That is intentional. Run this checklist before flipping
the switch.

---

## Pre-conditions (must all be true before proceeding)

- [ ] **At least 2–3 coaches have tested the full magic-link flow** — request access → admin
      approves → login via email → see their team
- [ ] **Admin UI is functional** — you can log in at `/admin.html`, view pending
      requests, approve, and see the Members list correctly (no empty memberships bug)
- [ ] **Stan Hoover account tested** — his status should be `active` (not `invited`)
      before cutover; confirm OTP delivery to +15705155156

---

## Step 1 — Fix Known Bugs Before Cutover

### Bug A: `admin.js` approve route rejects numeric team IDs

**File:** `backend/src/routes/admin.js`
**Problem:** `body('teamId').isUUID()` validation rejects `1774297491626`
(the Mud Hens team_id) because it is a numeric string, not a UUID.
Admin cannot approve access requests for teams with legacy numeric IDs.

**Fix:** Change the validator to accept any non-empty string:
```js
// Before:
body('teamId').isUUID()

// After:
body('teamId').notEmpty().trim()
```

### Bug B: `/me` returns `memberships: []` intermittently

**File:** `backend/src/routes/auth.js` + `frontend/public/admin.html`
**Problem:** Token expiry mid-session causes the memberships join to return empty.
**Fix:**
1. In `admin.html` — add token refresh before calling `/me`:
   send the stored `refresh_token` to Supabase auth before the `/me` fetch.
2. In `auth.js` `/me` handler — add `id` to the `team_memberships` SELECT
   (needed for admin UI action buttons).

### Bug C: Debug logs leaking to production

**Files:** `backend/src/routes/auth.js`, `backend/src/lib/supabase.js`
**Items to remove:**
- `[login debug]` console.log blocks in auth.js
- `[me debug]` console.log blocks in auth.js
- `[supabase]` admin key prefix log in supabase.js

---

## Step 2 — Inspect Current RLS Policies

Run this in Supabase Dashboard → SQL Editor. **Do not skip this step.**

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**What you should see (verified 2026-03-30):**

| Table | RLS? | Policies |
|-------|------|----------|
| `teams` | disabled | none — RLS off |
| `team_data` | disabled | none — RLS off |
| `roster_snapshots` | disabled | none — RLS off |
| `team_data_history` | disabled | none — RLS off |
| `share_links` | ✓ | `"public read"` (anon SELECT) + `"public insert"` (anon INSERT ← gets dropped) |
| `access_requests` | ✓ | admin ALL + `public_can_request_access` INSERT |
| `profiles` | ✓ | `user_owns_profile` (owner ALL) |
| `team_memberships` | ✓ | admin ALL + `user_sees_own_membership` SELECT |
| `feedback` | ✓ | admin SELECT + owner INSERT |

If your output does not match this table, stop and investigate before running 004.

Copy the output — you will reference it when reviewing 004_rls_fixes.sql.

---

## Step 3 — Run Migration 004 (RLS Hardening)

**File:** `backend/migrations/004_rls_fixes.sql`

Run in Supabase Dashboard → SQL Editor. This migration:
- Enables RLS on: `share_links`, `teams`, `team_data`, `roster_snapshots`, `team_data_history`
- Adds auth-gated policies on the first four
- Leaves `team_data_history` with RLS enabled but no policies (service_role + trigger only)

**Verify after running:**
```sql
-- Confirm RLS is on for all five tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('share_links', 'teams', 'team_data',
                    'roster_snapshots', 'team_data_history');

-- Confirm policies were created
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('share_links', 'teams', 'team_data', 'roster_snapshots')
ORDER BY tablename;
```

Expected: 9 policies total across the four tables. `team_data_history` has 0 policies.

---

## Step 4 — Update Backend: Add `requireAuth` to Existing Routes

In `backend/index.js`, wrap the existing data routes with `requireAuth`:

```js
// Before (current):
app.get('/api/teams/:teamId/data', async (req, res) => { ... });

// After:
const { requireAuth } = require('./src/middleware/requireAuth');
app.get('/api/teams/:teamId/data', requireAuth, async (req, res) => { ... });
```

Apply to all routes that access team-specific data. The `/ping`, `/health`, `/api/ai`,
and all `/api/v1/auth/*` routes stay unprotected.

**Zero-downtime reminder:** Test locally with `node index.js` before deploying.

---

## Step 5 — Update Frontend: Send Auth Token with Supabase Calls

After Phase 4, the Supabase anon client must send the authenticated user's JWT.

Supabase JS client handles this automatically when the user is signed in via
`supabase.auth.signInWithOtp()` / `signInWithPassword()`. The anon client picks
up the session from localStorage and sends the Bearer token with every request.

**Verify the flow:**
1. Coach logs in via OTP
2. `supabase.auth.getSession()` returns a valid session
3. `dbSaveTeamData()` call succeeds (no 401/403)
4. `dbLoadTeamData()` call returns team data (no empty result or 403)

If you see 403 on `team_data`, check that:
- `team_memberships` row exists for this `user_id` + `team_id` with `status = 'active'`
- The JWT `auth.uid()` matches the `user_id` in the membership

---

## Step 6 — Smoke Test Scenarios

Run these manually after deploying the Phase 4 backend + migration:

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| S1 | Share link (unauthenticated viewer) | Open `?s=<id>` in incognito | Lineup loads, no login prompt |
| S2 | Coach reads own team | Log in as Kaushik, open Mud Hens | Roster + schedule loads |
| S3 | Cross-team block | Via Supabase SQL: `SET role anon; SELECT * FROM team_data WHERE team_id != '1774297491626'` | 0 rows |
| S4 | Anon write block | Via Supabase SQL: `SET role anon; INSERT INTO team_data (team_id) VALUES ('test')` | Error: RLS violation |
| S5 | Share link still creatable | As logged-in coach, create a share link | Inserts successfully |
| S6 | History table anon block | `SET role anon; SELECT * FROM team_data_history` | 0 rows |
| S7 | Share token enumeration (acceptable) | `SET role anon; SELECT id FROM share_links LIMIT 5` | Returns rows (expected — see S7 note in 004_rls_fixes.sql) |

---

## Step 7 — Notify Coaches

Send a brief message to all coaches:
> "Hey — I've added a quick phone login to the app. Next time you open it, you'll be
> asked to verify your phone number. It just takes a few seconds. Text me if you have
> any issues!"

---

## Step 8 — Post-Cutover Cleanup (within 1 week)

- [ ] Remove Supabase test OTP entry (phone `+14044930548`, code `123456`) from
      Supabase Auth → Providers → Phone → Test phone numbers
- [ ] Remove `[login debug]` and `[me debug]` console.logs from auth.js (if not done in Step 1)
- [ ] Update `CLAUDE.md` — change "Phase 4 Cutover" status from TODO to DONE
- [ ] Update `docs/SOLUTION_DESIGN.md` — remove "Phase 3" qualifier from auth section
- [ ] Update migration note: `003_create_team_memberships.sql` needs updating to reflect
      `team_id TEXT` (was UUID before alter)
- [ ] Check `team_memberships.team_id` DEFAULT_TEAM_ID in `.env` and Render is `1774297491626`

---

## Rollback Plan

If Phase 4 breaks a coach's access in production:

**Immediate (< 5 min):** Revert the `index.js` deploy on Render (roll back to previous
Render deploy). This removes `requireAuth` from routes. Coaches can access their
teams again using the anon key — Phase 3 state restored.

**RLS rollback (if needed separately):** The policies in `004_rls_fixes.sql` each have
a rollback comment. To open a specific table while debugging:
```sql
-- Example: temporarily open team_data for anon reads
CREATE POLICY "temp_open" ON public.team_data FOR ALL USING (true);
-- Remove after debugging:
DROP POLICY "temp_open" ON public.team_data;
```

**History table emergency open** (if snapshot trigger breaks):
```sql
CREATE POLICY "temp_open_for_recovery" ON public.team_data_history FOR ALL USING (true);
DROP POLICY "temp_open_for_recovery" ON public.team_data_history;
```
