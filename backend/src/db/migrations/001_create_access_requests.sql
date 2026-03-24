-- Migration 001: create access_requests table
-- Additive only — no existing tables are modified.

CREATE TABLE access_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  phone_e164   TEXT        NOT NULL UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID        REFERENCES auth.users(id),
  notes        TEXT
);

CREATE INDEX idx_access_requests_phone_e164 ON access_requests (phone_e164);
CREATE INDEX idx_access_requests_status     ON access_requests (status);
