# Troubleshooting: Things That Are Not What They Look Like

**Purpose:** every entry here cost real time or caused a production incident. If you
are debugging something and it makes no sense, **read this first.**

**The meta-lesson, stated once:**

> Six times in one week, we acted on a **description** of the database instead of
> **querying** it. The descriptions were wrong every time. One of them broke the
> public signup form.
>
> **Before any schema-dependent change, query the live database.** Not the migration
> files. Not the docs. Not memory. The database.

---

## FEATURE FLAGS

### The flag system is mostly theater. Toggling a DB flag usually does nothing.

**7 of the 8 flags the code references are read from the BUNDLED JAVASCRIPT**, not the
database. Flipping a row in `feature_flags` has **no runtime effect** without a
redeploy.

There are **two completely different flag readers** with **opposite failure postures**:

| | `isFlagEnabled(name)` | `useFeatureFlag(name, teamId)` |
|---|---|---|
| **Source** | Bundled JS + localStorage. **Never touches Supabase.** | **Queries the database.** |
| **File** | `frontend/src/config/featureFlags.js` | `frontend/src/hooks/useFeatureFlag.js` |
| **When absent** | Falls back to the **static default** in `FEATURE_FLAGS` | **Returns `false`. Fails closed.** |
| **Case** | Case-sensitive key lookup | Case-sensitive `.eq('flag_name', ...)` |
| **Used for** | `SCORING_SHEET_V2`, `ACCESSIBILITY_V1`, `COMBINED_GAMEMODE_AND_SCORING` | **`live_scoring` ONLY** |

And a third, `useFeatureFlags()` / `fetchRuntimeFlags()`:
- Queries **global rows only** (`.is('team_id', null)`) - team-scoped rows are **never
  fetched**
- **Uppercases every key** (`row.flag_name.toUpperCase()`), so `game_mode` and
  `GAME_MODE` collide onto the same key
- Falls back to the bundled defaults if the DB is unreachable

### `live_scoring` is the ONLY flag that actually reads the database.

**And it defaults to `false` when absent.** If you rebuild a database from
`schema.sql` (which is schema-only and seeds nothing), **live scoring silently turns
off.** No error. It just does not work.

**Prod has NO global `live_scoring` row** - only two team-scoped ones:
`1774297491626` (Mud Hens) and `9000000000001` (Demo). Which means **every other team
has live scoring off.** Intentional or a gap - unresolved, but it is the current state.

### `game_mode` (lowercase) is a DEAD ROW in prod.

Prod has both:
```
game_mode   enabled=true  team_id=1774297491626   <- lowercase, team-scoped. DEAD.
GAME_MODE   enabled=true  team_id=null            <- uppercase, global.
```
`fetchRuntimeFlags` queries `.is('team_id', null)` only, so the **team-scoped
lowercase row is never fetched**. And `useFeatureFlag` (the only team-scoped reader)
is never called for game mode. **Nothing reads it.** Safe to delete.

`GAME_MODE` (global) *is* fetched and merged - but **no code reads that key either**.
Game Mode is gated by the bundled default.

### If a flag change "isn't working"
1. Is it `live_scoring`? -> it reads the DB. Check the row, and check `team_id`.
2. Anything else? -> **it reads the bundle.** The DB row is decoration. You need a
   redeploy, or a `localStorage` override (`flag_<NAME>` = `'true'` / `'false'`).

---

## DATABASE / SCHEMA

### The repo does not describe the database. Neither migration tree does.

| Source | Reality |
|---|---|
| `backend/migrations/` | Describes a database that does not exist |
| `backend/src/db/migrations/` | Describes a **different** database that does not exist |
| The docs | Described a **third** one - and lied |
| **`docs/db/schema.sql`** | **Read from the running database. This is the only true one.** |

**Ground truth is `docs/db/schema.sql`.** It was read from `pg_catalog`, not written
from a migration.

### Prod's role CHECK allows SEVEN roles. The repo says FOUR.

