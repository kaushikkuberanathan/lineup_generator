-- Migration 027: widen auth_events_event_type_check to allow 'magic_link_requested' (#736)
--
-- auth_events.event_type's CHECK constraint was set by hand directly in
-- Supabase (not tracked in either migration tree -- grepped both
-- backend/migrations/ and backend/src/db/migrations/, no match) back when
-- this app used phone OTP. It was never updated when v2.1.0 replaced OTP
-- with email magic-link auth and backend/src/routes/auth.js started calling
-- logAuthEvent('magic_link_requested', ...) on every POST /magic-link.
--
-- Effect: every single magic-link request has had its audit-event insert
-- silently rejected by this constraint since v2.1.0 -- confirmed live on
-- PROD via Supabase logs ("violates check constraint
-- auth_events_event_type_check"). No functional impact (logAuthEvent()
-- deliberately swallows all errors -- "analytics must never block auth" --
-- so login itself has always worked), but the auth_events audit trail has
-- never recorded a single magic-link request.
--
-- Verified against every current logAuthEvent() call site (auth.js) before
-- writing this: 'access_requested', 'access_denied', 'session_resumed',
-- 'logout' are all already covered by the existing constraint; only
-- 'magic_link_requested' is missing. Adding it (Option A from #736, not
-- reverting the code to the stale 'otp_requested' name) since it is the
-- accurate, current name for this flow -- the constraint is what's stale.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT, safe to re-run.

BEGIN;

ALTER TABLE public.auth_events
  DROP CONSTRAINT IF EXISTS auth_events_event_type_check;

ALTER TABLE public.auth_events
  ADD CONSTRAINT auth_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'otp_requested'::text,
    'otp_verified'::text,
    'otp_failed'::text,
    'session_resumed'::text,
    'logout'::text,
    'access_denied'::text,
    'access_requested'::text,
    'access_approved'::text,
    'access_denied_by_admin'::text,
    'magic_link_requested'::text
  ]));

COMMIT;
