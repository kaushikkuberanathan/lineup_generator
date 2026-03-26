-- Migration 007: Add coach_pin column to team_data
-- Allows coaches to set a 4-digit PIN to protect finalized lineups from accidental changes

ALTER TABLE team_data
ADD COLUMN IF NOT EXISTS coach_pin TEXT DEFAULT '';
