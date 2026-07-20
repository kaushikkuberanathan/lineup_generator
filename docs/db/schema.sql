-- ############################################################################
--  DUGOUT LINEUP - PRODUCTION SCHEMA (GROUND TRUTH)
--
--  Captured:  2026-07-13, post-migration-012, from prod (hzaajccyurlyeweekvma)
--  Method:    reconstructed by querying the live database (pg_catalog /
--             information_schema). NOT a pg_dump - the Supabase CLI is not in use.
--             Every statement below was read from the running database, not from a
--             migration file or a doc.
--
--  !! FIXED 2026-07-13: this file DID NOT RUN. Two columns were rendered as
--  !! DEFAULT expressions when they are actually STORED GENERATED columns. Postgres
--  !! rejects a DEFAULT that references another column, so the whole transaction
--  !! aborted.
--  !!
--  !! The irony is the point: this file's entire thesis is "stop trusting
--  !! descriptions, query the database" - and it contained a wrong description,
--  !! because the introspection read pg_attrdef and never checked
--  !! pg_attribute.attgenerated.
--  !!
--  !! It was caught by RUNNING it (the DEV rebuild), not by reading it. Any future
--  !! change to this file must be executed against DEV before being trusted.
--
--  WHY THIS FILE EXISTS
--    Until now there was no source of truth to diff production against. The
--    consequences, all found in one week:
--
--      - RLS was DISABLED on five tables for months; the public anon key held
--        SELECT/INSERT/UPDATE/DELETE/TRUNCATE on every roster (#342)
--      - A recursive RLS policy made every authenticated read of team_memberships
--        throw. The admin panel's gate had NEVER worked.
--      - A missing FK broke the admin panel's Coaches tab, silently.
--      - 004_rls_fixes.sql claimed a trigger was SECURITY DEFINER. It was not.
--        Running it would have broken every roster save.
--      - The repo's role CHECK said four values; prod enforces SEVEN. Building on
--        the repo's version BROKE THE PUBLIC SIGNUP FORM (migration 009).
--      - A VIEW bypassed the RLS lock on team_data_history (migration 011).
--
--    Every one: acted on a DESCRIPTION instead of querying the DATABASE.
--
--  HOW TO USE THIS FILE
--    * It is the BASELINE for drift detection (#351). Re-run the introspection and
--      diff against this.
--    * It rebuilds an EMPTY database into a prod-shaped one (that is how DEV will be
--      rebuilt). It is idempotent - policies are dropped before being recreated - so
--      it is safe to re-run.
--    * It is NOT a migration. DO NOT RUN IT AGAINST PROD. The whole file is wrapped
--      in BEGIN/COMMIT, so any failure rolls everything back - but do not rely on
--      that as a safety net.
--
--  WHAT IS DELIBERATELY NOT HERE
--    * Data. Schema only.
--    * auth.* schema (Supabase-managed).
--    * The four *_anon_test backdoor policies and the three
--      `allow_scorer_writes USING (true)` policies ARE included below, because they
--      ARE in prod - but they are security defects, not intent. See #355.
--      A rebuilt DEV should carry them ONLY so DEV mirrors prod. Fix in both.
-- ############################################################################

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()


-- ============================================================================
-- 2. SEQUENCES  (must precede the tables whose defaults call nextval)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.roster_snapshots_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.team_data_history_id_seq;


-- ============================================================================
-- 3. TABLES  (teams first - other tables FK to it)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id          text                     NOT NULL,
  name        text                     NOT NULL,
  age_group   text                     DEFAULT ''::text,
  year        integer                  DEFAULT 2026,
  sport       text                     DEFAULT 'baseball'::text,
  owner_id    text                     DEFAULT ''::text,   -- NOTE: text, not uuid. Not FK'd to auth.users.
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.team_data (
  team_id              text                     NOT NULL,
  roster               jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  schedule             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  practices            jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  batting_order        jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  grid                 jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  innings              integer                  NOT NULL DEFAULT 6,
  locked               boolean                  NOT NULL DEFAULT false,
  updated_at           timestamp with time zone DEFAULT now(),
  snack_duty           jsonb                    DEFAULT '{}'::jsonb,
  coach_pin            text                     DEFAULT ''::text,
  attendance_overrides jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT team_data_pkey PRIMARY KEY (team_id),
  CONSTRAINT team_data_team_id_fkey FOREIGN KEY (team_id)
    REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.team_data_history (
  id           bigint                   NOT NULL DEFAULT nextval('team_data_history_id_seq'::regclass),
  team_id      text                     NOT NULL,
  snapshot     jsonb                    NOT NULL,
  -- STORED GENERATED, not a DEFAULT. Postgres cannot reference another column in a
  -- DEFAULT expression - schema.sql would not run. (Fixed 2026-07-13; caught by the
  -- DEV rebuild actually executing this file.)
  roster_count integer                  GENERATED ALWAYS AS (jsonb_array_length(COALESCE((snapshot -> 'roster'::text), '[]'::jsonb))) STORED,
  written_at   timestamp with time zone DEFAULT now(),
  write_source text,
  CONSTRAINT team_data_history_pkey PRIMARY KEY (id)
  -- NOTE: no FK on team_id -> teams(id). See PROD_SCHEMA_BASELINE.md missing-FK list.
);
ALTER SEQUENCE public.team_data_history_id_seq OWNED BY public.team_data_history.id;

CREATE TABLE IF NOT EXISTS public.roster_snapshots (
  id            bigint                   NOT NULL DEFAULT nextval('roster_snapshots_id_seq'::regclass),
  team_id       text                     NOT NULL,
  team_name     text,
  roster        jsonb                    NOT NULL,
  -- STORED GENERATED, not a DEFAULT. See the note on team_data_history.roster_count.
  player_count  integer                  GENERATED ALWAYS AS (jsonb_array_length(roster)) STORED,
  snapshot_at   timestamp with time zone NOT NULL DEFAULT now(),
  trigger_event text                     NOT NULL DEFAULT 'manual'::text,
  CONSTRAINT roster_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT roster_snapshots_trigger_event_check CHECK (
    trigger_event = ANY (ARRAY['auto_save'::text, 'manual_export'::text,
                               'pre_migration'::text, 'app_load'::text])
  )
  -- NOTE: no FK on team_id -> teams(id).
);
ALTER SEQUENCE public.roster_snapshots_id_seq OWNED BY public.roster_snapshots.id;

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid                     NOT NULL,
  first_name  text                     NOT NULL,
  last_name   text                     NOT NULL,
  phone_e164  text,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now(),
  email       text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_phone_e164_key UNIQUE (phone_e164),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_contact_required CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.team_memberships (
  id           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid,
  team_id      text                     NOT NULL,
  role         text                     NOT NULL DEFAULT 'coach'::text,
  status       text                     NOT NULL DEFAULT 'invited'::text,
  phone_e164   text,
  invited_at   timestamp with time zone NOT NULL DEFAULT now(),
  activated_at timestamp with time zone,
  email        text,
  CONSTRAINT team_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT team_memberships_team_id_fkey FOREIGN KEY (team_id)
    REFERENCES public.teams(id) ON DELETE CASCADE,          -- added 2026-07-13, migration 008
  CONSTRAINT team_memberships_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT team_memberships_contact_required CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL),
  -- !! SEVEN roles. The repo's 003_create_team_memberships.sql declares FOUR.
  -- !! Building on the repo's version is what broke the signup form (migration 009).
  CONSTRAINT team_memberships_role_check CHECK (
    role = ANY (ARRAY['admin'::text, 'viewer'::text, 'team_admin'::text,
                      'coordinator'::text, 'coach'::text, 'scorekeeper'::text,
                      'parent'::text])
  ),
  CONSTRAINT team_memberships_status_check CHECK (
    status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text])
  )
);

