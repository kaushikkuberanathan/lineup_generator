-- ############################################################################
-- !! DO NOT RUN. THIS FUNCTION WAS DROPPED FROM PRODUCTION ON 2026-07-13.
-- !!
-- !! activate_membership() was dropped in backend/migrations/012 because it was:
-- !!
-- !!   DEAD      - zero callers. No .rpc('activate_membership') anywhere in the repo.
-- !!   OBSOLETE  - built for phone-only auth. Phone/SMS auth was PERMANENTLY REMOVED.
-- !!               Its lookup key is phone_e164; the live UI collects no phone field.
-- !!   BROKEN    - it declares RETURNS TABLE(..., team_id UUID, ...) but
-- !!               team_memberships.team_id is TEXT in production. It would ERROR on
-- !!               the first returned row. It has likely never executed successfully.
-- !!   UNSAFE    - SECURITY DEFINER with NO pinned search_path: a privilege-escalation
-- !!               vector. A caller could shadow an unqualified table name and have a
-- !!               postgres-privileged function operate on THEIR table.
-- !!
-- !! Running this file re-creates a broken, vulnerable, uncalled function.
-- !!
-- !! The real membership activation path is a direct .update() in
-- !! backend/src/routes/auth.js. See docs/product/ROADMAP.md:1324.
-- ############################################################################

-- Migration 005: atomic function to activate a membership on first OTP login
-- Additive only — no existing tables are modified.

CREATE OR REPLACE FUNCTION activate_membership(
  p_user_id    UUID,
  p_phone_e164 TEXT,
  p_first_name TEXT,
  p_last_name  TEXT
)
RETURNS TABLE (
  membership_id UUID,
  team_id       UUID,
  role          TEXT,
  status        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Upsert profile: insert on first login, update name fields on subsequent calls
  INSERT INTO profiles (id, first_name, last_name, phone_e164)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone_e164)
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        updated_at = now();

  -- 2. Claim the invited membership row that matches this phone number
  UPDATE team_memberships
  SET user_id      = p_user_id,
      status       = 'active',
      activated_at = now()
  WHERE phone_e164 = p_phone_e164
    AND status     = 'invited';

  -- 3. Return the activated membership row(s)
  RETURN QUERY
    SELECT
      tm.id     AS membership_id,
      tm.team_id,
      tm.role,
      tm.status
    FROM team_memberships tm
    WHERE tm.user_id = p_user_id
      AND tm.status  = 'active';
END;
$$;
