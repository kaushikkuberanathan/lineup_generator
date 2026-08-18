-- Migration 022: add teams.season
--
-- STATUS: APPLIED TO DEV (psqvzppphdedqkpmarwx) 2026-08-18 — verified via
-- direct query (column NOT NULL, CHECK constraint live, all 7 existing rows
-- backfilled to 'Spring') and end-to-end via the local backend running
-- SUPABASE_TARGET=dev against the real search route. NOT YET APPLIED to
-- PROD. Part of the feature/team-season-tracking branch — not merged to
-- develop or main.
--
-- Adds a season column holding ONLY 'Spring' or 'Fall', enforced by a CHECK
-- constraint and NOT NULL — deliberately stricter than the existing
-- age_group/sport columns (free text, app-validated only). Those two have a
-- much larger or open-ended value set; season has exactly two valid values,
-- so the DB enforces the domain directly rather than relying solely on the
-- App.jsx/admin.html/TeamSearch.jsx selects and the /search route's
-- SAFE_SEARCH_PATTERN to keep it clean.
--
-- Paired with the EXISTING teams.year integer column rather than duplicating
-- the year into this column — display sites combine them at render time
-- (e.g. "Spring 26" from season='Spring' + year=2026).
--
-- Order matters: add the column nullable first, backfill every existing row,
-- THEN add NOT NULL + the CHECK constraint. Adding NOT NULL/CHECK before the
-- backfill would fail immediately against any existing row. Idempotent:
-- DROP CONSTRAINT IF EXISTS before ADD CONSTRAINT, same pattern as
-- 004_rls_fixes.sql's DROP POLICY IF EXISTS guards (see backend/CLAUDE.md's
-- migration notes on that file).

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS season text;

-- Backfill: every team that existed before this migration ran was created
-- during the Spring season of its existing `year` value.
UPDATE public.teams SET season = 'Spring' WHERE season IS NULL;

ALTER TABLE public.teams ALTER COLUMN season SET NOT NULL;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_season_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_season_check CHECK (season IN ('Spring', 'Fall'));