CREATE TABLE IF NOT EXISTS public.access_requests (
  id              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  first_name      text                     NOT NULL,
  last_name       text                     NOT NULL,
  phone_e164      text,
  status          text                     NOT NULL DEFAULT 'pending'::text,
  requested_at    timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at     timestamp with time zone,
  reviewed_by     uuid,
  notes           text,
  email           text,
  team_id         text,
  requested_role  text,
  platform        text,
  device_type     text,
  browser         text,
  browser_version text,
  os_version      text,
  access_mode     text,
  app_version     text,
  timezone        text,
  CONSTRAINT access_requests_pkey PRIMARY KEY (id),
  CONSTRAINT access_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES auth.users(id),
  CONSTRAINT access_requests_contact_required CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL),
  -- Widened 2026-07-13 (migration 009) to accept the canonical values WS-1 writes.
  -- Before that it rejected 'admin' and 'viewer' -> the signup form 500'd.
  CONSTRAINT access_requests_requested_role_check CHECK (
    requested_role IS NULL OR requested_role = ANY (
      ARRAY['admin'::text, 'coach'::text, 'scorekeeper'::text, 'viewer'::text,
            'team_admin'::text, 'coordinator'::text, 'parent'::text])
  ),
  CONSTRAINT access_requests_status_check CHECK (
    status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'ignored'::text])
  )
  -- NOTE: no FK on team_id -> teams(id). One row holds a NULL team_id.
);

