-- Migration 002: team_data_history
-- Purpose: append-only snapshot of every team_data write for post-incident recovery
-- Run in: Supabase dashboard → SQL Editor
-- IMPORTANT: This is append-only. Never DROP or TRUNCATE this table.
--
-- Schema notes vs. original spec:
--   - team_id is TEXT (not bigint) — team IDs are non-UUID numerics (e.g. 1774297491626)
--   - Trigger is on `team_data`, not `teams` — team data writes go to team_data
--   - Snapshot is built via jsonb_build_object() from actual team_data columns
--   - NEW.team_id (not NEW.id) is the join key

-- ── History table ─────────────────────────────────────────────────────────────

create table if not exists team_data_history (
  id            bigserial primary key,
  team_id       text not null,
  snapshot      jsonb not null,
  roster_count  int generated always as
                  (jsonb_array_length(coalesce(snapshot->'roster', '[]'::jsonb))) stored,
  written_at    timestamptz default now(),
  write_source  text  -- 'app', 'migration', 'manual', 'seed', 'unknown'
);

-- Index for fast per-team lookup
create index if not exists idx_tdh_team_id on team_data_history(team_id);
create index if not exists idx_tdh_written_at on team_data_history(written_at desc);

-- ── Snapshot trigger ──────────────────────────────────────────────────────────
-- Fires AFTER every INSERT or UPDATE on team_data.
-- Constructs a JSONB snapshot from all columns so the history row is self-contained.

create or replace function snapshot_team_data()
returns trigger language plpgsql as $$
begin
  insert into team_data_history (team_id, snapshot, write_source)
  values (
    NEW.team_id,
    jsonb_build_object(
      'roster',        coalesce(NEW.roster,        '[]'::jsonb),
      'schedule',      coalesce(NEW.schedule,      '[]'::jsonb),
      'practices',     coalesce(NEW.practices,     '[]'::jsonb),
      'batting_order', coalesce(NEW.batting_order, '[]'::jsonb),
      'grid',          coalesce(NEW.grid,          '{}'::jsonb),
      'innings',       NEW.innings,
      'locked',        NEW.locked
    ),
    coalesce(current_setting('app.write_source', true), 'unknown')
  );
  return NEW;
end;
$$;

drop trigger if exists trg_snapshot_team_data on team_data;
create trigger trg_snapshot_team_data
  after insert or update on team_data
  for each row execute function snapshot_team_data();

-- ── Auto-prune function ───────────────────────────────────────────────────────
-- Keep the last 20 snapshots per team. Run weekly via pg_cron or call manually:
--   select prune_team_data_history();

create or replace function prune_team_data_history()
returns void language plpgsql as $$
begin
  delete from team_data_history
  where id not in (
    select id
    from (
      select id,
             row_number() over (partition by team_id order by written_at desc) as rn
      from team_data_history
    ) ranked
    where rn <= 20
  );
end;
$$;

-- ── Helpful view: latest snapshot per team ────────────────────────────────────
create or replace view team_data_history_latest as
select distinct on (team_id)
  team_id,
  roster_count,
  written_at,
  write_source
from team_data_history
order by team_id, written_at desc;
