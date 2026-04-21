-- Opponent pitch tracking columns for live_game_state.
-- Idempotent — safe to re-run.
ALTER TABLE live_game_state
  ADD COLUMN IF NOT EXISTS opp_balls                    smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opp_strikes                  smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opp_current_batter_number    smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS opp_current_batter_pitches   smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opp_inning_pitches           smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opp_game_pitches             smallint NOT NULL DEFAULT 0;
