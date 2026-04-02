# TODO: Fix activate_membership RPC (Phase 4C cleanup)

## Current State
The activate_membership PostgreSQL function was built for phone-only auth.
Current signature:
  activate_membership(p_user_id uuid, p_phone_e164 text, p_first_name text, p_last_name text)

## Problem
Phase 4B added email auth. The RPC doesn't support:
- email parameter
- team_id parameter

## Current Workaround (auth.js /verify route)
Direct .update() call on team_memberships instead of RPC:
  supabaseAdmin
    .from('team_memberships')
    .update({ user_id, status: 'active', activated_at })
    .match({ ...contactFilter, team_id })
    .in('status', ['invited', 'active'])

## Fix Required (Migration 013)
Update the RPC to accept email + team_id:

CREATE OR REPLACE FUNCTION activate_membership(
  p_user_id   uuid,
  p_team_id   text,
  p_email     text DEFAULT NULL,
  p_phone     text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE team_memberships
  SET 
    user_id      = p_user_id,
    status       = 'active',
    activated_at = now()
  WHERE team_id = p_team_id
    AND (
      (p_email IS NOT NULL AND email = p_email) OR
      (p_phone IS NOT NULL AND phone_e164 = p_phone)
    )
    AND status IN ('invited', 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

## Files to update after migration
- backend/src/routes/auth.js — restore RPC call, remove direct update workaround
- backend/src/db/migrations/ — add 013_fix_activate_membership.sql

## Blocks on
Nothing — safe to run anytime after Phase 4B is stable
