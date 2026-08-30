-- Migration 028: legal_consents table (Terms of Service / Privacy Policy
-- consent audit trail)
--
-- APPLIED TO DEV (psqvzppphdedqkpmarwx) AND PROD (hzaajccyurlyeweekvma),
-- both 2026-08-29 (same session, KK confirmed go-ahead: "yes let's go and
-- apply those migrations"). Verified live on both via a real insert +
-- cleanup against each database (not just an information_schema query),
-- and Supabase security advisors re-run clean on both — the only finding
-- is the expected INFO-level "RLS enabled, no policies" on legal_consents
-- itself, the deliberate design (see below), same as the pre-existing
-- finding on auth_events/team_data_history. docs/db/schema.sql updated to
-- include this table (ground truth now that it's actually live).
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- The registration screen (frontend/src/components/Auth/RequestAccessScreen.jsx)
-- gates submission on a "I agree to the Terms of Service and Privacy Policy"
-- checkbox. What needs to be durable after that moment is NOT the legal text
-- itself — the text is versioned, in git, in
-- frontend/src/content/legal.js's LEGAL_DOCS[].versions[] array — it's the
-- fact that a specific person agreed to a specific version of a specific
-- document at a specific time. This table is exactly that fact, one row per
-- (document, version) accepted, and nothing else. To find out what a coach
-- actually read when they agreed, join this row's (doc_id, version) back to
-- the matching entry in LEGAL_DOCS[doc_id].versions[] in git history — the
-- version string is the pointer; the text is never duplicated into the DB.
--
-- This is a NEW table, not a change to any existing table or route handler —
-- required by backend/CLAUDE.md's Zero-Downtime Constraint (CRITICAL,
-- "additive only... do NOT modify existing route handlers... do NOT alter
-- existing tables or columns"), which is still in force (Phase 4C auth
-- cutover is only 2 of 7 steps done as of v3.0.0). access_requests already
-- has a similar-shaped device-context payload, but adding columns to it
-- would mean editing POST /request-access's existing insert — exactly what
-- that constraint forbids. A separate table + a brand-new route
-- (POST /api/v1/auth/consent, additive) keeps the existing request-access
-- flow completely untouched.
--
-- Deliberately NOT routed through auth_events (migration 005/027's
-- event_type CHECK constraint) — that would require widening the CHECK for
-- a new event type (another migration, another constraint to keep in sync)
-- for no benefit: this table is already a structured, purpose-built audit
-- log, and auth_events' free-form metadata JSONB isn't a better fit for
-- something that needs to be queried by (email, doc_id, version).
--
-- Keyed by email, not user_id — consent happens at registration time,
-- before any auth.users row necessarily exists (mirrors access_requests'
-- own email-keyed design, for the same reason). A future pass can add
-- user_id once Phase 4C makes it reliably available at this point in the
-- flow; not required for this table to be useful today.
--
-- context lets the same table carry future non-registration consent events
-- (e.g. a forced re-consent at login after a material ToS change bumps the
-- version) without a schema change — just a new value written from a new
-- call site.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_consents (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  doc_id       TEXT NOT NULL,              -- matches content/legal.js LEGAL_DOCS[].id, e.g. 'terms', 'privacy'
  version      TEXT NOT NULL,              -- matches the accepted entry's LEGAL_DOCS[].versions[].version, e.g. '2.0' — never the doc text itself
  context      TEXT NOT NULL DEFAULT 'request_access',
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_consents_email ON public.legal_consents (email);
CREATE INDEX IF NOT EXISTS idx_legal_consents_doc_version ON public.legal_consents (doc_id, version);

-- RLS enabled, zero policies — same "service-role only" pattern as
-- team_data_history (migration 006): the backend (supabaseAdmin,
-- service_role) bypasses RLS entirely and is the only writer/reader this
-- table needs. No anon or authenticated policy is added on purpose — a
-- consent record must never be forgeable or readable by a client-side key.
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
