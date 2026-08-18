-- Migration 022: add teams.season (phase 1 of 2 — nullable + backfill)
--
-- STATUS: APPLIED TO DEV (psqvzppphdedqkpmarwx) 2026-08-18, together with
-- 023 in a single combined apply — DEV is low-stakes (test data only), so
-- both phases were run back to back the same session, verified via direct
-- query. NOT YET APPLIED to PROD. Part of the feature/team-season-tracking
-- branch.
--
-- PROD rollout is deliberately two-phase, split across 022 (this file) and
-- 023_enforce_team_season_not_null.sql, per the zero-downtime constraint in
-- backend/CLAUDE.md — PROD is a live app with real coaches on it:
--   1. This file: add season nullable, backfill existing rows. Safe to run
--      any time — the column starts optional, so the currently-deployed
--      backend/frontend (which know nothing about it) are unaffected.
--   2. Deploy the season-aware release (this branch, once promoted).
--   3. Only after that release has been live and a direct query confirms
--      zero NULL season rows remain, run 023 to add NOT NULL + the CHECK
--      constraint. Do NOT run 023 against PROD until that verification
--      step has actually happened.
--
-- Adds a season column intended to hold ONLY 'Spring' or 'Fall' — see 023's
-- header for why the CHECK constraint is deferred to its own migration
-- rather than added here. Paired with the EXISTING teams.year integer
-- column rather than duplicating the year into this column — display sites
-- combine them at render time (e.g. "Spring 26" from season='Spring' +
-- year=2026).

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS season text;

-- Backfill: every team that existed before this migration ran was created
-- during the Spring season of its existing `year` value.
UPDATE public.teams SET season = 'Spring' WHERE season IS NULL;