CREATE TABLE IF NOT EXISTS public.auth_events (
  id              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid,
  team_id         text,
  role            text,
  event_type      text                     NOT NULL,
  auth_channel    text,
  platform        text,
  device_type     text,
  browser         text,
  browser_version text,
  os_version      text,
  access_mode     text,
  app_version     text,
  timezone        text,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_events_pkey PRIMARY KEY (id),
  CONSTRAINT auth_events_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT auth_events_access_mode_check CHECK (
    access_mode IS NULL OR access_mode = ANY (ARRAY['pwa'::text, 'browser'::text, 'unknown'::text])
  ),
  CONSTRAINT auth_events_auth_channel_check CHECK (
    auth_channel IS NULL OR auth_channel = ANY (ARRAY['email'::text, 'phone'::text, 'unknown'::text])
  ),
  CONSTRAINT auth_events_event_type_check CHECK (
    event_type = ANY (ARRAY['otp_requested'::text, 'otp_verified'::text, 'otp_failed'::text,
                            'session_resumed'::text, 'logout'::text, 'access_denied'::text,
                            'access_requested'::text, 'access_approved'::text,
                            'access_denied_by_admin'::text])
  )
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  coach_id     uuid,
  phone_e164   text,
  type         text                     NOT NULL,
  category     text,
  location     text,
  body         text                     NOT NULL,
  change_types jsonb,
  severity     text,
  app_version  text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_coach_id_fkey FOREIGN KEY (coach_id)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT feedback_type_check CHECK (type = ANY (ARRAY['feedback'::text, 'bug'::text]))
);

CREATE TABLE IF NOT EXISTS public.share_links (
  id         text                     NOT NULL,
  payload    jsonb                    NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT share_links_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  flag_name   text                     NOT NULL,
  enabled     boolean                  NOT NULL DEFAULT false,
  -- !! BIGINT. Every other team_id in the schema is TEXT, and team ids include slugs
  -- !! ('party-animals-8u'). Team-scoped flags CANNOT work for six of the seven teams.
  team_id     bigint,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  CONSTRAINT feature_flags_pkey PRIMARY KEY (id),
  CONSTRAINT uq_flag_team UNIQUE (flag_name, team_id)
);

CREATE TABLE IF NOT EXISTS public.at_bats (
  id                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  game_id           text                     NOT NULL,
  team_id           text                     NOT NULL,
  inning            integer                  NOT NULL,
  half_inning       text                     NOT NULL DEFAULT 'top'::text,
  batter_id         text                     NOT NULL,
  batter_name       text                     NOT NULL,
  batting_order_pos integer,
  pitches           jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  outcome           jsonb,
  runner_advances   jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  recorded_by_id    text,
  recorded_by_name  text,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT at_bats_pkey PRIMARY KEY (id)
  -- NOTE: no FK on team_id -> teams(id).
);