```sql
-- backend/src/db/migrations/003_create_team_memberships.sql says:
CHECK (role IN ('admin', 'coach', 'scorekeeper', 'viewer'))                    -- 4

-- PROD ACTUALLY ENFORCES:
CHECK (role = ANY (ARRAY['admin','viewer','team_admin','coordinator',
                         'coach','scorekeeper','parent']))                     -- 7
```

**Building on the repo's version BROKE THE PUBLIC SIGNUP FORM.** WS-1's ingestion
normalization wrote `admin` and `viewer` to `access_requests.requested_role` - values
the live CHECK **rejected**. Head Coach and Parent signups returned 500 from the
moment v2.5.31 shipped until migration 009 widened the constraint.

**The test suite passed the whole time**, including the test that specifically covers
this case - because it asserts on a **mocked** insert payload. The mock proved the code
did what was intended. **Nothing proved the database would accept it.** (See #348.)

### TWO migration directories with FIVE colliding numbers.

`002`, `004`, `005`, `006`, `007` each mean **different migrations** depending on the
tree. **"Run migration 007" is ambiguous.** Always give the full path.

**`backend/migrations/` is canonical.** (`backend/CLAUDE.md` said the opposite until
2026-07-13.)

**Two files in the old tree are DANGEROUS:**
- `backend/src/db/migrations/005_atomic_verify_function.sql` re-creates
  `activate_membership()` - dropped in prod: dead, phone-era, `SECURITY DEFINER` with
  no pinned `search_path`, and it declared `team_id UUID` against a `TEXT` column so it
  **could never have worked**.
- `backend/src/db/migrations/004_rls_policies.sql` contains the **recursive**
  `team_memberships` policy that made **every authenticated read of that table throw**.
  The admin panel's gate had **never** worked. Rebuilding from it re-breaks the panel.

### A VIEW can read straight through an RLS lock.

Views run with the **view owner's** privileges by default (`security_invoker = false`,
the Postgres default). Locking a table does **not** lock a view that selects from it.

`team_data_history_latest` was leaking 11 rows past the RLS lock on
`team_data_history` - a lock that had been **verified working** the day before.

**Both views are now `security_invoker = true`**, so they inherit the base table's RLS
automatically. **If you add a view, set this.**

### `SECURITY DEFINER` without a pinned `search_path` is a privilege-escalation vector.

The function runs as `postgres` and resolves **unqualified** table names against
whatever schema the **caller** puts first. A caller can shadow `at_bats` with their own
table and have a superuser-privileged function write to it.

**All four `SECURITY DEFINER` functions in prod are now pinned** (`SET search_path =
public`). **If you add one, pin it.**

`prune_roster_snapshots`, `set_updated_at`, `update_updated_at` are `SECURITY INVOKER`
and are **not** vectors - they run as the caller. An unpinned `search_path` on an
invoker function is fine.

### The `snapshot_team_data` trigger MUST be `SECURITY DEFINER`.

Coaches write `team_data` with the **anon key**. If the trigger runs as the invoker, its
insert into the RLS-locked `team_data_history` executes **as anon** - and is **blocked**.
The trigger fails, so **the coach's roster save fails.**

`004_rls_fixes.sql` claimed this trigger already *was* `SECURITY DEFINER`.
**It was not.** Running that file as written would have broken every roster save.

**Smoke test after any change to this area:**
```sql
UPDATE public.team_data SET locked = locked WHERE team_id = '<a real team>';
SELECT count(*) FROM public.team_data_history;   -- must have gone UP
```

---

## AUTH / ACCESS

### "Access Denied" in the admin panel, for a real admin.

The panel's gate queries `team_memberships` **as an authenticated user, through RLS**.
Until 2026-07-13 that policy **queried its own table** - infinite recursion - so
**every authenticated read threw**, the panel treated the error as "not an admin", and
denied you.

Fixed by `is_active_admin()`, a `SECURITY DEFINER` function that bypasses RLS and
breaks the loop. **Do not put a subquery against `team_memberships` inside a policy
ON `team_memberships`.**

### An access request that will not approve.

**It is probably NOT the role.** There is a **unique index**:

```sql
team_memberships_team_email_unique_idx  UNIQUE (team_id, email) WHERE email IS NOT NULL
```

