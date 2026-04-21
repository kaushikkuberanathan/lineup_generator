-- Migration: Add opp_runs_this_half to live_game_state
-- Issue: v2.2.45 code referenced column that didn't exist in either
-- dev or prod database. Scoring writes were failing with PGRST204 /
-- 400 on every pitch for anyone who tried to use scoring.
--
-- Applied manually via Supabase SQL Editor on 2026-04-21:
--   DEV:  psqvzppphdedqkpmarwx
--   PROD: hzaajccyurlyeweekvma
--
-- Both databases verified to contain the column after application
-- (information_schema.columns query returned the column name).
-- Scoring verified working end-to-end in dev — all writes 200/201.
--
-- This file is committed for schema history tracking. Future schema
-- changes MUST ship as migration files in this directory before or
-- alongside the code that depends on them.

ALTER TABLE live_game_state
ADD COLUMN IF NOT EXISTS opp_runs_this_half INTEGER NOT NULL DEFAULT 0;
