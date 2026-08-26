-- Migration 024: add live_game_state.opp_runners (#105 — opponent runners on bases)
--
-- Additive-only, matches the Zero-Downtime Constraint in backend/CLAUDE.md —
-- a brand-new nullable-with-default column that the currently-deployed
-- frontend/backend know nothing about, so it is safe to run against PROD at
-- any time ahead of the feature release that reads/writes it.
--
-- Mirrors the existing `runners jsonb NOT NULL DEFAULT '[]'::jsonb` column
-- exactly (same shape: array of { runnerId, base }, base 1-3), but tracks the
-- OPPONENT team's baserunners during their batting half. Until now only outs
-- and runs were tracked for the opponent half — no runner-level visibility.
-- No backfill needed: DEFAULT '[]'::jsonb satisfies every existing row
-- immediately at ALTER TABLE time, same as how `runners` itself works.

ALTER TABLE public.live_game_state
  ADD COLUMN IF NOT EXISTS opp_runners jsonb NOT NULL DEFAULT '[]'::jsonb;
