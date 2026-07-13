# Production Schema Baseline

**Captured:** 2026-07-13 from prod (`hzaajccyurlyeweekvma`)
**Purpose:** ground truth. Until now there was no source of truth to diff production
against - which is why RLS was disabled on five tables for months, a recursive policy
broke the admin panel from day one, and a missing FK broke the Coaches tab, all
invisibly. See #351.

**This file is authoritative for what prod ACTUALLY contains.** Where the migration
files in `backend/migrations/` or `backend/src/db/migrations/` disagree with it, the
migration files are wrong.

---

## DRIFT FOUND (repo says X, prod says Y)

### 1. `team_memberships` role CHECK - THE BIG ONE

**Repo** (`003_create_team_memberships.sql`):
```sql
CHECK (role IN ('admin', 'coach', 'scorekeeper', 'viewer'))    -- 4 roles
```

**Prod** (actual):
```sql
CHECK (role = ANY (ARRAY['admin','viewer','team_admin','coordinator','coach','scorekeeper','parent']))    -- 7 roles
```

Someone widened it to accept the legacy vocabulary, outside version control.

**This invalidates WS-1's stated diagnosis (#336).** WS-1's commits, PR #341, and the
roadmap doc all assert that `/admin/approve-link` threw a CHECK violation when
approving a `team_admin` request. **It would not have** - prod's constraint permits
`team_admin`. That claim was inferred from the repo's constraint and never tested
against the live database.

WS-1's *work* remains correct (normalizing role vocabulary is right, and the
`/approve` validator genuinely did omit `admin` - that is application code, verified).
But the *reason those three requests were stuck* was something else entirely - see #2.

### 2. Why the April access requests were actually stuck

```sql
CREATE UNIQUE INDEX team_memberships_team_email_unique_idx
  ON team_memberships (team_id, email) WHERE email IS NOT NULL;
```

Two of the three stuck requests were for emails that **already had an active
membership on that team**:

| Request | Email | Already a member? |
|---|---|---|
| Test User | `kaushik.kuberanathan@gmail.com` | YES - active `admin` |
| Gaya Kau | `kaushikkumar.kuberanathan@cox.com` | (a KK alias) |
| Eshaan Kaushik | `eshaan.kaushik122@gmail.com` | NO - new email |

Approving the first two would insert a duplicate `(team_id, email)` and violate the
**unique index** - not the role CHECK. And Eshaan's approval **succeeded** on
2026-07-13, consistent with his being the only genuinely new email.

The failure was duplicate-membership, not role vocabulary.

### 3. `access_requests.requested_role` CHECK

Prod also permits the full legacy set:
```sql
CHECK (requested_role IS NULL OR requested_role = ANY
       (ARRAY['team_admin','coordinator','coach','scorekeeper','parent']))
```
Note: this does NOT permit `admin` or `viewer` - the canonical values WS-1 now writes.
**Ingestion normalization (a51db38) writes `admin`/`viewer`, which this CHECK REJECTS.**
Needs verification - a request-access for a Head Coach may now fail at the DB.

### 4. `SECURITY DEFINER` functions with no pinned `search_path`

| Function | SECURITY DEFINER | search_path |
|---|---|---|
| `activate_membership` | YES | **(none)** - escalation vector |
| `restore_game_state` | YES | **(none)** - escalation vector |
| `is_active_admin` | YES | `public` (correct) |
| `snapshot_team_data` | YES | `public` (correct, fixed 2026-07-13) |
| `prune_team_data_history` | YES | `public` (correct, fixed 2026-07-13) |
| `prune_roster_snapshots` | no | n/a |
| `set_updated_at` | no | n/a |
| `update_updated_at` | no | n/a |

A `SECURITY DEFINER` function without a fixed `search_path` lets a caller shadow an
unqualified table name with one in their own schema; the function then executes
against it **as `postgres`**. Two live instances.

### 5. `feature_flags.team_id` is `bigint`

Every other `team_id` in the schema is `text`. Team IDs include slugs
(`party-animals-8u`, `bananas-8u`), which **cannot be stored in a bigint**. So
team-scoped feature flags only work for the one numeric team (`1774297491626`); the
other six teams cannot have one.

### 6. `teams.owner_id` is `text` defaulting to `''`

Not a uuid, no FK to `auth.users`. Team ownership is not actually linked to a user.

### 7. Duplicate index on `access_requests`

`access_requests_team_status_created_idx` and `access_requests_team_status_idx` are
identical: `(team_id, status, requested_at DESC)`. One is redundant.

---

## RLS STATE (as of 2026-07-13)

