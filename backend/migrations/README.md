# Database Migrations

All migrations are run manually in the **Supabase dashboard → SQL Editor**.
They are append-only in intent — no migration in this tree drops a table or
deletes data — but **idempotency (safety to re-run) varies file by file.**
See the table below before re-running anything. Do not assume a migration is
safe to re-run just because an earlier one was.

For the full historical narrative — why files are numbered the way they are,
the two dangerous files in the old `backend/src/db/migrations/` tree, and the
five numbers that collide across both trees — see `backend/CLAUDE.md` →
**## Migration Notes**. That doc is the canonical source for cross-tree
history; this file tracks only what's in `backend/migrations/` itself.

---

## How to Run a Migration

1. Open [Supabase dashboard](https://supabase.com/dashboard) → your project
2. Navigate to **SQL Editor** (left sidebar)
3. Paste the contents of the migration file
4. **Check the "Idempotent?" column below first.** If it says "No — errors on
   re-run", running it a second time will fail with a real Postgres error
   (usually "constraint already exists"). That's expected and harmless if the
   migration was already applied — but confirm that before assuming the error
   means something else went wrong.
5. Click **Run**
6. Verify no unexpected errors in the output pane

---

## Migration Status

Status and idempotency below are sourced directly from each file's own header
comment, cross-checked against `backend/CLAUDE.md` → Migration Notes. Where a
file doesn't state idempotency explicitly, it was verified here by reading the
SQL for `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS` guards.

| File | Purpose | Idempotent? | DEV | PROD |
|---|---|---|---|---|
| `roster_snapshots.sql` | Roster safety net — last 10 snapshots/team | Yes (`IF NOT EXISTS` guards) | Applied | Applied (v1.3.3) |
| `002_team_data_history.sql` | Append-only audit log of every `team_data` write | Yes (`create table if not exists`) | Applied | Applied |
| `004_rls_fixes.sql` | RLS on `teams`/`team_data`/`roster_snapshots`; revokes TRUNCATE | Yes — all 12 `CREATE POLICY` statements guarded with `DROP POLICY IF EXISTS` (Story 123/#564 fixed the gap) | Applied | **Applied and confirmed live** (#428, definitively closed 2026-08-06) |
| `005_p0_lock_auth_events.sql` | P0: lock `auth_events` RLS/grants | Yes (stated in header) | — (prod hotfix) | Applied 2026-07-13 |
| `006_p0_lock_team_data_history.sql` | P0: lock `team_data_history` RLS/grants | Yes (stated in header) | — | Applied 2026-07-13 |
| `007_p1_fix_recursive_rls_policy.sql` | Fix infinite recursion in `team_memberships` RLS | Yes (stated in header) | — | Applied 2026-07-13 |
| `008_p1_add_team_memberships_teams_fk.sql` | Add missing FK, fixed admin Coaches tab | **No — `ADD CONSTRAINT` errors on re-run** (index is `IF NOT EXISTS`; the constraint add is not — header calls the re-run error "harmless," meaning it confirms the constraint is already there) | — | Applied 2026-07-13 |
| `009_p0_widen_access_requests_role_check.sql` | Widen `access_requests.requested_role` CHECK | Yes (`DROP CONSTRAINT IF EXISTS` guards the re-add) | — | Applied 2026-07-13 |
| `011_p1_fix_view_rls_bypass.sql` | Fix a VIEW bypassing the RLS lock on `team_data_history` | Yes (stated in header) | — | Applied 2026-07-13 |
| `012_p1_pin_security_definer_search_path.sql` | Pin `search_path` on `SECURITY DEFINER` fns; drop dead `activate_membership()` | Yes (`CREATE OR REPLACE` + `DROP IF EXISTS`) | — | Applied 2026-07-13 |
| `013_rls_test_grants_helper.sql` | Read-only grant-introspection RPC for the RLS test suite | Yes (`CREATE OR REPLACE FUNCTION`) | Applied 2026-07-14 | **Not applied** — apply as part of WS-3 verification |
| `014_handle_new_user_profile_trigger.sql` | Auto-provision a `profiles` row on new auth user | Yes (`CREATE OR REPLACE FUNCTION`) | Applied 2026-07-15 | **Not applied as this standalone file.** Functionally superseded: `016` installed the equivalent `handle_new_user` trigger prod was missing (2026-07-21). Don't apply `014` to prod separately — verify against `016`'s trigger first. |
| `015_roster_wipe_db_guard.sql` | DB-layer roster-wipe guard trigger on `team_data` | Yes (`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`) | Applied 2026-07-20 | Applied 2026-07-20 |
| `016_profile_name_from_metadata.sql` | Resolve profile names from auth metadata; backfill; installs `handle_new_user` trigger | Yes (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`) | Applied 2026-07-21 | Applied 2026-07-21 |
| `017_fix_prune_roster_snapshots_security_definer.sql` | Pin `SECURITY DEFINER` on `prune_roster_snapshots()` | Yes (`CREATE OR REPLACE FUNCTION`) | Applied 2026-08-01 | Applied 2026-08-01 |
| `018_auto_provision_team_membership_on_create.sql` | Auto-provision `team_memberships` row when a team is created | Yes (`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`) | Applied 2026-08-06 | Applied 2026-08-07 |
| `019_scoring_auth_uid_rls.sql` | `auth.uid()`-scoped RLS for the 4 live-scoring tables (Phase 4C, #355) | Yes (every `CREATE POLICY` guarded with `DROP POLICY IF EXISTS`) | **Section A only**, applied 2026-08-15 | **Section A only**, applied 2026-08-29 (verified via `pg_policies` before/after + clean security-advisor re-run). **Section B not applied anywhere** — gated on the `game-mode/*` frontend shim flip and a full prod game-day soak. See `docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md`. |
| `020_team_memberships_identity_required.sql` | CHECK requiring a real identity (`user_id` or `email`) on every `team_memberships` row | **No — `ADD CONSTRAINT` errors on re-run** (no guard; rollback SQL is in the file header) | Applied 2026-08-07 | Applied 2026-08-07 |
| `021_revoke_teams_delete.sql` | Revoke anon/authenticated `DELETE` on `teams` (#380) | Not stated; REVOKE is naturally idempotent (re-revoking is a no-op) | Applied 2026-08-08 | **Applied 2026-08-08, then reverted the same session. NOT currently live.** Do not re-apply until the compensating `DELETE /api/v1/teams/:teamId` route (#642/#646) is live on `main`, not just `develop` — re-applying without it removes team deletion entirely, for every role. |
| `022_add_team_season.sql` | Add `teams.season`, nullable + backfilled (phase 1 of 2) | Yes — safe to run any time per header (column starts optional) | Applied 2026-08-18 | Applied 2026-08-19 |
| `023_enforce_team_season_not_null.sql` | Enforce `teams.season NOT NULL` + CHECK (phase 2 of 2) | **Do not run against PROD** until all 3 preconditions in the file's own header are met (022 live, season-aware release live, zero-NULL query confirmed) | Applied 2026-08-18 | **Not applied — gated, see file header** |
| `024_add_opp_runners_to_live_game_state.sql` | Add `live_game_state.opp_runners` jsonb column, ahead of the feature that reads/writes it (Story 19/#105, P2/Phase 2+ backlog — schema only, no handler/UI shipped yet) | Yes (`ADD COLUMN IF NOT EXISTS`, `DEFAULT '[]'::jsonb` satisfies existing rows) | Not confirmed as of this table entry (added 2026-08-29, found missing from this table during a docs audit — status not independently re-verified) | Not confirmed as of this table entry, same caveat |
| `026_write_source_role_fallback.sql` | Fix `team_data_history.write_source` recording `'unknown'` on every row (#379) via a `SECURITY INVOKER` trigger that stashes `current_user` before the existing `SECURITY DEFINER` snapshot trigger reads it back | Yes (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`) | Applied 2026-08-28 | Applied 2026-08-28 (see `backend/CLAUDE.md` § Migration Notes for the full debugging trail) |
| `027_add_magic_link_requested_to_auth_events.sql` | Widen `auth_events.event_type` CHECK to allow `'magic_link_requested'` (#736) — every `POST /magic-link` audit-event insert had been silently rejected since v2.1.0 | Yes (`ALTER ... ADD CONSTRAINT` after a `DROP CONSTRAINT IF EXISTS`-guarded rebuild, per the file's own header) | Applied 2026-08-29 | Applied 2026-08-29 (RED→GREEN verified against real Postgres both times; see `backend/CLAUDE.md` § Migration Notes) |
| `028_add_legal_consents_table.sql` | New `legal_consents` audit table (Terms of Service / Privacy Policy consent), backing `POST /api/v1/auth/consent` (Terms of Service experience, PRs #907/#910/#913, `develop`-only, not yet promoted) | Yes (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) | Applied 2026-08-29 — verified live via a real insert + cleanup, security advisors re-run clean | Applied 2026-08-29 — same verification as DEV |
| `025_document_existing_feature_flags_table.sql` | Retroactively captures the `feature_flags` table + RLS policy + grant, already live in PROD since before this repo had migration discipline (#109, #351) | Yes — every statement is `IF NOT EXISTS` / `DROP...IF EXISTS` / `GRANT` | **Not applied — no rebuild needed** (table already exists on the current DEV project; only relevant on a from-scratch DEV rebuild) | Documentation-only — table already live, running this changes nothing |

---

## Recovery Workflow

If a roster is wiped:

1. Call the history endpoint to find a good snapshot:
   ```
   GET /api/teams/{teamId}/history?limit=10&full=true
   ```
   (requires localhost or `X-Admin-Key` header)

2. Identify the snapshot with the expected `roster_count` and `written_at`

3. Extract `snapshot.roster` from the response

4. Restore via the safe-write endpoint:
   ```
   POST /api/teams/{teamId}/data
   X-Admin-Key: <your ADMIN_KEY>
   { "roster": [...], "force": true, "writeSource": "manual" }
   ```

---

## Rules

- **Never** drop or truncate `team_data_history` or `roster_snapshots`
- **Never** write `roster: []` to a team that has existing players without `force: true`
- Migrations go in `backend/migrations/` (canonical, ops-level). `backend/src/db/migrations/` is historical — do not add to it, and do not rebuild from it without reading `backend/CLAUDE.md` → Migration Notes first (two of its files are actively dangerous to re-apply).
- Before re-running any migration in the table above, re-check its row here — "safe to re-run" is per-file, not a property of this directory.
