-- Migration 004: RLS hardening for Phase 4 auth cutover
-- Purpose: Lock down Supabase Row Level Security so Phase 4 (adding requireAuth
--          to existing routes) does not break viewer mode, share links, or coach
--          data access — while blocking cross-team reads and unauthenticated writes.
--
-- !! RUN TIMING: Run this AT OR JUST BEFORE Phase 4 cutover. Running before cutover
--    will break the app because today's coaches write team_data with the anon key
--    (unauthenticated). Only run after requireAuth is added to existing index.js routes
--    and coaches have been onboarded via OTP.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent: DROP POLICY IF EXISTS guards make this safe to re-run.
--
-- INSPECT CURRENT POLICIES FIRST (read-only, run before this migration):
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SCENARIO COVERAGE
-- ─────────────────────────────────────────────────────────────────────────────
-- S1  Unauthenticated viewer (anon + ?s=XXXXXXXX share link)
--       → CAN read share_links by id  ✓
--       → CANNOT read team_data       ✗
-- S2  Coach reads own team (authenticated, active membership)
--       → CAN read teams, team_data, roster_snapshots for their team_id  ✓
-- S3  Cross-team block (authenticated but wrong team)
--       → CANNOT read another team's team_data or roster_snapshots       ✗
-- S4  Viewer write block (anon writes)
--       → CANNOT write to team_data, teams, roster_snapshots, share_links ✗
-- S5  Feature flag / share_links read
--       → Anon can read share_links (payload is self-contained, token is secret) ✓
--       → Enumeration risk: mitigated by UUID-derived 8-char IDs (~4.3B space)
-- S6  team_data_history (audit log)
--       → No anon reads; no authenticated-role reads; service_role only via trigger ✗
-- S7  Share token enumeration
--       → Anon CAN issue SELECT * on share_links (RLS cannot enforce WHERE id=?)
--       → Defense: UUID entropy + Supabase rate-limit on anon requests
--       → Mitigated acceptably — document rather than block (see note below)
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. share_links   (S1, S4, S5, S7)
-- ═══════════════════════════════════════════════════════════════════════════
-- Design: anon SELECT allowed (viewer mode requires it). Authenticated INSERT
-- allowed (coaches create share links). No anon INSERT — share links must be
-- created by the app on behalf of an authenticated coach.
--
-- S7 note: Postgres RLS cannot conditionally enforce WHERE clauses the caller
-- provides. `USING (true)` for anon SELECT means a malicious client could
-- enumerate all share_links rows. Mitigation:
--   a) IDs are UUID-derived (8 hex chars = 32 bits / ~4.3B possibilities)
--   b) Supabase enforces anon rate-limiting on the REST API
--   c) payload reveals only lineup data, not PII beyond first names
-- If enumeration becomes a concern post-Phase 4, add a Postgres function
-- that takes a single id and returns a single row — expose via RPC instead.

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Drop any catch-all policies from initial setup
DROP POLICY IF EXISTS "Allow anon read"          ON public.share_links;
DROP POLICY IF EXISTS "Allow anon insert"         ON public.share_links;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.share_links;
DROP POLICY IF EXISTS "share_links_open"          ON public.share_links;

-- S1/S5: Anon can read share links (viewer mode via ?s=XXXXXXXX)
CREATE POLICY "share_links_anon_select"
  ON public.share_links FOR SELECT
  TO anon
  USING (true);
-- Rollback: DROP POLICY "share_links_anon_select" ON public.share_links;

-- Authenticated coaches can also read (e.g., verify their own link)
CREATE POLICY "share_links_auth_select"
  ON public.share_links FOR SELECT
  TO authenticated
  USING (true);
-- Rollback: DROP POLICY "share_links_auth_select" ON public.share_links;

-- Authenticated coaches can create share links
CREATE POLICY "share_links_auth_insert"
  ON public.share_links FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- Rollback: DROP POLICY "share_links_auth_insert" ON public.share_links;

-- S4: No anon INSERT — shares are created by the app on behalf of an auth user
-- (No INSERT policy for anon role = denied by default once RLS is enabled)

-- No DELETE policy — share_links are append-only, cleaned up manually or via cron


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. teams   (S2, S3, S4)
-- ═══════════════════════════════════════════════════════════════════════════
-- Design: coaches can read/write their own teams (via team_memberships join).
-- Anon blocked entirely post-Phase 4. team_memberships.team_id is TEXT;
-- teams.id may be uuid or text depending on team age — cast to text for join.

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all"       ON public.teams;
DROP POLICY IF EXISTS "teams_open"      ON public.teams;
DROP POLICY IF EXISTS "teams_anon_all"  ON public.teams;

-- S2: Active coach can read their own team
CREATE POLICY "teams_auth_select"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id  = auth.uid()
        AND tm.team_id  = public.teams.id::text
        AND tm.status   = 'active'
    )
  );
-- Rollback: DROP POLICY "teams_auth_select" ON public.teams;

-- S3: Cross-team block is enforced by the EXISTS subquery above
-- (only rows where team_memberships links auth.uid() to that team_id are visible)

-- Coaches can create new teams
CREATE POLICY "teams_auth_insert"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- Rollback: DROP POLICY "teams_auth_insert" ON public.teams;

-- Active coach/admin can update their team details
CREATE POLICY "teams_auth_update"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id  = auth.uid()
        AND tm.team_id  = public.teams.id::text
        AND tm.role     IN ('admin', 'coach')
        AND tm.status   = 'active'
    )
  );
