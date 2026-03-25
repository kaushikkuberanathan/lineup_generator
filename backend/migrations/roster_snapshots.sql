-- Roster snapshot history
-- Stores the last 10 roster states per team automatically
-- Triggered on every roster write from the app

CREATE TABLE IF NOT EXISTS public.roster_snapshots (
  id            bigserial PRIMARY KEY,
  team_id       text NOT NULL,
  team_name     text,
  roster        jsonb NOT NULL,
  player_count  int GENERATED ALWAYS AS (jsonb_array_length(roster)) STORED,
  snapshot_at   timestamptz NOT NULL DEFAULT now(),
  trigger_event text NOT NULL DEFAULT 'manual'
    CHECK (trigger_event IN ('auto_save', 'manual_export', 'pre_migration', 'app_load'))
);

-- Index for fast lookup by team
CREATE INDEX IF NOT EXISTS roster_snapshots_team_id_idx
  ON public.roster_snapshots (team_id, snapshot_at DESC);

-- Auto-prune: keep only the 10 most recent snapshots per team
CREATE OR REPLACE FUNCTION prune_roster_snapshots()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.roster_snapshots
  WHERE team_id = NEW.team_id
    AND id NOT IN (
      SELECT id FROM public.roster_snapshots
      WHERE team_id = NEW.team_id
      ORDER BY snapshot_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prune_roster_snapshots ON public.roster_snapshots;
CREATE TRIGGER trg_prune_roster_snapshots
  AFTER INSERT ON public.roster_snapshots
  FOR EACH ROW EXECUTE FUNCTION prune_roster_snapshots();

-- Helper view: latest snapshot per team
CREATE OR REPLACE VIEW public.roster_snapshots_latest AS
SELECT DISTINCT ON (team_id)
  team_id, team_name, roster, player_count, snapshot_at, trigger_event
FROM public.roster_snapshots
ORDER BY team_id, snapshot_at DESC;