CREATE TABLE IF NOT EXISTS public.live_game_state (
  id                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  game_id                   text                     NOT NULL,
  team_id                   text                     NOT NULL,
  inning                    integer                  NOT NULL DEFAULT 1,
  half_inning               text                     NOT NULL DEFAULT 'top'::text,
  outs                      integer                  NOT NULL DEFAULT 0,
  balls                     integer                  NOT NULL DEFAULT 0,
  strikes                   integer                  NOT NULL DEFAULT 0,
  my_score                  integer                  NOT NULL DEFAULT 0,
  opponent_score            integer                  NOT NULL DEFAULT 0,
  runners                   jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  current_batter            jsonb,
  batting_order_index       integer                  NOT NULL DEFAULT 0,
  last_at_bat_id            uuid,
  updated_at                timestamp with time zone NOT NULL DEFAULT now(),
  runs_this_half            integer                  DEFAULT 0,
  opp_runs_this_half        integer                  NOT NULL DEFAULT 0,
  opp_balls                 smallint                 NOT NULL DEFAULT 0,
  opp_strikes               smallint                 NOT NULL DEFAULT 0,
  opp_current_batter_number smallint                 NOT NULL DEFAULT 1,
  opp_current_batter_pitches smallint                NOT NULL DEFAULT 0,
  opp_inning_pitches        smallint                 NOT NULL DEFAULT 0,
  opp_game_pitches          smallint                 NOT NULL DEFAULT 0,
  CONSTRAINT live_game_state_pkey PRIMARY KEY (id),
  CONSTRAINT live_game_state_game_id_team_id_key UNIQUE (game_id, team_id),
  CONSTRAINT live_game_state_balls_check       CHECK (balls   >= 0 AND balls   <= 4),
  CONSTRAINT live_game_state_strikes_check     CHECK (strikes >= 0 AND strikes <= 2),
  CONSTRAINT live_game_state_outs_check        CHECK (outs    >= 0 AND outs    <= 2),
  CONSTRAINT live_game_state_half_inning_check CHECK (half_inning = ANY (ARRAY['top'::text, 'bottom'::text]))
);

