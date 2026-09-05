-- #1137: team ids are canonical text values and may contain slugs.
alter table public.feature_flags
  alter column team_id type text using team_id::text;
