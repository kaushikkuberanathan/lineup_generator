-- Migration 025: capture the pre-existing feature_flags table (#109)
--
-- The feature_flags table, its RLS policy, and its anon/authenticated grant
-- have existed in PROD since before this repo adopted migration discipline
-- (see #351) -- applied by hand, with no migration file behind them. This
-- migration does not change prod's schema; it retroactively documents what
-- is already live, the same pattern migrations like 013 (RLS test-grants
-- helper) already use for pre-existing objects. Every statement below is
-- idempotent (IF NOT EXISTS / DROP-then-CREATE / GRANT, none of which error
-- on a repeat run), so running this against a database that already has the
-- table is a safe no-op -- and running it against a fresh DEV rebuild
-- creates the table for the first time, closing the gap #109 exists for.
--
-- Definitions transcribed directly from docs/db/schema.sql (§ 3, § 8, § 9),
-- the file this repo treats as ground truth for object definitions (#358),
-- not retyped from memory or from application code.
--
-- Known pre-existing defect, NOT fixed here (out of scope for this
-- migration -- see docs/db/PROD_SCHEMA_BASELINE.md, Incident 5): team_id is
-- BIGINT while every other team_id in the schema is TEXT, and team ids
-- include non-numeric slugs (e.g. 'party-animals-8u'). Team-scoped flags
-- only work for numeric-id teams today. Fixing the column type is a real
-- schema change against live data and needs its own migration + rollout
-- plan, not a documentation-only capture.

BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  flag_name   text                     NOT NULL,
  enabled     boolean                  NOT NULL DEFAULT false,
  -- BIGINT, not TEXT like every other team_id in this schema -- see the
  -- Known pre-existing defect note above. Preserved as-is; not fixed here.
  team_id     bigint,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  CONSTRAINT feature_flags_pkey PRIMARY KEY (id),
  CONSTRAINT uq_flag_team UNIQUE (flag_name, team_id)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can read feature flags" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);

-- Matches prod's live grant exactly (docs/db/schema.sql § 9) -- full CRUD +
-- TRUNCATE to anon/authenticated. Not narrowed here: this migration
-- documents existing state, it does not re-scope prod access as a side
-- effect. Grant-narrowing is its own change with its own review.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.feature_flags
  TO anon, authenticated;

COMMIT;
