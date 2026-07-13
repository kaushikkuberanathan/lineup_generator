-- ############################################################################
--  DEV REBUILD - make DEV a true mirror of prod
--
--  TARGET:  DEV Supabase project (psqvzppphdedqkpmarwx) ONLY
--  DO NOT RUN AGAINST PROD (hzaajccyurlyeweekvma).
--
--  Run order:
--    1. THIS FILE (drops everything in DEV's public schema)
--    2. docs/db/schema.sql        (rebuilds prod's exact structure)
--    3. THE SEED BLOCK at the foot of this file (the minimum data DEV needs to work)
--
--  WHY
--    DEV was never a mirror of prod. It was a FORK - three independently hand-built
--    schemas (repo / prod / DEV) sharing table names:
--
--      team_memberships roles:  repo says 4   prod enforces 7   DEV had 6
--                               (DEV had platform_admin and 'scorer' - values that
--                                exist nowhere else)
--      DEV had:                 pitcher_tracking (prod does not); a pitch_type column
--                               on teams; NO status column on team_memberships
--      DEV was BEHIND prod on 5 of 8 tables.
--
--    A migration rehearsed against DEV proved nothing about prod. That is not a
--    theoretical risk - it is one layer up from how WS-1 broke the signup form
--    (built against the repo's constraint; prod's was different).
--
--  WHAT IS LOST (checked before writing this)
--    DEV holds a frozen April/May 2026 testbed. Nothing has touched it in two months.
--
--      scoring_audit_log      172 rows   (2026-04-22 -> 2026-05-15, test scoring)
--      feature_flags            4 rows   (see SEED - the important one is live_scoring)
--      team_memberships         3 rows   (KK's three emails, all admin)
--      teams / team_data        1 row    (Mud Hens 8U)
--      game_scoring_sessions    4 rows
--      live_game_state          4 rows
--      pitcher_tracking         0 rows   <- PRESERVED at docs/db/future/010_...
--      everything else          0 rows
--
--    None of it is load-bearing. The pitcher_tracking DESIGN is already in the repo.
--
--  !! THE TRAP THIS SCRIPT EXISTS TO AVOID
--     docs/db/schema.sql is SCHEMA ONLY. It seeds NO DATA.
--
--     `live_scoring` is the ONLY flag read from the DATABASE at runtime
--     (useFeatureFlag -> .eq('flag_name', ...), case-sensitive, team-scoped).
--     Every other flag is read from the BUNDLED JS (isFlagEnabled is synchronous -
--     it never calls Supabase).
--
--     useFeatureFlag DEFAULTS TO FALSE when a flag row is absent. So if DEV is
--     rebuilt from schema.sql alone, LIVE SCORING SILENTLY TURNS OFF IN DEV.
--     No error. It just does not work, and you spend an hour wondering why.
--
--     The SEED block below is not optional.
-- ############################################################################


-- ============================================================================
-- STEP 1: DROP EVERYTHING IN DEV'S PUBLIC SCHEMA
--
-- CASCADE takes the views, policies, triggers, constraints and sequences with the
-- tables. Functions are dropped explicitly.
-- ============================================================================

DROP VIEW IF EXISTS public.team_data_history_latest CASCADE;
DROP VIEW IF EXISTS public.roster_snapshots_latest  CASCADE;

-- DEV-only table. Its design is preserved at docs/db/future/010_pitcher_rest_eligibility.sql
DROP TABLE IF EXISTS public.pitcher_tracking CASCADE;

DROP TABLE IF EXISTS public.scoring_audit_log     CASCADE;
DROP TABLE IF EXISTS public.game_scoring_sessions CASCADE;
DROP TABLE IF EXISTS public.at_bats               CASCADE;
DROP TABLE IF EXISTS public.live_game_state       CASCADE;
DROP TABLE IF EXISTS public.feature_flags         CASCADE;
DROP TABLE IF EXISTS public.share_links           CASCADE;
DROP TABLE IF EXISTS public.feedback              CASCADE;
DROP TABLE IF EXISTS public.auth_events           CASCADE;
DROP TABLE IF EXISTS public.access_requests       CASCADE;
DROP TABLE IF EXISTS public.team_memberships      CASCADE;
DROP TABLE IF EXISTS public.profiles              CASCADE;
DROP TABLE IF EXISTS public.roster_snapshots      CASCADE;
DROP TABLE IF EXISTS public.team_data_history     CASCADE;
DROP TABLE IF EXISTS public.team_data             CASCADE;
DROP TABLE IF EXISTS public.teams                 CASCADE;

DROP SEQUENCE IF EXISTS public.roster_snapshots_id_seq  CASCADE;
DROP SEQUENCE IF EXISTS public.team_data_history_id_seq CASCADE;

DROP FUNCTION IF EXISTS public.restore_game_state(text, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.activate_membership(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_active_admin()          CASCADE;
DROP FUNCTION IF EXISTS public.snapshot_team_data()       CASCADE;
DROP FUNCTION IF EXISTS public.prune_team_data_history()  CASCADE;
DROP FUNCTION IF EXISTS public.prune_roster_snapshots()   CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()           CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at()        CASCADE;

-- Verify the schema is empty before running schema.sql:
--   SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--    WHERE n.nspname='public' AND c.relkind IN ('r','v','S');
--   -- expect 0


-- ============================================================================
-- STEP 2: RUN docs/db/schema.sql
--
-- Do it in the Supabase SQL editor. It is idempotent and wrapped in BEGIN/COMMIT.
-- It rebuilds prod's EXACT structure: 15 tables, 21 policies, 28 indexes,
-- 7 functions, 7 triggers, 2 views.
--
-- Then verify DEV == prod:
--   SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--    WHERE n.nspname='public' AND c.relkind='r';        -- expect 15
--   SELECT count(*) FROM pg_policies WHERE schemaname='public';  -- expect 21
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname='team_memberships_role_check';       -- expect SEVEN roles
-- ============================================================================


-- ============================================================================
-- STEP 3: SEED  (run AFTER schema.sql)
--
-- The minimum data DEV needs to function. Mirrors prod's shape.
-- ============================================================================

BEGIN;

-- ---- teams ------------------------------------------------------------------
-- Mud Hens, matching prod's id so team-scoped flags and share links line up.
INSERT INTO public.teams (id, name, age_group, year, sport, owner_id)
VALUES ('1774297491626', 'Mud Hens', '8U', 2026, 'baseball', '')
ON CONFLICT (id) DO NOTHING;

-- Demo team - prod has a live_scoring flag scoped to this id.
INSERT INTO public.teams (id, name, age_group, year, sport, owner_id)
VALUES ('9000000000001', 'Demo All-Stars', '8U', 2026, 'baseball', '')
ON CONFLICT (id) DO NOTHING;

-- ---- team_data --------------------------------------------------------------
-- Empty roster. The trg_snapshot_team_data trigger fires on this insert and writes
-- to team_data_history - which is a GOOD smoke test: if it errors, the
-- SECURITY DEFINER fix (migration 006) did not carry over.
INSERT INTO public.team_data (team_id) VALUES ('1774297491626')
ON CONFLICT (team_id) DO NOTHING;

-- ---- feature_flags ----------------------------------------------------------
-- !! THIS IS THE ONE THAT MATTERS.
-- !!
-- !! live_scoring is the ONLY flag read from the DATABASE at runtime
-- !! (useFeatureFlag, case-sensitive, team-scoped-overrides-global).
-- !! It DEFAULTS TO FALSE when absent. Without these rows, live scoring is
-- !! silently OFF in DEV, with no error.
-- !!
-- !! Mirrors prod exactly: prod has NO global live_scoring row - only these two
-- !! team-scoped rows. (Which means every OTHER team has live scoring off in prod.
-- !! That may be intentional or a gap; it is reproduced here so DEV matches.)
INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('live_scoring', true, 1774297491626,
        'Pitch-by-pitch scoring with runner tracking, real-time broadcast, and lineup-driven batter sequencing. RBAC-ready for Phase 2.')
ON CONFLICT (flag_name, team_id) DO NOTHING;

INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('live_scoring', true, 9000000000001,
        'Live scoring - Demo All-Stars WWE edition')
ON CONFLICT (flag_name, team_id) DO NOTHING;

-- Global flags. Both false in prod, matching the bundled JS defaults - so these are
-- redundant in practice. Seeded anyway so DEV mirrors prod exactly.
INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('MAINTENANCE_MODE', false, NULL,
        'Show maintenance screen to all users. Enable before deploys, disable after verifying prod.')
ON CONFLICT (flag_name, team_id) DO NOTHING;

INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('VIEWER_MODE', false, NULL,
        'Read-only swipeable inning cards for parents via share link.')
ON CONFLICT (flag_name, team_id) DO NOTHING;

INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('GAME_MODE', true, NULL, 'Full-screen live game overlay.')
ON CONFLICT (flag_name, team_id) DO NOTHING;

INSERT INTO public.feature_flags (flag_name, enabled, team_id, description)
VALUES ('ACCESSIBILITY_V1', false, NULL,
        'Font floor, touch targets, contrast uplift, aria labels.')
ON CONFLICT (flag_name, team_id) DO NOTHING;

-- NOT seeded, deliberately:
--   game_mode (lowercase, team-scoped) - a CONFIRMED DEAD ROW in prod.
--     fetchRuntimeFlags queries `.is('team_id', null)` only, so a team-scoped row is
--     never fetched; and useFeatureFlag (the only team-scoped reader) is never called
--     for game mode. Nothing reads it. Reproducing a dead row would be reproducing a
--     mistake. Flagged for deletion in prod too.
--   SCORING_SHEET_V2 - was DEV-only, and is INERT: isFlagEnabled() is synchronous and
--     reads the bundled JS + localStorage. It never touches the database.

-- ---- team_memberships -------------------------------------------------------
-- KK's three identities, all admin, matching prod. user_id NULL - they link on first
-- login (DEV has its own auth.users).
INSERT INTO public.team_memberships (team_id, role, status, email)
VALUES
  ('1774297491626', 'admin', 'active', 'kaushik.kuberanathan@gmail.com'),
  ('1774297491626', 'admin', 'active', 'kaushikkuberanathan@gmail.com'),
  ('1774297491626', 'admin', 'active', 'icoachyouthball@gmail.com')
ON CONFLICT DO NOTHING;

COMMIT;


-- ============================================================================
-- STEP 4: VERIFY DEV == PROD
-- ============================================================================
--
-- Structure:
--   SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--    WHERE n.nspname='public' AND c.relkind='r';                    -- 15
--   SELECT count(*) FROM pg_policies WHERE schemaname='public';     -- 21
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public';                                      -- 7
--
-- The role CHECK - the one that broke the signup form. DEV had SIX roles, including
-- platform_admin and 'scorer'. It must now show SEVEN, matching prod:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname='team_memberships_role_check';
--
-- Every SECURITY DEFINER function must be PINNED:
--   SELECT proname, prosecdef, proconfig FROM pg_proc p
--   JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND p.prosecdef;
--   -- all four must show search_path=public
--
-- THE TRIGGER SMOKE TEST - this is the one that matters. It proves the
-- SECURITY DEFINER fix (migration 006) carried over. If team_data_history stays at 0
-- after a team_data write, the trigger is being blocked by RLS and roster saves are
-- broken:
--   UPDATE public.team_data SET locked = locked WHERE team_id = '1774297491626';
--   SELECT count(*) FROM public.team_data_history;   -- must be >= 1
--
-- The flag that actually matters:
--   SELECT flag_name, enabled, team_id FROM public.feature_flags
--    WHERE flag_name = 'live_scoring';
--   -- expect two rows: team 1774297491626 and 9000000000001, both enabled
