-- Migration 003: create team_memberships table
-- Additive only — no existing tables are modified.

CREATE TABLE team_memberships (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- intentionally NULL until first OTP login — this is by design
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id      UUID        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'coach'
                           CHECK (role IN ('admin', 'coach', 'scorekeeper', 'viewer')),
  status       TEXT        NOT NULL DEFAULT 'invited'
                           CHECK (status IN ('invited', 'active', 'suspended')),
  phone_e164   TEXT        NOT NULL,
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,

  CONSTRAINT uq_team_memberships_team_phone UNIQUE (team_id, phone_e164)
);

CREATE INDEX idx_team_memberships_phone_e164 ON team_memberships (phone_e164);
CREATE INDEX idx_team_memberships_user_id    ON team_memberships (user_id);