CREATE TABLE IF NOT EXISTS public.game_scoring_sessions (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  game_id        text                     NOT NULL,
  team_id        text                     NOT NULL,
  -- !! TEXT, not uuid, and NOT FK'd to auth.users. The scorer identity is a
  -- !! localStorage UUID. The audit trail is FORGEABLE. See WS-4.
  scorer_user_id text,
  scorer_name    text                     NOT NULL,
  locked_at      timestamp with time zone NOT NULL DEFAULT now(),
  last_heartbeat timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_scoring_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT game_scoring_sessions_game_id_team_id_key UNIQUE (game_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.scoring_audit_log (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  game_id       text                     NOT NULL,
  team_id       text                     NOT NULL,
  at_bat_id     uuid,
  action        text                     NOT NULL,
  -- !! TEXT, not uuid, not FK'd. Same forgeability problem. See WS-4.
  actor_user_id text,
  actor_name    text                     NOT NULL,
  payload       jsonb,
  recorded_at   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scoring_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT scoring_audit_log_at_bat_id_fkey FOREIGN KEY (at_bat_id)
    REFERENCES public.at_bats(id) ON DELETE SET NULL
);


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- access_requests
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_team_email_unique_idx
  ON public.access_requests (team_id, email) WHERE email IS NOT NULL AND team_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_team_phone_unique_idx
  ON public.access_requests (team_id, phone_e164) WHERE phone_e164 IS NOT NULL AND team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS access_requests_team_status_created_idx
  ON public.access_requests (team_id, status, requested_at DESC);
-- !! DUPLICATE of the line above. Same columns, same order. One is redundant.
CREATE INDEX IF NOT EXISTS access_requests_team_status_idx
  ON public.access_requests (team_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_status
  ON public.access_requests (status);

-- team_memberships
-- !! THIS is why the April access requests could not be approved. Two of the three
-- !! were for emails that ALREADY had an active membership on that team. It was a
-- !! duplicate-membership violation, NOT the role CHECK that WS-1 was built to fix.
CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_team_email_unique_idx
  ON public.team_memberships (team_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_team_phone_unique_idx
  ON public.team_memberships (team_id, phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_user  ON public.team_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_phone ON public.team_memberships (phone_e164);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id
  ON public.team_memberships (team_id);   -- added 2026-07-13, migration 008

-- teams / team_data / history / snapshots
CREATE INDEX IF NOT EXISTS idx_teams_owner        ON public.teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_team_data_updated  ON public.team_data (updated_at);
CREATE INDEX IF NOT EXISTS idx_tdh_team_id        ON public.team_data_history (team_id);
CREATE INDEX IF NOT EXISTS idx_tdh_written_at     ON public.team_data_history (written_at DESC);
CREATE INDEX IF NOT EXISTS roster_snapshots_team_id_idx
  ON public.roster_snapshots (team_id, snapshot_at DESC);

-- profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (email) WHERE email IS NOT NULL;

-- auth_events
CREATE INDEX IF NOT EXISTS auth_events_user_idx         ON public.auth_events (user_id);
CREATE INDEX IF NOT EXISTS auth_events_team_idx         ON public.auth_events (team_id);
CREATE INDEX IF NOT EXISTS auth_events_type_idx         ON public.auth_events (event_type);
CREATE INDEX IF NOT EXISTS auth_events_created_idx      ON public.auth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_team_created_idx ON public.auth_events (team_id, created_at DESC);

-- scoring
CREATE INDEX IF NOT EXISTS idx_at_bats_game
  ON public.at_bats (game_id, team_id, inning, half_inning);
CREATE INDEX IF NOT EXISTS idx_at_bats_batter  ON public.at_bats (batter_id, game_id);
CREATE INDEX IF NOT EXISTS idx_at_bats_created ON public.at_bats (game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_game_state_game
  ON public.live_game_state (game_id, team_id);
CREATE INDEX IF NOT EXISTS idx_scoring_sessions_game
  ON public.game_scoring_sessions (game_id, team_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_game
  ON public.scoring_audit_log (game_id, team_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.scoring_audit_log (actor_user_id, recorded_at DESC);


-- ============================================================================
-- 5. FUNCTIONS
--
--    ALL FOUR SECURITY DEFINER functions have a PINNED search_path. An unpinned
--    search_path on a DEFINER function is a privilege-escalation vector: a caller
--    can shadow an unqualified table name and have a postgres-privileged function
--    operate on THEIR table. Fixed 2026-07-13 in migrations 006, 007, 012.
--
--    activate_membership() was DROPPED (migration 012): dead, phone-era, and it
--    declared team_id UUID against a TEXT column.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

-- SECURITY DEFINER + pinned search_path (migration 007).
-- Breaks the infinite recursion that made every authenticated read of
-- team_memberships throw. The policies below call this instead of an inline
-- subquery against the table they protect.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO anon, authenticated;

-- SECURITY DEFINER (migration 006). MUST be DEFINER: coaches write team_data with
-- the ANON key, so an invoker-context trigger would execute AS ANON and be blocked
-- by the RLS lock on team_data_history -> every roster save would fail.
CREATE OR REPLACE FUNCTION public.snapshot_team_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.prune_team_data_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  delete from team_data_history
  where id not in (
    select id from (
      select id, row_number() over (partition by team_id order by written_at desc) as rn
      from team_data_history
    ) ranked
    where rn <= 20
  );
end;
$$;
-- NOTE: nothing calls this. No trigger fires it. team_data_history has grown
-- unbounded (2,811 rows).

CREATE OR REPLACE FUNCTION public.prune_roster_snapshots()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM roster_snapshots
  WHERE team_id = NEW.team_id
    AND id NOT IN (
      SELECT id FROM roster_snapshots
      WHERE team_id = NEW.team_id
      ORDER BY snapshot_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

-- SECURITY DEFINER + pinned (migration 012).
-- Called FROM THE CLIENT via supabase.rpc (RestoreScoreModal.jsx:57).
-- Full definition captured from prod - it had NO definition in the repo.
CREATE OR REPLACE FUNCTION public.restore_game_state(
  p_game_id text, p_team_id text, p_actor_id uuid, p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_ab     at_bats%ROWTYPE;
  my_runs     integer := 0;
  last_inning integer := 1;
  last_half   text    := 'top';
  last_index  integer := 0;
BEGIN
  SELECT * INTO last_ab FROM at_bats
   WHERE game_id = p_game_id AND team_id = p_team_id AND outcome IS NOT NULL
   ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    last_inning := last_ab.inning;
    last_half   := last_ab.half_inning;
    last_index  := COALESCE(last_ab.batting_order_pos, 0);
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN (outcome->>'baseReached')::int = 4 THEN 1 ELSE 0 END
    + (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(runner_advances, '[]')) ra
        WHERE (ra->>'result') = 'scored')
  ), 0) INTO my_runs
  FROM at_bats
  WHERE game_id = p_game_id AND team_id = p_team_id AND outcome IS NOT NULL;

  INSERT INTO live_game_state (
    game_id, team_id, inning, half_inning, outs, balls, strikes,
    my_score, opponent_score, runners, current_batter,
    batting_order_index, last_at_bat_id, updated_at
  ) VALUES (
    p_game_id, p_team_id, last_inning, last_half, 0, 0, 0,
    my_runs, 0, '[]', NULL, last_index, last_ab.id, now()
  )
  ON CONFLICT (game_id, team_id) DO UPDATE SET
    inning = EXCLUDED.inning, half_inning = EXCLUDED.half_inning,
    outs = 0, balls = 0, strikes = 0,
    my_score = EXCLUDED.my_score, runners = '[]', current_batter = NULL,
    batting_order_index = EXCLUDED.batting_order_index,
    last_at_bat_id = EXCLUDED.last_at_bat_id, updated_at = now();

  INSERT INTO scoring_audit_log (
    game_id, team_id, action, actor_user_id, actor_name, payload, recorded_at
  ) VALUES (
    p_game_id, p_team_id, 'state_restored', p_actor_id, p_actor_name,
    jsonb_build_object(
      'restored_to_inning', last_inning,
      'restored_my_score',  my_runs,
      'at_bats_replayed',   (SELECT COUNT(*) FROM at_bats
                              WHERE game_id = p_game_id AND team_id = p_team_id)
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true, 'restored_inning', last_inning,
    'restored_score', my_runs, 'message', 'Game state restored from scorebook'
  );
END;
$$;


-- handle_new_user (migration 014): auto-provision a profiles row on signup.
-- SECURITY DEFINER + pinned search_path. Applied to DEV 2026-07-15; NOT yet
-- prod (WS-3 cutover). Fixes /me 500 (missing profiles row -> PGRST116).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'given_name',  NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'family_name', NEW.raw_user_meta_data ->> 'last_name',  '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS team_data_updated_at ON public.team_data;
CREATE TRIGGER team_data_updated_at BEFORE UPDATE ON public.team_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_snapshot_team_data ON public.team_data;
CREATE TRIGGER trg_snapshot_team_data AFTER INSERT OR UPDATE ON public.team_data
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_team_data();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_prune_roster_snapshots ON public.roster_snapshots;
CREATE TRIGGER trg_prune_roster_snapshots AFTER INSERT ON public.roster_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prune_roster_snapshots();

DROP TRIGGER IF EXISTS at_bats_updated_at ON public.at_bats;
CREATE TRIGGER at_bats_updated_at BEFORE UPDATE ON public.at_bats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS live_game_state_updated_at ON public.live_game_state;
CREATE TRIGGER live_game_state_updated_at BEFORE UPDATE ON public.live_game_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- migration 014: fires on new auth user -> provisions profiles row.
-- NOTE: trigger is ON auth.users (Supabase-managed schema), not public.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 7. VIEWS
--
--    BOTH are security_invoker = true (migration 011). Without it, a view runs with
--    its OWNER's privileges and reads straight through the base table's RLS.
--    team_data_history_latest was doing exactly that - leaking 11 rows past the
--    lock migration 006 had just put on team_data_history.
--
--    Both views have ZERO consumers. Nothing in the app reads them.
-- ============================================================================
CREATE OR REPLACE VIEW public.team_data_history_latest
WITH (security_invoker = true) AS
  SELECT DISTINCT ON (team_id)
         team_id, roster_count, written_at, write_source
  FROM public.team_data_history
  ORDER BY team_id, written_at DESC;

CREATE OR REPLACE VIEW public.roster_snapshots_latest
WITH (security_invoker = true) AS
  SELECT DISTINCT ON (team_id)
         team_id, team_name, roster, player_count, snapshot_at, trigger_event
  FROM public.roster_snapshots
  ORDER BY team_id, snapshot_at DESC;


-- ============================================================================
-- 8. ROW LEVEL SECURITY
--
--    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--    !! THREE TABLES HAVE RLS *OFF*. THIS IS THE OPEN EXPOSURE (#342).
--    !!   team_data, teams, roster_snapshots
--    !!
--    !! The anon key ships in the frontend bundle. With RLS off and full grants,
--    !! anyone can read every child's name on every roster, overwrite any roster,
--    !! delete any team, or TRUNCATE the lot.
--    !!
--    !! It CANNOT be turned on until WS-3: the React app writes all three directly
--    !! with the anon key, so any auth.uid() policy breaks every coach's save.
--    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- ============================================================================

ALTER TABLE public.team_data        DISABLE ROW LEVEL SECURITY;  -- !! EXPOSED
ALTER TABLE public.teams            DISABLE ROW LEVEL SECURITY;  -- !! EXPOSED
ALTER TABLE public.roster_snapshots DISABLE ROW LEVEL SECURITY;  -- !! EXPOSED

ALTER TABLE public.auth_events           ENABLE ROW LEVEL SECURITY;  -- locked, 005
ALTER TABLE public.team_data_history     ENABLE ROW LEVEL SECURITY;  -- locked, 006
ALTER TABLE public.team_memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.at_bats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_state       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_audit_log     ENABLE ROW LEVEL SECURITY;


-- Idempotency guards: this file is written to rebuild an EMPTY database, but the
-- policy statements below would throw "already exists" on a second run and (because
-- of the BEGIN/COMMIT wrapper) roll the whole transaction back. These DROPs make the
-- file safely re-runnable.
DROP POLICY IF EXISTS "user_sees_own_membership"      ON public.team_memberships;
DROP POLICY IF EXISTS "admin_manages_memberships"     ON public.team_memberships;
DROP POLICY IF EXISTS "public_can_request_access"     ON public.access_requests;
DROP POLICY IF EXISTS "admin_manages_requests"        ON public.access_requests;
DROP POLICY IF EXISTS "user_owns_profile"             ON public.profiles;
DROP POLICY IF EXISTS "feedback: owner insert"        ON public.feedback;
DROP POLICY IF EXISTS "feedback: admin select"        ON public.feedback;
DROP POLICY IF EXISTS "public read"                   ON public.share_links;
DROP POLICY IF EXISTS "public insert"                 ON public.share_links;
DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "public_read_at_bats"           ON public.at_bats;
DROP POLICY IF EXISTS "at_bats_anon_test"             ON public.at_bats;
DROP POLICY IF EXISTS "public_read_live_state"        ON public.live_game_state;
DROP POLICY IF EXISTS "allow_scorer_writes"           ON public.live_game_state;
DROP POLICY IF EXISTS "game_state_anon_test"          ON public.live_game_state;
DROP POLICY IF EXISTS "public_read_scoring_sessions"  ON public.game_scoring_sessions;
DROP POLICY IF EXISTS "allow_scorer_writes"           ON public.game_scoring_sessions;
DROP POLICY IF EXISTS "scorer_lock_anon_test"         ON public.game_scoring_sessions;
DROP POLICY IF EXISTS "public_read_audit_log"         ON public.scoring_audit_log;
DROP POLICY IF EXISTS "allow_scorer_writes"           ON public.scoring_audit_log;
DROP POLICY IF EXISTS "audit_log_anon_test"           ON public.scoring_audit_log;

-- ---- team_memberships -------------------------------------------------------
CREATE POLICY "user_sees_own_membership" ON public.team_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "admin_manages_memberships" ON public.team_memberships
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ---- access_requests --------------------------------------------------------
-- Correct: the public request form must work with no login.
CREATE POLICY "public_can_request_access" ON public.access_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_manages_requests" ON public.access_requests
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ---- profiles ---------------------------------------------------------------
CREATE POLICY "user_owns_profile" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- ---- feedback ---------------------------------------------------------------
CREATE POLICY "feedback: owner insert" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());

CREATE POLICY "feedback: admin select" ON public.feedback
  FOR SELECT TO authenticated USING (public.is_active_admin());

-- ---- share_links ------------------------------------------------------------
-- Correct and NON-NEGOTIABLE: share links must render with no login.
CREATE POLICY "public read"   ON public.share_links FOR SELECT USING (true);
CREATE POLICY "public insert" ON public.share_links FOR INSERT WITH CHECK (true);

-- ---- feature_flags ----------------------------------------------------------
CREATE POLICY "Anyone can read feature flags" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);

-- ---- SCORING TABLES ---------------------------------------------------------
--
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- !! EVERYTHING BELOW IS A SECURITY DEFECT (#355). It is reproduced because it
-- !! IS what prod contains - not because it is correct.
-- !!
-- !! allow_scorer_writes: USING (true) WITH CHECK (true). That is not a policy;
-- !! it is the absence of one. Anyone can write anything.
-- !!
-- !! *_anon_test: FOUR hardcoded backdoors on REAL TEAM IDS. 1774297491626 is the
-- !! MUD HENS. anon can rewrite the score, forge at-bats, steal the scorer lock,
-- !! and fabricate audit entries.
-- !!
-- !! Cannot be removed until WS-3/WS-4: the app writes these tables directly with
-- !! the anon key today.
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

CREATE POLICY "public_read_at_bats" ON public.at_bats FOR SELECT USING (true);
CREATE POLICY "at_bats_anon_test"   ON public.at_bats FOR ALL
  USING      (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]))
  WITH CHECK (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]));

CREATE POLICY "public_read_live_state" ON public.live_game_state FOR SELECT USING (true);
CREATE POLICY "allow_scorer_writes"    ON public.live_game_state FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "game_state_anon_test"   ON public.live_game_state FOR ALL
  USING      (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]))
  WITH CHECK (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]));