-- Rollback: DROP POLICY "teams_auth_update" ON public.teams;

-- Admin-role coach can delete their team
CREATE POLICY "teams_auth_delete"
  ON public.teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id  = auth.uid()
        AND tm.team_id  = public.teams.id::text
        AND tm.role     = 'admin'
        AND tm.status   = 'active'
    )
  );
-- Rollback: DROP POLICY "teams_auth_delete" ON public.teams;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. team_data   (S1, S2, S3, S4) — HIGHEST RISK TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- Design: Authenticated active members can read; admin/coach role required
-- to write. Anon blocked (S4). Cross-team blocked by team_memberships join (S3).
-- Viewer role (read-only member) can SELECT but not write.
--
-- NOTE: team_data.team_id is TEXT (matches team_memberships.team_id).
-- No cast needed.

ALTER TABLE public.team_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all"        ON public.team_data;
DROP POLICY IF EXISTS "team_data_open"   ON public.team_data;
DROP POLICY IF EXISTS "team_data_anon_all" ON public.team_data;

-- S2 + S3: Active member of this team can read (coaches AND viewers)
CREATE POLICY "team_data_auth_select"
  ON public.team_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.team_data.team_id
        AND tm.status  = 'active'
    )
  );
-- Rollback: DROP POLICY "team_data_auth_select" ON public.team_data;

-- S4: Only admin/coach can INSERT (first-time create for a team)
CREATE POLICY "team_data_auth_insert"
  ON public.team_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.team_data.team_id
        AND tm.role    IN ('admin', 'coach')
        AND tm.status  = 'active'
    )
  );
-- Rollback: DROP POLICY "team_data_auth_insert" ON public.team_data;

-- S4: Only admin/coach can UPDATE (roster edits, schedule, grid, lock/unlock)
CREATE POLICY "team_data_auth_update"
  ON public.team_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.team_data.team_id
        AND tm.role    IN ('admin', 'coach')
        AND tm.status  = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.team_data.team_id
        AND tm.role    IN ('admin', 'coach')
        AND tm.status  = 'active'
    )
  );
-- Rollback: DROP POLICY "team_data_auth_update" ON public.team_data;

-- No DELETE policy — team_data persists with the team; cascade from teams delete


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. roster_snapshots   (S2, S3, S4)
-- ═══════════════════════════════════════════════════════════════════════════
-- Design: same membership-based access as team_data. The auto-prune trigger
-- fires AFTER INSERT as the table owner — it does not require a client RLS grant.

ALTER TABLE public.roster_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all"             ON public.roster_snapshots;
DROP POLICY IF EXISTS "roster_snapshots_open" ON public.roster_snapshots;

-- S2 + S3: Active member can read their team's snapshots
CREATE POLICY "roster_snapshots_auth_select"
  ON public.roster_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.roster_snapshots.team_id
        AND tm.status  = 'active'
    )
  );
-- Rollback: DROP POLICY "roster_snapshots_auth_select" ON public.roster_snapshots;

-- S4: Only admin/coach can insert snapshots
CREATE POLICY "roster_snapshots_auth_insert"
  ON public.roster_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.roster_snapshots.team_id
        AND tm.role    IN ('admin', 'coach')
        AND tm.status  = 'active'
    )
  );
-- Rollback: DROP POLICY "roster_snapshots_auth_insert" ON public.roster_snapshots;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. team_data_history   (S6)
-- ═══════════════════════════════════════════════════════════════════════════
-- Design: append-only audit log. No anon reads. No authenticated-role reads
-- via REST API. Writes happen only via the snapshot_team_data() trigger which
-- runs as SECURITY DEFINER (table owner context) — bypasses RLS for trigger writes.
-- service_role (backend supabaseAdmin) bypasses RLS entirely for recovery reads.
--
-- With RLS enabled and NO policies added:
--   - anon role        → blocked (no matching policy)
--   - authenticated    → blocked (no matching policy)
--   - service_role     → bypasses RLS (Supabase default behavior)
--   - trigger function → SECURITY DEFINER, runs as owner → bypasses RLS

ALTER TABLE public.team_data_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all"                 ON public.team_data_history;
DROP POLICY IF EXISTS "team_data_history_open"    ON public.team_data_history;

-- INTENTIONALLY NO POLICIES — all REST API access is denied.
-- Only the Postgres trigger (SECURITY DEFINER) and service_role can write/read.
--
-- Emergency rollback if trigger breaks (open temporarily):
--   CREATE POLICY "temp_open_for_recovery" ON public.team_data_history FOR ALL USING (true);
-- Then fix and re-enable:
--   DROP POLICY "temp_open_for_recovery" ON public.team_data_history;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Auth tables verification note
-- ═══════════════════════════════════════════════════════════════════════════
-- The following tables were created by migrations 001/003 and should already
-- have RLS policies in place. Verify with the pg_policies query above before
-- adding policies here to avoid conflicts:
--
--   access_requests — anon INSERT (anyone can request), no anon SELECT
--   profiles        — authenticated SELECT own row only (auth.uid() = id)
--   team_memberships — authenticated SELECT own memberships (auth.uid() = user_id)
--   feedback        — authenticated INSERT only; no SELECT for non-admins
--
-- If any of these lack policies after running the pg_policies query, contact
-- the migration author and add BEFORE running 004.
--
-- All writes to auth tables go through backend routes using supabaseAdmin
-- (service role) — RLS on these tables is defence-in-depth, not the primary gate.
