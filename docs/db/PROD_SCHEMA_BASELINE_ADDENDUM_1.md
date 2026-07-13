# Production Schema Baseline - ADDENDUM 1

**Captured:** 2026-07-13 from prod (`hzaajccyurlyeweekvma`)
**Extends:** `PROD_SCHEMA_BASELINE.md`

The original baseline enumerated tables, columns, constraints, indexes, triggers,
functions and RLS state. **It had no VIEWS section, no GRANTS section, and did not
list the RLS policies themselves.**

That gap was not academic. Within twenty minutes of continuing the schema capture, it
surfaced a **live security hole in a control shipped the previous day** (see
"Views", below). You cannot detect drift in objects you never enumerate.

This addendum closes those gaps.

---

## CORRECTION to the original baseline

The original says prod has **14 tables**. It has **15**. That was an arithmetic error
on my part, not drift - the original's own table list contains all fifteen. No object
is missing.

---

## VIEWS (2) - previously unenumerated

| View | security_invoker | anon grants | Consumers |
|---|---|---|---|
| `team_data_history_latest` | **true** (fixed, migration 011) | **NONE** (revoked) | **none - orphan** |
| `roster_snapshots_latest` | **true** (fixed, migration 011) | granted | **none - orphan** |

### `team_data_history_latest`
```sql
SELECT DISTINCT ON (team_id)
       team_id, roster_count, written_at, write_source
FROM team_data_history
ORDER BY team_id, written_at DESC;
```
Created in `002_team_data_history.sql:79`. Exposes metadata only - no roster contents.

### `roster_snapshots_latest`
```sql
SELECT DISTINCT ON (team_id)
       team_id, team_name, roster, player_count, snapshot_at, trigger_event
FROM roster_snapshots
ORDER BY team_id, snapshot_at DESC;
```
Created in `roster_snapshots.sql:42`. **Exposes `roster` - actual roster contents.**

### THE HOLE THIS FOUND (fixed in migration 011)

Migration 006 locked `team_data_history` (RLS on, anon grants revoked). Verified at
the time: `anon -> permission denied`.

**But `team_data_history_latest` selected from it.** A view with
`security_invoker = false` (the Postgres default) runs with the **view owner's**
privileges - `postgres`. So `anon` read the base table straight through the view,
bypassing the lock entirely. Probed: **11 rows leaked.**

Fixed by setting `security_invoker = true` on both views, so they respect the
**caller's** RLS.