| Table | RLS | Policies | anon/auth grants |
|---|---|---|---|
| `team_data` | **OFF** | 0 | **FULL CRUD + TRUNCATE** |
| `teams` | **OFF** | 0 | **FULL CRUD + TRUNCATE** |
| `roster_snapshots` | **OFF** | 0 | **FULL CRUD + TRUNCATE** |
| `auth_events` | on | 0 | NONE (locked 2026-07-13) |
| `team_data_history` | on | 0 | NONE (locked 2026-07-13) |
| `team_memberships` | on | 2 | granted, policy-gated |
| `access_requests` | on | 2 | granted, policy-gated |
| `share_links` | on | 2 | granted (anon SELECT is required for viewer mode) |
| `feedback` | on | 2 | granted, policy-gated |
| `profiles` | on | 1 | granted, policy-gated |
| `at_bats` | on | 2 | granted |
| `live_game_state` | on | 3 | granted |
| `game_scoring_sessions` | on | 3 | granted |
| `scoring_audit_log` | on | 3 | granted |
| `feature_flags` | on | 1 | granted |

**The first three are the open exposure (#342).** The anon key ships in the frontend
bundle. Until the requireAuth cutover (WS-3) moves roster writes behind the backend,
RLS cannot be enabled on them without breaking every coach's save.

---

## TABLES (14)

access_requests, at_bats, auth_events, feature_flags, feedback,
game_scoring_sessions, live_game_state, profiles, roster_snapshots,
scoring_audit_log, share_links, team_data, team_data_history, team_memberships,
teams

---

## FOREIGN KEYS

| Table | Constraint | Definition |
|---|---|---|
| `access_requests` | `access_requests_reviewed_by_fkey` | `(reviewed_by) -> auth.users(id)` |
| `auth_events` | `auth_events_user_id_fkey` | `(user_id) -> auth.users(id) ON DELETE SET NULL` |
| `feedback` | `feedback_coach_id_fkey` | `(coach_id) -> auth.users(id) ON DELETE SET NULL` |
| `profiles` | `profiles_id_fkey` | `(id) -> auth.users(id) ON DELETE CASCADE` |
| `scoring_audit_log` | `scoring_audit_log_at_bat_id_fkey` | `(at_bat_id) -> at_bats(id) ON DELETE SET NULL` |
| `team_data` | `team_data_team_id_fkey` | `(team_id) -> teams(id) ON DELETE CASCADE` |
| `team_memberships` | `team_memberships_team_id_fkey` | `(team_id) -> teams(id) ON DELETE CASCADE` **(added 2026-07-13, migration 008)** |
| `team_memberships` | `team_memberships_user_id_fkey` | `(user_id) -> auth.users(id) ON DELETE CASCADE` |

**MISSING FKs worth noting:**
- `access_requests.team_id` -> `teams(id)` - none. (One row holds a NULL `team_id`.)
- `roster_snapshots.team_id` -> `teams(id)` - none.
- `team_data_history.team_id` -> `teams(id)` - none.
- `game_scoring_sessions` / `live_game_state` / `at_bats` / `scoring_audit_log`
  `.team_id` -> `teams(id)` - none.
- `game_scoring_sessions.scorer_user_id` and `scoring_audit_log.actor_user_id` are
  **TEXT, not uuid, and not FK'd** to `auth.users`. The audit trail is forgeable.
  (This is the WS-4 gap in the auth roadmap.)

---

## TRIGGERS

| Table | Trigger | Function |
|---|---|---|
| `at_bats` | `at_bats_updated_at` | `set_updated_at()` BEFORE UPDATE |
| `live_game_state` | `live_game_state_updated_at` | `set_updated_at()` BEFORE UPDATE |
| `profiles` | `profiles_updated_at` | `update_updated_at()` BEFORE UPDATE |
| `roster_snapshots` | `trg_prune_roster_snapshots` | `prune_roster_snapshots()` AFTER INSERT |
| `team_data` | `team_data_updated_at` | `update_updated_at()` BEFORE UPDATE |
| `team_data` | `trg_snapshot_team_data` | `snapshot_team_data()` AFTER INSERT OR UPDATE |
| `teams` | `teams_updated_at` | `update_updated_at()` BEFORE UPDATE |

Note there is no trigger calling `prune_team_data_history()` - the function exists but
nothing fires it. `team_data_history` has grown to 2,811 rows.

---

## SUPABASE MIGRATION LEDGER

Contains ONLY the five migrations applied 2026-07-13:

```
20260713143900  p0_enable_rls_auth_events
20260713144129  p0_lock_team_data_history
20260713154419  p1_fix_recursive_team_memberships_policy
20260713155017  p1_add_team_memberships_teams_fk
20260713172035  p0_widen_access_requests_role_check
```

**Everything else in this schema was applied by hand.** That is the root problem
(#351). This baseline is the first step toward fixing it.

---

## HOW TO REGENERATE

The queries used to build this are in `docs/db/schema_introspection.sql`. Re-run them
against prod and diff against this file. Any difference is drift.

Better: adopt the Supabase CLI so `supabase db diff` does this automatically.
