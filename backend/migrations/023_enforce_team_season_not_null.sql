-- Migration 023: enforce teams.season NOT NULL + CHECK (phase 2 of 2)
--
-- STATUS: APPLIED TO DEV 2026-08-18 and PROD 2026-08-30. Before the PROD
-- apply, the live precheck returned 6 total teams, 0 NULL seasons, and 0
-- invalid seasons; the season-aware application had been live since v2.11.0.
--
-- The following PROD preconditions were all confirmed before the apply:
--   1. Migration 022 has been applied to PROD.
--   2. The season-aware release (this branch, once promoted through
--      develop -> main) has been deployed to PROD and has been live long
--      enough that every team created or edited since carries a real
--      season value.
--   3. A direct query against PROD confirms zero NULL rows:
--        SELECT count(*) FROM public.teams WHERE season IS NULL;
--      If that count is not 0, do NOT run this file — find and fix the
--      remaining NULL rows first (manually assign a season, the same way
--      022's backfill did), or this ALTER COLUMN ... SET NOT NULL will
--      fail outright against those rows.
--
-- Running this before the season-aware release is live in PROD would lock
-- out the OLD (currently deployed) code path: the old frontend's
-- dbSaveTeams()/admin.html never send a `season` field at all, so every
-- team write from unupgraded clients would start hard-failing the moment
-- this constraint goes live. That is exactly the zero-downtime violation
-- backend/CLAUDE.md's Zero-Downtime Constraint exists to prevent — this
-- migration must strictly follow the release that makes every write path
-- season-aware, never precede it.
--
-- Deliberately stricter than the existing age_group/sport columns (free
-- text, app-validated only) — those two have a much larger or open-ended
-- value set; season has exactly two valid values, so the DB enforces the
-- domain directly rather than relying solely on the
-- App.jsx/admin.html/TeamSearch.jsx selects and the /search route's
-- SAFE_SEARCH_PATTERN to keep it clean.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS before ADD CONSTRAINT, same pattern
-- as 004_rls_fixes.sql's DROP POLICY IF EXISTS guards (see backend/CLAUDE.md's
-- migration notes on that file). SET NOT NULL is naturally idempotent too.

ALTER TABLE public.teams ALTER COLUMN season SET NOT NULL;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_season_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_season_check CHECK (season IN ('Spring', 'Fall'));