**`roster_snapshots_latest` was the sleeper.** Its base table is still RLS-OFF, so it
leaked nothing extra *today* - but it exposes `roster` (children's names), and the
instant WS-3 locks `roster_snapshots`, it would have become the identical bypass.
Fixed pre-emptively.

**Both views are orphans.** Verified across `frontend/`, `backend/`, `scripts/`,
tests, migrations and docs: **zero consumers.** The real readers query the base tables
directly (`teamData.js:192` via service_role; `frontend/src/supabase.js:110,126` via
anon).

---

## RLS POLICIES (21) - previously unenumerated

### !! FOUR HARDCODED TEST BACKDOORS IN PRODUCTION !!

```sql
"at_bats_anon_test"      ON at_bats              FOR ALL
"game_state_anon_test"   ON live_game_state      FOR ALL
"scorer_lock_anon_test"  ON game_scoring_sessions FOR ALL
"audit_log_anon_test"    ON scoring_audit_log    FOR ALL

  USING      (team_id = ANY (ARRAY['1774297491626', '9000000000001']))
  WITH CHECK (team_id = ANY (ARRAY['1774297491626', '9000000000001']))
```

**`1774297491626` is the Mud Hens - the real, live team.**

These grant `anon` **full read AND write** (`FOR ALL`) on the live game state, at-bats,
scorer lock, and scoring audit log for an actual team. Named `*_anon_test` - clearly
intended for testing - and **left in production**.

Anyone with the public anon key can rewrite the score, forge at-bats, steal the scorer
lock, or fabricate audit entries for the Mud Hens.

**Mitigating context (which makes it worse, not better):** the scoring tables ALSO
carry `allow_scorer_writes` with `USING (true) WITH CHECK (true)` - wide open to
everyone, for every team. So the `*_anon_test` policies are not even the widest door.
The scoring tables are effectively unprotected regardless.

**Not fixed in this session.** Removing them requires understanding whether the live
scoring flow depends on unauthenticated writes today - it does, via the anon key. This
is WS-3/WS-4 territory. **Filed separately.**

### The rest

| Table | Policy | Cmd | Roles | Expr |
|---|---|---|---|---|
| `access_requests` | `admin_manages_requests` | ALL | authenticated | `is_active_admin()` |
| `access_requests` | `public_can_request_access` | INSERT | public | `true` (correct - public form) |
| `at_bats` | `public_read_at_bats` | SELECT | public | `true` |
| `feature_flags` | `Anyone can read feature flags` | SELECT | anon, authenticated | `true` |
| `feedback` | `feedback: admin select` | SELECT | authenticated | `is_active_admin()` |
| `feedback` | `feedback: owner insert` | INSERT | authenticated | `coach_id = auth.uid()` |
| `game_scoring_sessions` | `allow_scorer_writes` | ALL | public | **`true`** |
| `game_scoring_sessions` | `public_read_scoring_sessions` | SELECT | public | `true` |
| `live_game_state` | `allow_scorer_writes` | ALL | public | **`true`** |
| `live_game_state` | `public_read_live_state` | SELECT | public | `true` |
| `profiles` | `user_owns_profile` | ALL | public | `id = auth.uid()` |
| `scoring_audit_log` | `allow_scorer_writes` | ALL | public | **`true`** |
| `scoring_audit_log` | `public_read_audit_log` | SELECT | public | `true` |
| `share_links` | `public insert` | INSERT | public | `true` |
| `share_links` | `public read` | SELECT | public | `true` (correct - viewer mode) |
| `team_memberships` | `admin_manages_memberships` | ALL | authenticated | `is_active_admin()` |
| `team_memberships` | `user_sees_own_membership` | SELECT | authenticated | `user_id = auth.uid() OR email = auth.email()` |

**`allow_scorer_writes` appears three times with `USING (true) WITH CHECK (true)`.**
That is not a policy; it is the absence of one.

---

## GRANTS - previously unenumerated

**Every table below grants `anon` AND `authenticated` the full set:**
`SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`

```
access_requests          at_bats                 feature_flags
feedback                 game_scoring_sessions   live_game_state
profiles                 roster_snapshots        roster_snapshots_latest
scoring_audit_log        share_links             team_data
team_memberships         teams
```

**Only two objects have grants revoked** (both by this week's migrations):
- `auth_events` - migration 005
- `team_data_history` + `team_data_history_latest` - migrations 006, 011

**`TRUNCATE` granted to `anon` on thirteen tables** is worth sitting with. RLS does not
restrict `TRUNCATE`. Where RLS is off (`team_data`, `teams`, `roster_snapshots`), the
public anon key can empty the table outright.

---

## SEQUENCES (2)

```
roster_snapshots_id_seq     -> roster_snapshots.id
team_data_history_id_seq    -> team_data_history.id
```

Both must be created **before** their tables when rebuilding, or the `nextval()`
defaults fail.

---

## What the baseline must enumerate from now on

The original missed views because it did not look for them. To be a real drift
detector, a schema snapshot must cover:

- [x] Tables + columns + defaults
- [x] Constraints (PK, FK, UNIQUE, CHECK)
- [x] Indexes
- [x] Triggers
- [x] Functions (**including `prosecdef` and `proconfig`** - an unpinned `search_path`
      on a SECURITY DEFINER function is an escalation vector; there are two)
- [x] RLS enabled/disabled
- [ ] **RLS policies themselves** (added here)
- [ ] **Views + `security_invoker`** (added here - this is what was missed)
- [ ] **Grants** (added here)
- [ ] **Sequences** (added here)
- [ ] Materialized views (none currently)
- [ ] Extensions

The drift-detection script (#351) must check **all** of these, not just tables.
