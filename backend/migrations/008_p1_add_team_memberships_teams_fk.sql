-- Migration 008: P1 FIX - missing FK broke the admin panel's Coaches tab
--
-- APPLIED TO PRODUCTION: 2026-07-13 (Supabase ledger 20260713155017)
-- Repo record of a migration applied directly to prod.
--
-- Idempotent: guarded by IF NOT EXISTS on the index; the ADD CONSTRAINT will error
-- on re-run if the constraint already exists (harmless - it means it is applied).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE BUG
-- ─────────────────────────────────────────────────────────────────────────────
-- The admin panel's Coaches / Members tab showed nothing, with:
--
--   Error: Could not find a relationship between 'team_memberships' and 'teams'
--          in the schema cache
--
-- CAUSE
--   admin.html embeds the team name via PostgREST, e.g.
--     .from('team_memberships').select('*, teams(name)')
--
--   PostgREST can only embed across a DECLARED FOREIGN KEY. team_memberships had an
--   FK to auth.users(id) but NONE to teams(id) - so PostgREST had no relationship in
--   its schema cache and refused the embed.
--
--   Both columns are already TEXT (team_memberships.team_id and teams.id), so no
--   cast or type change is required. The FK simply never existed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SAFETY (verified before applying)
-- ─────────────────────────────────────────────────────────────────────────────
-- ZERO orphan rows. Every team_memberships.team_id resolved to an existing teams.id,
-- so the constraint validated against live data without a backfill:
--
--   SELECT tm.team_id, count(*)
--   FROM team_memberships tm
--   LEFT JOIN teams t ON t.id = tm.team_id
--   WHERE t.id IS NULL
--   GROUP BY tm.team_id;
--   -- returned 0 rows
--
-- ON DELETE CASCADE: deleting a team removes its memberships. This matches the
-- existing user_id FK (also CASCADE) and the admin panel's expectation that deleting
-- a team cleans up after itself.
--
-- NOTE: access_requests.team_id has NO FK either, and holds one row with a NULL
-- team_id. An FK there would tolerate the NULL, but it is out of scope here - the
-- panel does not embed teams into access_requests. Worth a follow-up.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ─────────────────────────────────────────────────────────────────────────────
--   ALTER TABLE public.team_memberships DROP CONSTRAINT team_memberships_team_id_fkey;
--   DROP INDEX IF EXISTS public.idx_team_memberships_team_id;


ALTER TABLE public.team_memberships
  ADD CONSTRAINT team_memberships_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE CASCADE;

-- Postgres does NOT auto-index foreign keys. Every membership lookup by team and
-- every CASCADE delete scans on team_id, so index it explicitly.
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id
  ON public.team_memberships (team_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run after applying)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The FK exists:
--
--   SELECT con.conname, pg_get_constraintdef(con.oid)
--   FROM pg_constraint con
--   JOIN pg_class c      ON c.oid = con.conrelid
--   JOIN pg_namespace n  ON n.oid = c.relnamespace
--   WHERE n.nspname='public' AND c.relname='team_memberships' AND con.contype='f';
--
--   Expect both team_memberships_user_id_fkey AND team_memberships_team_id_fkey.
--
-- 2. The join PostgREST needs now resolves:
--
--   SELECT tm.email, tm.role, t.name AS team_name
--   FROM team_memberships tm
--   JOIN teams t ON t.id = tm.team_id;
--
-- 3. PostgREST caches its schema. After applying, the Coaches tab may need a hard
--    refresh, or up to ~60s for the cache to pick up the new relationship. To force
--    a reload:
--
--   NOTIFY pgrst, 'reload schema';
