-- Migration 007: feature_flags table
-- Stores global feature flag overrides.
-- Frontend reads this on app load and merges with static defaults.
-- Static defaults in featureFlags.js are the fallback if this table
-- is unreachable. Always fail open — never block the app on flag fetch failure.

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name   TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed initial flags
INSERT INTO feature_flags (flag_name, enabled, description) VALUES
  ('MAINTENANCE_MODE', false, 'Show maintenance screen to all users. Enable before deploys, disable after verifying prod.'),
  ('VIEWER_MODE',      false, 'Read-only swipeable inning cards for parents via share link.'),
  ('GAME_MODE',        false, 'Full-screen live game overlay.'),
  ('ACCESSIBILITY_V1', false, 'Font floor, touch targets, contrast uplift, aria labels.')
ON CONFLICT (flag_name) DO NOTHING;

-- RLS: allow public read, no public write
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Only service role can write (via Supabase dashboard or backend)
-- No INSERT/UPDATE policy for anon or authenticated roles.