If that email **already has a membership on that team**, approving throws a
**unique violation**. Two of the three requests stuck since April 2026 were exactly
this - duplicate memberships, not a role problem. **The panel gives no useful error.**

### The admin panel bypasses the entire backend.

`frontend/public/admin.html` writes **directly to Supabase** via the client SDK. Seven
writes across three tables. It does **not** call the Express API.

So it bypasses `normalizeRole()`, `requireAuth`, `requireAdmin`, `reviewed_by`
attribution, and auth-event logging. **A fix to a backend route does not fix the
panel.** (See #338.)

### The three role-vocabulary boundaries are DELIBERATELY asymmetric.

| Boundary | Input | Legacy value |
|---|---|---|
| `POST /request-access` | Public form | **TRANSLATE** |
| `GET /admin/approve-link` | Legacy DB read | **TRANSLATE** |
| `POST /admin/approve` | Admin dropdown | **REJECT** |

Public input is tolerated and normalized (we do not control what a cached bundle
sends). Admin-chosen input is **rejected** if malformed - transforming it would
silently accept junk.

**This looks like an inconsistency. It is not.** Do not "fix" it.

---

## SECURITY: THINGS THAT ARE STILL BROKEN

### RLS is OFF on `team_data`, `teams`, `roster_snapshots`. (#342)

The anon key **ships in the frontend bundle**. With RLS off and full grants, anyone can
read every child's name on every roster, overwrite any roster, delete any team, or
**`TRUNCATE`** the lot.

**It cannot be turned on until WS-3.** The React app writes all three **directly** with
the anon key, so any `auth.uid()` policy breaks **every coach's save**.

### Four hardcoded backdoors on the live scoring tables. (#355)

```sql
at_bats_anon_test / game_state_anon_test / scorer_lock_anon_test / audit_log_anon_test
  FOR ALL  USING (team_id = ANY (ARRAY['1774297491626', '9000000000001']))
```

**`1774297491626` is the Mud Hens.** `anon` can rewrite the score, forge at-bats, steal
the scorer lock, and fabricate audit entries.

Worse: those tables **also** carry `allow_scorer_writes` with `USING (true) WITH CHECK
(true)` - **wide open to everyone, every team.** The backdoors are not even the widest
door.

**Also needs WS-3.**

### The audit trail is forgeable.

`game_scoring_sessions.scorer_user_id` and `scoring_audit_log.actor_user_id` are
**TEXT, not UUID, and not FK'd to `auth.users`.** They hold a **localStorage UUID**.
Anyone can claim to be anyone. (WS-4.)

---

## TEST SUITES

### Tests write to PRODUCTION. (#339)

The backend suites run against the prod Render backend and leave rows behind:
- **~593 `val-suite-*@test.com` pending access requests** burying real ones
- **10 orphaned `active` coach memberships** on the live team

Any query over `team_memberships` or `access_requests` is **contaminated**.

### No test has ever exercised RLS. (#348)

**Every backend test uses `supabaseAdmin` - the service role - which BYPASSES RLS
entirely.** So RLS has **zero** coverage.

That blind spot hid:
- RLS being disabled on five tables **for months**
- The recursive policy that broke the admin panel **from day one**
- The missing FK that broke the Coaches tab

**All three were found by hand. None by a test.**

---

## ENVIRONMENT / TOOLING

### DEV was never a mirror of prod. It was a fork.

Three independently hand-built schemas sharing table names. DEV had a table prod
lacks (`pitcher_tracking`), a column prod lacks (`teams.pitch_type`), was **missing** a
column prod has (`team_memberships.status`), and had a **six**-role CHECK including
`platform_admin` and `scorer` - values that exist nowhere else.

**A migration rehearsed against DEV proved nothing about prod.**

Rebuild it with `docs/db/dev_rebuild.sql`. **The seed block is not optional** - see the
`live_scoring` note above.

### DEV auto-pauses (free tier).

If it is unreachable, it is almost certainly paused. Restore from the Supabase
dashboard. **It will pause again after ~1 week of inactivity.**

### `isFlagEnabled` vs `useFeatureFlag` - see FEATURE FLAGS above. This one will get you.