CREATE POLICY "public_read_scoring_sessions" ON public.game_scoring_sessions FOR SELECT USING (true);
CREATE POLICY "allow_scorer_writes"          ON public.game_scoring_sessions FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "scorer_lock_anon_test"        ON public.game_scoring_sessions FOR ALL
  USING      (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]))
  WITH CHECK (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]));

CREATE POLICY "public_read_audit_log" ON public.scoring_audit_log FOR SELECT USING (true);
CREATE POLICY "allow_scorer_writes"   ON public.scoring_audit_log FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "audit_log_anon_test"   ON public.scoring_audit_log FOR ALL
  USING      (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]))
  WITH CHECK (team_id = ANY (ARRAY['1774297491626'::text, '9000000000001'::text]));

-- auth_events and team_data_history have RLS ENABLED and NO POLICIES.
-- That is deliberate: deny-all to anon/authenticated. service_role bypasses RLS, so
-- the backend still reads them. Do NOT add policies here.


-- ============================================================================
-- 9. GRANTS
--
--    Supabase grants anon + authenticated the full set on public tables by default.
--    Only auth_events and team_data_history have been revoked (migrations 005, 006).
--
--    !! TRUNCATE is granted to anon on every un-revoked table. RLS does not restrict
--    !! TRUNCATE. Where RLS is off (team_data, teams, roster_snapshots), the public
--    !! anon key can empty the table outright.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.teams, public.team_data, public.roster_snapshots,
     public.roster_snapshots_latest, public.team_memberships,
     public.access_requests, public.profiles, public.feedback,
     public.share_links, public.feature_flags, public.at_bats,
     public.live_game_state, public.game_scoring_sessions,
     public.scoring_audit_log
  TO anon, authenticated;

