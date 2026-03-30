-- Migration 006: batting_hand column on players table
-- Run in Supabase SQL Editor. Do NOT run against team_data.roster (JSONB) —
-- batting_hand within roster objects is handled by the JS migration layer
-- (normalizeBattingHand in playerUtils.js / migrateRoster migration 005 step).
--
-- This migration targets a future normalized `players` table.
-- If that table does not yet exist, this migration is a no-op / forward-looking.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS batting_hand CHAR(1) NOT NULL DEFAULT 'U'
  CHECK (batting_hand IN ('R', 'L', 'U'));

UPDATE players SET batting_hand = 'U' WHERE batting_hand IS NULL;
