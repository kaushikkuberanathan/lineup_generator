-- Migration 018: auto-provision a team_memberships row when a team is created
--
-- DRAFTED 2026-08-06 (#561). NOT YET APPLIED TO DEV (psqvzppphdedqkpmarwx) OR
--   PROD (hzaajccyurlyeweekvma). Verified only against the local ephemeral
--   `supabase start` stack this session, via the new TM1-TM4 regression suite
--   in backend/src/__tests__/rls/teamMembershipAutoProvision.test.js — RED
--   before this file existed (TM2 failed with an RLS-denied team_data
--   INSERT, reproducing #561 exactly), GREEN after applying it locally.
--   Repo record of a trigger authored and locally-verified, committed before
--   a live DEV/prod apply — same "commit first, apply later" convention as
--   013-017, just one step earlier in that sequence given tonight's
--   no-prod-writes constraint.
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- createTeam() (frontend/src/App.jsx ~line 2354) inserts a team via
-- dbSaveTeams() (frontend/src/supabase.js) — a bare `teams` upsert with no
-- accompanying team_memberships write. No other code path fills that gap
-- either: every INSERT into team_memberships in this repo is an ADMIN action
-- (approve/reject/update-role/reset-access/suspend in backend/src/routes/
-- admin.js) — there is no self-serve "you just created a team, here is your
-- membership" step anywhere.
--
-- team_data_auth_insert's WITH CHECK (migration 004, "3. team_data" section)
-- requires an EXISTS team_memberships row with role IN ('admin','coach') AND
-- status='active' for that team_id. With no such row, the coach's first
-- dbSaveTeamData() call for their new team — saving a roster, a schedule,
-- anything — is silently RLS-denied. The team shell exists; nothing can ever
-- be saved to it. Confirmed via #561's own investigation (no speculation).
--
-- NOTE ON A PRE-EXISTING, WEAKER OBSERVATION OF THE SAME GAP: this repo's own
-- T3-control test (backend/src/__tests__/rls/policies.test.js, #477) already
-- noticed "nothing here creates [a membership] for the creator" while testing
-- teams_auth_insert's RETURNING-vs-SELECT-policy interaction, but concluded
-- "not an app-facing bug" because dbSaveTeams() doesn't chain .select(). That
-- conclusion was correct for teams_auth_insert specifically (SELECT policy
-- only matters for RETURNING) but did not extend to team_data_auth_insert's
-- WITH CHECK, which gates the INSERT itself regardless of .select() — a
-- materially different, consequential failure mode. #561 is the first time
-- this was traced all the way to an actual denied write.
--
-- ---------------------------------------------------------------------------
-- DESIGN
-- ---------------------------------------------------------------------------
-- AFTER INSERT trigger on public.teams (mirrors migration 014's handle_new_user
-- shape: AFTER INSERT, SECURITY DEFINER, pinned search_path). Fires once per
-- newly-inserted team row (Postgres does not re-fire an AFTER INSERT trigger
-- for the UPDATE branch of INSERT ... ON CONFLICT DO UPDATE, which is what
-- supabase-js's .upsert() generates — so re-saving an existing team is a
-- no-op here, verified by TM4).
--
-- Identity source: auth.uid() — NOT teams.owner_id. owner_id is TEXT,
-- DEFAULT '' (docs/db/schema.sql line 100), never populated by any known
-- write path (dbSaveTeams() does not send it) — it cannot be trusted as "who
-- created this team" today. auth.uid() is read from the request's JWT claims
-- for the SAME connection running this INSERT; SECURITY DEFINER elevates
-- privilege for the function body's own statements only, it does not change
-- what auth.uid() resolves to. This is the correct identity for "whoever's
-- authenticated session performed this INSERT" — exactly the creator.
--
-- If auth.uid() is NULL (no session on the connection — should not happen in
-- practice, since teams_auth_insert is TO authenticated only, but defensive
-- regardless), the trigger no-ops rather than erroring: a team without a
-- membership row is the pre-existing bug, not a new failure this migration
-- could introduce; failing the INSERT itself here would be worse than #561.
--
-- WHERE-NOT-EXISTS guard instead of ON CONFLICT: team_memberships has no
-- UNIQUE index on (team_id, user_id) (only on (team_id, email) and
-- (team_id, phone_e164) where not null, per schema.sql) — an ON CONFLICT
-- target does not exist to reference. The guard is belt-and-braces; the
-- AFTER INSERT firing pattern above already makes double-provisioning
-- unreachable for the .upsert() call shape the real app uses.
--
-- Role/status: 'admin' + 'active' — the creator of a self-serve team is
-- immediately its sole administrator, no invite/approval step (mirrors the
-- issue's own suggested direction (a); matches how seedAdminDeleteFixture()
-- in the RLS test suite already models "team creator = active admin").
-- Both values are inside the SEVEN-value role CHECK / three-value status
-- CHECK schema.sql documents — not the four-role model CLAUDE.md's Multi-team
-- design section describes as the CODE-level target (normalizeRole()); this
-- trigger writes directly to the DB layer, same as every other DEFINER
-- function in this file, so it is bound by the DB CHECK, not normalizeRole().
--
-- email column: team_memberships_contact_required CHECK requires
-- phone_e164 IS NOT NULL OR email IS NOT NULL. Pulled from auth.users via
-- auth.uid() — always present for both magic-link and Google OAuth signups
-- (root CLAUDE.md Auth Strategy).
--
-- ---------------------------------------------------------------------------
-- NO BACKFILL — BY DESIGN, AND NOT POSSIBLE
-- ---------------------------------------------------------------------------
-- This trigger only provisions teams created AFTER it is applied. Any
-- already-broken second-team (or later) rows created before this migration
-- ships remain broken — and, unlike migration 014's profiles backfill, THIS
-- GAP CANNOT BE BACKFILLED: owner_id is always '' (never populated), so there
-- is no stored data anywhere that identifies who created an existing
-- membership-less team row. Recovering those requires a manual admin action
-- per affected team (an admin.js route can insert the missing
-- team_memberships row once the correct owner is identified out-of-band —
-- e.g. asking the affected coach which team is theirs). Flagging for KK:
-- decide whether a prod audit query (count of teams with zero
-- team_memberships rows) is worth running before/after this ships, to size
-- the manual-recovery list. Not run as part of this migration.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   DROP TRIGGER IF EXISTS on_team_created ON public.teams;
--   DROP FUNCTION IF EXISTS public.handle_new_team();
--
-- Related: #561

CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_id uuid;
  creator_email text;
BEGIN
  creator_id := auth.uid();

  IF creator_id IS NOT NULL THEN
    SELECT email INTO creator_email FROM auth.users WHERE id = creator_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_id = NEW.id::text AND user_id = creator_id
    ) THEN
      INSERT INTO public.team_memberships
        (user_id, team_id, role, status, email, activated_at)
      VALUES
        (creator_id, NEW.id::text, 'admin', 'active', creator_email, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();
