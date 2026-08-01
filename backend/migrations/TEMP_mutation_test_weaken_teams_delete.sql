-- TEMPORARY MUTATION-TEST FILE — DO NOT MERGE, DO NOT NUMBER AS A REAL MIGRATION
--
-- Exists only to prove T7 (backend/src/__tests__/rls/policies.test.js)
-- actually detects a real teams_auth_delete regression, not just a fixture
-- issue. Widens the DELETE role check from role = 'admin' to
-- role IN ('admin','coach') — matching UPDATE's laxer check — so a
-- coach-role member (coachA) CAN now delete their own team.
--
-- Expected result: T7 ("coach A CANNOT delete own team A") goes RED.
-- Nothing else should change: T7-control (admin can delete) stays green
-- since admin is still in the widened set; every other T/S/RS scenario is
-- untouched by this table's DELETE policy.
--
-- This file, and its entry in apply-rls-bootstrap.sh, are reverted in a
-- follow-up commit on this same branch once RED is confirmed. The branch
-- itself is never merged — closed after the RED->GREEN round-trip is done.

DROP POLICY IF EXISTS "teams_auth_delete" ON public.teams;

CREATE POLICY "teams_auth_delete"
  ON public.teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id  = auth.uid()
        AND tm.team_id  = public.teams.id::text
        AND tm.role     IN ('admin', 'coach')  -- MUTATION: was = 'admin'
        AND tm.status   = 'active'
    )
  );
