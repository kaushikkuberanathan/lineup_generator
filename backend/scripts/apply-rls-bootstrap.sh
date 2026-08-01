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
#   included here so the ephemeral CI stack validates it before it ships).
#
#   Migration 010 does not exist in this tree by design — see 011's own
#   header ("010 is taken by docs/db/future/010_pitcher_rest_eligibility.sql,
#   a preserved design, NOT APPLIED"). Moot here since 011 isn't replayed
#   either (same 2026-07-13 reasoning as 005-009/012 above), but noted for
#   anyone auditing the numbering gap.
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
  # Deliberately NOT under backend/migrations/ despite running in this same
  # sequence — that directory is the real numbered-migration tree (see
  # backend/CLAUDE.md's #411 numeric-collision warnings on exactly this
  # class of confusion). This line + the file it points at are reverted
  # together before this throwaway branch closes; never merged.
  "backend/scripts/TEMP_mutation_test_weaken_teams_delete.sql"
)
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
