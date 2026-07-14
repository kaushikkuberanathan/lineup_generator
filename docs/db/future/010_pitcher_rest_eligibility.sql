-- ─────────────────────────────────────────────────────────────────────────────
-- NOT APPLIED. DO NOT RUN.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- This is a PRESERVED DESIGN, not a pending migration. It is checked in so the
-- schema survives outside a database we cannot reliably reach, and so DEV can be
-- rebuilt from prod without losing it.
--
-- Rescued from the DEV Supabase project (psqvzppphdedqkpmarwx) on 2026-07-13.
-- The table exists there, holds ZERO rows, and has NEVER been referenced by any
-- code: zero hits across frontend/, backend/, scripts/, docs/, migrations, and the
-- entire git history - not by table name, not by any of its eleven columns.
--
-- It was abandoned exploration. Preserving it is a deliberate choice, not an
-- endorsement.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IT IS: pitcher REST ELIGIBILITY (not pitch counting)
-- ─────────────────────────────────────────────────────────────────────────────
-- Youth leagues cap how much a kid can pitch, because arms get hurt. The rule is
-- typically: N outs per game, M per week, then mandatory rest days. This table is
-- the persistence layer for enforcing that.
--
-- NOTE - it counts OUTS, not pitches. Pitch counting is a DIFFERENT feature and it
-- already SHIPPED: v2.3.2 added opposing-pitcher pitch counts (the opp_* columns on
-- live_game_state), and at_bats.pitches holds pitch-by-pitch data. Do not confuse
-- the two.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE ORPHANED SIBLING - and the mismatch that must be resolved first
-- ─────────────────────────────────────────────────────────────────────────────
-- frontend/src/utils/leagueRules.js:501 already contains:
--
--   export function validatePitcherEligibility(rules, pitcherStats) { ... }
--
-- It is DEAD CODE: exported, never imported, never called, never tested. It traces
-- to the same unfinished scoring-engine commit (e7c80dc) as this table.
--
-- !! CRITICAL MISMATCH: that validator measures INNINGS
-- !!   (inningsThisGame / inningsThisWeek / pitchedMaxLastGame)
-- !! while THIS TABLE measures OUTS
-- !!   (outs_this_game / outs_this_week / pitched_max_*)
-- !!
-- !! They model the same concept with incompatible units. Whoever builds this must
-- !! pick one. Outs are the finer-grained and more accurate unit (a pitcher yanked
-- !! mid-inning has thrown a partial inning), which is presumably why the table
-- !! chose them - but leagueRules.js's rule DATA is expressed in innings
-- !! (maxInningsPerGame: 2, maxInningsPerWeek: 4). Reconcile before building.
--
-- The rule data already exists for 9-10U through 13U (leagueRules.js:124,142,159,175).
-- 8U has pitchChartRequired: false - so this does not apply to the Mud Hens TODAY,
-- but will when they age up.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- BEFORE APPLYING THIS, FIX THE RLS POLICY BELOW
-- ─────────────────────────────────────────────────────────────────────────────
-- The scorer_write policy (preserved verbatim below) compares:
--
--   game_scoring_sessions.scorer_user_id = auth.uid()
--
-- but scorer_user_id is TEXT, and auth.uid() returns UUID. That comparison will
-- error or never match. It also presumes an authenticated scoring model, which does
-- not exist yet - today's scorer lock uses a localStorage UUID, not auth.users.
--
-- This policy CANNOT work until the requireAuth cutover (WS-3) and the FK restore
-- (WS-4) land. See docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md.
--
-- ─────────────────────────────────────────────────────────────────────────────


CREATE TABLE IF NOT EXISTS public.pitcher_tracking (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  game_id                 text        NOT NULL,
  team_id                 text        NOT NULL,
  pitcher_id              text        NOT NULL,
  pitcher_name            text        NOT NULL,
  week_start_date         date        NOT NULL,
  outs_this_game          integer     NOT NULL DEFAULT 0,
  outs_this_week          integer     NOT NULL DEFAULT 0,
  pitched_max_this_game   boolean     NOT NULL DEFAULT false,
  pitched_max_this_week   boolean     NOT NULL DEFAULT false,
  needs_rest              boolean     NOT NULL DEFAULT false,
  last_updated            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pitcher_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT pitcher_tracking_game_id_team_id_pitcher_id_key
    UNIQUE (game_id, team_id, pitcher_id)
);

-- If applied for real, add the FKs that DEV never had. Every other team_id in the
-- schema should reference teams(id) - see docs/db/PROD_SCHEMA_BASELINE.md, which
-- lists the missing-FK inventory.
--
--   ALTER TABLE public.pitcher_tracking
--     ADD CONSTRAINT pitcher_tracking_team_id_fkey
--     FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
--
--   CREATE INDEX idx_pitcher_tracking_team_week
--     ON public.pitcher_tracking (team_id, week_start_date);


ALTER TABLE public.pitcher_tracking ENABLE ROW LEVEL SECURITY;

-- Anyone can read: parents and coaches need to see whether a kid is rest-eligible.
CREATE POLICY "public_read_pitcher_tracking"
  ON public.pitcher_tracking
  FOR SELECT
  USING (true);

-- Only the ACTIVE SCORER for this game may write. Gated on holding the scorer lock
-- with a live heartbeat (60s). This is a genuinely good design - it means only the
-- one device actually scoring the game can mutate pitch-eligibility state.
--
-- !! BROKEN AS WRITTEN - see the header. scorer_user_id is TEXT; auth.uid() is UUID.
-- !! Do not apply until WS-3 / WS-4 make the scorer an authenticated user.
CREATE POLICY "scorer_write_pitcher_tracking"
  ON public.pitcher_tracking
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.game_scoring_sessions s
      WHERE s.game_id        = pitcher_tracking.game_id
        AND s.team_id        = pitcher_tracking.team_id
        AND s.scorer_user_id = auth.uid()          -- <-- TEXT = UUID. Broken.
        AND s.last_heartbeat > (now() - interval '1 minute')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_scoring_sessions s
      WHERE s.game_id        = pitcher_tracking.game_id
        AND s.team_id        = pitcher_tracking.team_id
        AND s.scorer_user_id = auth.uid()          -- <-- TEXT = UUID. Broken.
        AND s.last_heartbeat > (now() - interval '1 minute')
    )
  );
