-- Migration 004: enable RLS and define policies on all three new tables
-- Additive only — no existing tables are modified.

-- ─── access_requests ─────────────────────────────────────────────────────────

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) may submit an access request
CREATE POLICY "access_requests: public insert"
  ON access_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins may read access requests
CREATE POLICY "access_requests: admin select"
  ON access_requests
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

-- Only admins may update access requests (e.g. approve / reject)
CREATE POLICY "access_requests: admin update"
  ON access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid()
        AND role   = 'admin'
        AND status = 'active'
    )
  );

-- Only admins may delete access requests
CREATE POLICY "access_requests: admin delete"
  ON access_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid()
        AND role   = 'admin'
        AND status = 'active'
    )
  );

-- ─── profiles ────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users may only access their own profile row
CREATE POLICY "profiles: owner all"
  ON profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── team_memberships ────────────────────────────────────────────────────────

ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Users may read their own membership rows
CREATE POLICY "team_memberships: owner select"
  ON team_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins may perform all operations on any membership row
CREATE POLICY "team_memberships: admin all"
  ON team_memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid()
        AND role   = 'admin'
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid()
        AND role   = 'admin'
        AND status = 'active'
    )
  );