-- Locked: no grants to anon/authenticated. service_role only.
REVOKE ALL ON public.auth_events              FROM anon, authenticated;
REVOKE ALL ON public.team_data_history        FROM anon, authenticated;
REVOKE ALL ON public.team_data_history_latest FROM anon, authenticated;

COMMIT;


-- ############################################################################
--  KNOWN DEFECTS REPRODUCED ABOVE (because they are in prod)
--
--   1. RLS OFF on team_data, teams, roster_snapshots            #342  <- THE BIG ONE
--   2. Four *_anon_test backdoors on real team IDs               #355
--   3. allow_scorer_writes USING (true) x3                       #355
--   4. TRUNCATE granted to anon on 14 tables
--   5. team_memberships CHECK allows 7 roles (repo says 4)
--   6. access_requests CHECK allows 7 (widened to unbreak signup) migration 009
--   7. feature_flags.team_id is BIGINT; team ids are slugs      -> flags broken for 6 teams
--   8. teams.owner_id is TEXT default '', not FK'd to auth.users
--   9. scorer_user_id / actor_user_id are TEXT, not FK'd        -> audit trail forgeable, WS-4
--  10. Duplicate index on access_requests (team_id,status,requested_at DESC)
--  11. prune_team_data_history() exists but NOTHING calls it    -> 2,811 rows unbounded
--  12. No FK on team_id for: access_requests, roster_snapshots, team_data_history,
--      at_bats, live_game_state, game_scoring_sessions, scoring_audit_log
--
--  A rebuilt DEV should carry these so DEV MIRRORS PROD. Fix them in both, together.
-- ############################################################################
