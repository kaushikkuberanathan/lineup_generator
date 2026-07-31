#!/usr/bin/env bash
# backend/scripts/apply-rls-bootstrap.sh — reconstruct the current, correct
# RLS/schema state against an empty Postgres database (#415).
#
# WHY THIS EXISTS
#   docs/db/schema.sql is the executable ground truth for TABLE SHAPE, but its
#   own "8. ROW LEVEL SECURITY" and "9. GRANTS" sections are a snapshot from
#   2026-07-13 — before the WS-3 auth-gate cutover (v2.6.0, 2026-07-20) — and
#   are known-stale (#411). Applying schema.sql alone would reconstruct a
#   database with RLS disabled on team_data/teams/roster_snapshots, which is
#   the exact #342 exposure the current prod database no longer has.
#
#   Instead of hand-editing schema.sql's stale section (risking a NEW mistake
#   in a file whose entire purpose is "stop trusting descriptions"), this
#   script applies schema.sql for table shape, then REPLAYS the real,
#   individually-reviewed migrations (004 through 016) on top, in the same
#   order they were designed to run. Each one is idempotent by its own
#   convention (DROP POLICY IF EXISTS / CREATE OR REPLACE / DROP IF EXISTS),
#   so replaying them against a freshly-created schema converges to the same
#   corrected state they produced in DEV and prod.
#
#   Migration 010 does not exist in this tree by design — see 011's own
#   header ("010 is taken by docs/db/future/010_pitcher_rest_eligibility.sql,
#   a preserved design, NOT APPLIED"). This script does not apply it either.
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
  "backend/migrations/005_p0_lock_auth_events.sql"
  "backend/migrations/006_p0_lock_team_data_history.sql"
  "backend/migrations/007_p1_fix_recursive_rls_policy.sql"
  "backend/migrations/008_p1_add_team_memberships_teams_fk.sql"
  "backend/migrations/009_p0_widen_access_requests_role_check.sql"
  "backend/migrations/011_p1_fix_view_rls_bypass.sql"
  "backend/migrations/012_p1_pin_security_definer_search_path.sql"
  "backend/migrations/013_rls_test_grants_helper.sql"
  "backend/migrations/014_handle_new_user_profile_trigger.sql"
  "backend/migrations/015_roster_wipe_db_guard.sql"
  "backend/migrations/016_profile_name_from_metadata.sql"
)

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
