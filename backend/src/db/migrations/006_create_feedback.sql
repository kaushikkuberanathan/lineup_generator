-- Migration 006: create feedback table with RLS
-- Additive only — no existing tables are modified.

CREATE TABLE feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_e164   TEXT,
  type         TEXT        NOT NULL CHECK (type IN ('feedback', 'bug')),
  category     TEXT,
  location     TEXT,
  body         TEXT        NOT NULL,
  change_types JSONB,
  severity     TEXT,
  app_version  TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert their own rows
CREATE POLICY "feedback: owner insert"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- Only admins may read all feedback
CREATE POLICY "feedback: admin select"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid()
        AND role   = 'admin'
        AND status = 'active'
    )
  );
