-- Migration 007: P1 FIX - infinite recursion in team_memberships RLS
--
-- APPLIED TO PRODUCTION: 2026-07-13 (Supabase ledger 20260713154419)
-- Repo record of a migration applied directly to prod.
--
-- Idempotent: safe to re-run.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE BUG
-- ─────────────────────────────────────────────────────────────────────────────
-- Policy "admin_manages_memberships" ON team_memberships was defined as:
--
--   USING (EXISTS (SELECT 1 FROM team_memberships tm
--                   WHERE tm.user_id = auth.uid()
--                     AND tm.role    = 'admin'
--                     AND tm.status  = 'active'))
--
-- The policy ON team_memberships QUERIES team_memberships. To decide whether a row
-- is visible, Postgres evaluates the policy, which reads the table, which triggers
-- the policy, forever. Postgres aborts with:
--
--   ERROR: infinite recursion detected in policy for relation "team_memberships"
--
-- Consequence: EVERY authenticated read of team_memberships threw. admin.html's
-- admin gate queries this table with the anon client plus the user's session, so it
-- always errored - and the panel treated the error as "not an admin" and showed
-- Access Denied to real admins.
--
-- The panel's RLS-based admin gate had NEVER worked.
--
-- Provenance not fully established: the recursive pattern appears in
-- backend/src/db/migrations/004_rls_policies.sql, but under the policy name
-- "team_memberships: admin all". The policy actually live in prod was named
-- "admin_manages_memberships". Same recursive shape, different name - so it was
-- renamed or recreated at some point outside the tracked migration files. This is
-- itself a symptom of the root problem (see below).
--
-- ROOT PROBLEM: prod's Supabase migration ledger contained only migrations applied
-- on 2026-07-13. The rest of the schema - including every RLS policy - was applied
-- by hand. There was never a source of truth to diff prod against, so a policy could
-- be recursive for months with nothing to catch it.
--
-- Blast radius was wider than one table: access_requests and feedback policies also
-- contained the same inline subquery against team_memberships. Those are cross-table
-- (not self-recursive) but they still FAILED, because evaluating them requires
-- reading team_memberships, which trips its recursive policy. So the panel's Pending
-- Requests and Feedback tabs were broken by the same root cause.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE FIX
-- ─────────────────────────────────────────────────────────────────────────────
-- A SECURITY DEFINER function runs as its owner (postgres) and BYPASSES RLS, so
-- querying team_memberships from inside it does not re-trigger the policy. The loop
-- is broken. All three tables' admin policies now call is_active_admin() instead of
-- an inline subquery.
--
-- search_path is pinned: a SECURITY DEFINER function without a fixed search_path is
-- itself a privilege-escalation vector.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW IT WAS FOUND
-- ─────────────────────────────────────────────────────────────────────────────
-- Only by KK actually logging in to the admin panel for the first time. Nothing in
-- any test suite exercises RLS as an authenticated user, so two P1s hid behind a
-- green test suite. See the "no RLS coverage" backlog story.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (restores the broken-but-known state)
-- ─────────────────────────────────────────────────────────────────────────────
--   DROP POLICY "admin_manages_memberships" ON public.team_memberships;
--   CREATE POLICY "admin_manages_memberships" ON public.team_memberships FOR ALL
--     USING (EXISTS (SELECT 1 FROM team_memberships tm
--                    WHERE tm.user_id = auth.uid()
--                      AND tm.role='admin' AND tm.status='active'));
--   -- (and likewise for access_requests / feedback)
--   DROP FUNCTION public.is_active_admin();


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The helper. SECURITY DEFINER -> bypasses RLS -> no recursion.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE user_id = auth.uid()
      AND role    = 'admin'
      AND status  = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_admin() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. team_memberships - replace the self-recursive policy.
--    "user_sees_own_membership" (SELECT own row) is NOT recursive; left as-is.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manages_memberships" ON public.team_memberships;

CREATE POLICY "admin_manages_memberships"
  ON public.team_memberships
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. access_requests - same inline subquery, same fix.
--    "public_can_request_access" (anon INSERT) is UNTOUCHED: the public request
--    form must keep working without a login.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manages_requests" ON public.access_requests;

CREATE POLICY "admin_manages_requests"
  ON public.access_requests
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. feedback - admin SELECT used the same subquery.
--    "feedback: owner insert" is not admin-gated; left as-is.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback: admin select" ON public.feedback;

CREATE POLICY "feedback: admin select"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run after applying)
-- ─────────────────────────────────────────────────────────────────────────────
-- Impersonates an authenticated admin and runs the four queries the panel makes.
-- All four threw "infinite recursion detected" before this migration.
-- Substitute a real admin user_id for <ADMIN_UUID>.
--
--   CREATE OR REPLACE FUNCTION public.__tmp_probe()
--   RETURNS TABLE(step text, result text) LANGUAGE plpgsql AS $$
--   DECLARE n int;
--   BEGIN
--     PERFORM set_config('request.jwt.claims',
--       '{"sub":"<ADMIN_UUID>","role":"authenticated"}', true);
--     SET LOCAL ROLE authenticated;
--     SELECT count(*) INTO n FROM public.team_memberships;
--     step := 'team_memberships'; result := n || ' rows'; RETURN NEXT;
--     SELECT count(*) INTO n FROM public.access_requests;
--     step := 'access_requests';  result := n || ' rows'; RETURN NEXT;
--     SELECT count(*) INTO n FROM public.feedback;
--     step := 'feedback';         result := n || ' rows'; RETURN NEXT;
--     step := 'is_active_admin()'; result := public.is_active_admin()::text; RETURN NEXT;
--     RESET ROLE;
--   END $$;
--   SELECT * FROM public.__tmp_probe();
--   DROP FUNCTION public.__tmp_probe();
--
-- Expect: row counts returned (not errors), and is_active_admin() = true.
