-- NOT part of the numbered migration sequence and NEVER run against a real
-- Supabase project (Supabase already provides `auth.users` and `auth.uid()`
-- for real). This file exists for two situations only:
--   1. The test suite (tests/integration/*) runs this against an in-memory
--      pglite Postgres to get a faithful stand-in for Supabase's auth
--      primitives, so RLS policies can be exercised for real.
--   2. Someone deliberately runs this app against plain Postgres (Neon,
--      local Postgres, etc.) instead of Supabase and needs a minimal
--      `auth.users`/`auth.uid()` to satisfy the FK + RLS policies below.
--      In that setup, YOU are responsible for populating `auth.users` and
--      setting `request.jwt.claim.sub` per-request yourself (e.g. via a
--      session middleware) — Supabase does this for you automatically.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
