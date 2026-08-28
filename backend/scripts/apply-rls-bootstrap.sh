#!/usr/bin/env bash
# backend/scripts/apply-rls-bootstrap.sh — reconstruct the current, correct
# RLS/schema state against an empty Postgres database (#415).
#
# WHY THIS EXISTS
#   docs/db/schema.sql is the executable ground truth for TABLE SHAPE, but its
#   own "8. ROW LEVEL SECURITY" and "9. GRANTS" sections are a snapshot from
#   2026-07-13 — before the WS-3 auth-gate cutover (v2.6.0, 2026-07-20) — and
#   are known-stale for teams/team_data/roster_snapshots (#411). Applying
#   schema.sql alone would reconstruct a database with RLS disabled on those
#   three tables, which is the exact #342 exposure the current prod database
#   no longer has.
#
#   Instead of hand-editing schema.sql's stale section (risking a NEW mistake
#   in a file whose entire purpose is "stop trusting descriptions"), this
#   script applies schema.sql for table shape, then REPLAYS only the
#   migrations schema.sql's own 2026-07-13 capture does NOT already contain.
#
#   NOT replayed, deliberately: 005, 006, 007, 008, 009, 011, 012. Every one
#   of them is headed "APPLIED TO PRODUCTION: 2026-07-13" — the SAME DAY
#   schema.sql was captured — and schema.sql's own DDL already reflects their
#   end state (confirmed: its team_memberships policy already calls
#   is_active_admin(), which is 007's fix; its role CHECK already allows the
#   seven values 009 widened to). Replaying them anyway is not just redundant,
#   it actively fails: 008's ADD CONSTRAINT has no IF NOT EXISTS guard (by its
#   own header's admission — "will error on re-run if the constraint already
#   exists") and 008's own constraint is already present in schema.sql's
#   table DDL, so a second ADD CONSTRAINT throws "already exists". Confirmed
#   by running this script for real in CI (#415) — the first attempt replayed
#   005-012 and failed on exactly this.
#
#   Replayed, because they postdate the 2026-07-13 capture and are NOT yet in
#   schema.sql: 004 (WS-3, applied ~2026-07-19/20), 013 (DEV 2026-07-14),
#   014 (DEV 2026-07-15), 015 (DEV+prod 2026-07-20), 016 (2026-07-21), 017
#   (#477, authored 2026-08-01 — not yet applied to DEV/prod as of writing;
#   included here so the ephemeral CI stack validates it before it ships), 018
#   (#561, applied to DEV 2026-08-06 and PROD 2026-08-07).
#
#   Migration 010 does not exist in this tree by design — see 011's own
#   header ("010 is taken by docs/db/future/010_pitcher_rest_eligibility.sql,
#   a preserved design, NOT APPLIED"). Moot here since 011 isn't replayed
#   either (same 2026-07-13 reasoning as 005-009/012 above), but noted for
#   anyone auditing the numbering gap.
#
#   CORRECTED 2026-08-05: "004 is NOT yet in schema.sql" above is now only
#   partially true. Doc Audit Spike Story 1 (#549) re-verified schema.sql's
#   RLS section against LIVE PROD and updated the teams/team_data/
#   roster_snapshots policies (004's own scope) to their current, real state
#   — schema.sql's RLS section is no longer uniformly a 2026-07-13 snapshot;
#   those three tables' policies now reflect a 2026-08-04 re-verification.
#   This broke the ephemeral CI run (#560/rls-004-idempotency): schema.sql
#   and 004 both created the same 9 policy names, and 004's own CREATE
#   POLICY statements had no DROP POLICY IF EXISTS guard for themselves
#   (only for older catch-all policy names from initial setup), so the
#   second CREATE threw "already exists". Fixed in 004 itself — every
#   CREATE POLICY there now has its own matching DROP POLICY IF EXISTS
#   immediately before it, so replaying 004 is safe whether or not
#   schema.sql already contains its policies. This makes 004 (and this
#   script's unconditional replay of it) tolerant of exactly this class of
#   drift, so a future schema.sql re-capture of these same tables — or any
#   other migration file gaining the same partial overlap — won't
#   reproduce this failure, PROVIDED that file's own CREATE POLICY
#   statements are similarly self-guarded. Not yet fully general: files
#   03/13-017 haven't been audited for the same guard-completeness this
#   fix gave 004 specifically — that's a reasonable follow-up, not required
#   for this fix to be correct.
#
# USAGE
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
#     backend/scripts/apply-rls-bootstrap.sh
#
# Requires: psql, network access to $DATABASE_URL. Intended for the local
# ephemeral `supabase start` stack (CI job `rls` in .github/workflows/ci.yml)
# — NEVER point this at prod or a project holding real coach/roster data.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FILES=(
  "docs/db/schema.sql"
  "backend/migrations/004_rls_fixes.sql"
  "backend/migrations/013_rls_test_grants_helper.sql"
  "backend/migrations/014_handle_new_user_profile_trigger.sql"
  "backend/migrations/015_roster_wipe_db_guard.sql"
  "backend/migrations/016_profile_name_from_metadata.sql"
  "backend/migrations/017_fix_prune_roster_snapshots_security_definer.sql"
  "backend/migrations/018_auto_provision_team_membership_on_create.sql"
  "backend/migrations/020_team_memberships_identity_required.sql"
  "backend/migrations/021_revoke_teams_delete.sql"
  "backend/migrations/026_write_source_role_fallback.sql"
)
# 018 (#561, applied to DEV 2026-08-06 and PROD 2026-08-07 — included here
# so the ephemeral CI stack validates it too) — its own regression suite is
# backend/src/__tests__/rls/teamMembershipAutoProvision.test.js.
# 020 (#375, applied to DEV+PROD 2026-08-07) has no dedicated RLS-suite test
# but is included for consistency with every other applied migration here.
# 021 (#380, applied to DEV 2026-08-08 — see its own header for prod status,
# deliberately NOT yet re-applied to prod) MUST be here: S4b and T7-control
# in policies.test.js assert teams.DELETE is revoked for anon/authenticated,
# which is false until 021 runs. Omitting it here is exactly what caused the
# ephemeral CI job to fail red on PR #647's first push — schema.sql's own
# 2026-07-13 capture predates 021 by a month, so there is no fallback source
# for this state the way there is for 005-012.
# 026 (#379, applied to DEV 2026-08-28 — included here so the ephemeral CI
# stack validates it too, same reasoning as 018) MUST be here: WSF1/WSF2 in
# writeSourceRoleFallback.test.js assert team_data_history.write_source
# falls back to the calling Postgres role (service_role/authenticated)
# instead of 'unknown' — schema.sql's snapshot_team_data() only has 006's
# SECURITY DEFINER fix baked in, not 026's role-fallback trigger, so without
# this the ephemeral stack reproduces the exact prod bug the new test guards.
#
# 019 is deliberately NOT here — Phase 4C scoring RLS, drafted/unapplied, no
# current test depends on it.
# 005, 006, 007, 008, 009, 011, 012 are deliberately NOT here — see WHY THIS
# EXISTS above. schema.sql's 2026-07-13 capture already contains their effects.

for f in "${FILES[@]}"; do
  path="$REPO_ROOT/$f"
  if [ ! -f "$path" ]; then
    echo "FATAL: expected file not found: $f" >&2
    exit 1
  fi
  echo "── applying $f ──"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$path"
done

echo "── RLS bootstrap applied cleanly: $(printf '%s\n' "${FILES[@]}" | wc -l) files ──"
