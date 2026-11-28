-- ============================================================================
-- Migration 05: Compare-at Pricing, Product Sort Order, Layout CMS,
--               Device Daily Order Limit (20/day PKT), and Admin Summary Fix
-- Forward-only migration for Amir Fast Food. DO NOT re-run 01..04 unnecessarily.
-- ============================================================================

-- 1. Menu Items: optional Compare-at Price (original_price) & deterministic sort_order
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS original_price INTEGER NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_original_price_positive_chk'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_original_price_positive_chk
      CHECK (original_price IS NULL OR original_price > 0);
  END IF;
END $$;

-- Backfill initial product ordering per category cleanly where sort_order is NULL
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at ASC, name ASC, id ASC) * 10 AS rn
  FROM public.menu_items
  WHERE sort_order IS NULL
)
UPDATE public.menu_items m
SET sort_order = ranked.rn
FROM ranked
WHERE m.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_menu_items_category_sort
  ON public.menu_items (category_id, sort_order ASC NULLS LAST, name ASC);

-- 2. Layout & Content Management Table (single row 'main')
CREATE TABLE IF NOT EXISTS public.site_layout_content (
  id TEXT PRIMARY KEY DEFAULT 'main',
  draft_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL
);

ALTER TABLE public.site_layout_content ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_layout_content FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.site_layout_content TO service_role;

-- 3. Persistent Device Daily Order Limit Table & Atomic RPCs (20/device/day PKT)
CREATE TABLE IF NOT EXISTS public.device_daily_orders (
  device_key TEXT NOT NULL,
  day_pkt DATE NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_key, day_pkt)
);

CREATE INDEX IF NOT EXISTS idx_device_daily_orders_expires_at
  ON public.device_daily_orders (expires_at);

ALTER TABLE public.device_daily_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.device_daily_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.device_daily_orders TO service_role;

CREATE OR REPLACE FUNCTION public.consume_device_daily_order(
  p_device_key TEXT,
  p_fallback_key TEXT,
  p_day_pkt DATE,
  p_limit INTEGER DEFAULT 20,
  p_enforce_fallback BOOLEAN DEFAULT FALSE,
  p_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fp_count INTEGER := 0;
  v_dev_count INTEGER := 0;
BEGIN
  -- Clean expired rows periodically
  DELETE FROM public.device_daily_orders WHERE expires_at < NOW() - INTERVAL '2 days';

  IF p_enforce_fallback AND COALESCE(p_fallback_key, '') <> '' THEN
    SELECT order_count INTO v_fp_count
    FROM public.device_daily_orders
    WHERE device_key = p_fallback_key AND day_pkt = p_day_pkt
    FOR UPDATE;

    IF COALESCE(v_fp_count, 0) >= p_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'count', v_fp_count,
        'remaining', 0,
        'reason', 'fallback_limit_reached'
      );
    END IF;
  END IF;

  INSERT INTO public.device_daily_orders (device_key, day_pkt, order_count, expires_at, updated_at)
  VALUES (p_device_key, p_day_pkt, 1, p_expires_at, NOW())
  ON CONFLICT (device_key, day_pkt)
  DO UPDATE SET
    order_count = public.device_daily_orders.order_count + 1,
    expires_at = GREATEST(public.device_daily_orders.expires_at, EXCLUDED.expires_at),
    updated_at = NOW()
  WHERE public.device_daily_orders.order_count < p_limit
  RETURNING order_count INTO v_dev_count;

  IF NOT FOUND THEN
    SELECT order_count INTO v_dev_count
    FROM public.device_daily_orders
    WHERE device_key = p_device_key AND day_pkt = p_day_pkt;

    RETURN jsonb_build_object(
      'allowed', false,
      'count', COALESCE(v_dev_count, p_limit),
      'remaining', 0,
      'reason', 'device_limit_reached'
    );
  END IF;

  IF COALESCE(p_fallback_key, '') <> '' THEN
    INSERT INTO public.device_daily_orders (device_key, day_pkt, order_count, expires_at, updated_at)
    VALUES (p_fallback_key, p_day_pkt, 1, p_expires_at, NOW())
    ON CONFLICT (device_key, day_pkt)
    DO UPDATE SET
      order_count = public.device_daily_orders.order_count + 1,
      expires_at = GREATEST(public.device_daily_orders.expires_at, EXCLUDED.expires_at),
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', v_dev_count,
    'remaining', GREATEST(0, p_limit - v_dev_count)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_device_daily_order(
  p_device_key TEXT,
  p_fallback_key TEXT,
  p_day_pkt DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.device_daily_orders
  SET order_count = GREATEST(0, order_count - 1),
      updated_at = NOW()
  WHERE device_key = p_device_key AND day_pkt = p_day_pkt;

  IF COALESCE(p_fallback_key, '') <> '' THEN
    UPDATE public.device_daily_orders
    SET order_count = GREATEST(0, order_count - 1),
        updated_at = NOW()
    WHERE device_key = p_fallback_key AND day_pkt = p_day_pkt;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_device_daily_order(TEXT, TEXT, DATE, INTEGER, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_device_daily_order(TEXT, TEXT, DATE, INTEGER, BOOLEAN, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.release_device_daily_order(TEXT, TEXT, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_device_daily_order(TEXT, TEXT, DATE) TO service_role;

-- 4. Update get_orders_summary_metrics so leading `#` in Order ID search is normalized
CREATE OR REPLACE FUNCTION public.get_orders_summary_metrics(
  p_status TEXT DEFAULT 'All',
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivered_count BIGINT := 0;
  v_delivered_revenue NUMERIC := 0;
  v_search TEXT := NULLIF(LTRIM(TRIM(COALESCE(p_search, '')), '#'), '');
BEGIN
  IF p_status IN ('Active', 'Canceled') THEN
    RETURN jsonb_build_object('delivered_count', 0, 'delivered_revenue', 0);
  END IF;

  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(COALESCE(total_amount, 0) + COALESCE(delivery_fee, 0)), 0)::NUMERIC
  INTO v_delivered_count, v_delivered_revenue
  FROM public.orders
  WHERE status = 'delivered'
    AND (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at < p_end)
    AND (
      v_search IS NULL
      OR id::TEXT ILIKE ('%' || v_search || '%')
      OR customer_name ILIKE ('%' || v_search || '%')
      OR customer_phone ILIKE ('%' || v_search || '%')
    );

  RETURN jsonb_build_object(
    'delivered_count', v_delivered_count,
    'delivered_revenue', v_delivered_revenue
  );
END;
$$;
