-- =====================================================================
-- AMIR FAST FOOD: Persistent Distributed Rate Limits & Admin Sessions
-- Forward-Only, Non-Destructive SQL Migration
-- Apply in Supabase SQL Editor before deploying hardened auth/rate limits.
-- =====================================================================

-- 1. Distributed Rate Limiting Table (replaces per-instance memory Maps)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at
  ON public.rate_limits (expires_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no public anon policies are granted.

-- Atomic increment-or-reset check used by server rateLimit.ts
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_count INTEGER;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.rate_limits (key, count, expires_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
        WHEN public.rate_limits.expires_at < v_now THEN 1
        ELSE public.rate_limits.count + 1
      END,
      expires_at = CASE
        WHEN public.rate_limits.expires_at < v_now THEN v_now + make_interval(secs => p_window_seconds)
        ELSE public.rate_limits.expires_at
      END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Read-only lockout status check (does not consume an attempt)
CREATE OR REPLACE FUNCTION public.rate_limit_is_blocked(
  p_key TEXT,
  p_limit INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT count, expires_at INTO v_rec
  FROM public.rate_limits
  WHERE key = p_key;

  IF NOT FOUND OR v_rec.expires_at < clock_timestamp() THEN
    RETURN FALSE;
  END IF;

  RETURN v_rec.count >= p_limit;
END;
$$;

-- Clear key (used on successful admin login to reset IP attempt counter)
CREATE OR REPLACE FUNCTION public.rate_limit_reset(
  p_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE key = p_key;
END;
$$;

-- Restrict RPC execution from anonymous/public callers
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.rate_limit_is_blocked(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_is_blocked(TEXT, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.rate_limit_reset(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_reset(TEXT) TO service_role;

-- 2. Persistent Admin Sessions Table (replaces in-memory revokedTokens Set)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON public.admin_sessions (expires_at);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
