-- Migration 030: reconcile the live teams DELETE grant state with history.
--
-- Both DEV and PROD currently deny direct teams DELETE to anon/authenticated,
-- and the authenticated backend DELETE route is live. PROD's original 021
-- apply was reverted and the later re-apply was not recorded in migration
-- history. Reasserting REVOKE is idempotent and creates a durable ledger entry.

REVOKE DELETE ON public.teams FROM anon, authenticated;
