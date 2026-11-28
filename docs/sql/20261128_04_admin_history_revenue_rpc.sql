-- =====================================================================
-- AMIR FAST FOOD: Aggregate Revenue & Order Count Summary RPC
-- Forward-Only, Non-Destructive SQL Migration
-- Ensures /admin/history computes full filtered totals without loading thousands of rows.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_orders_summary_metrics(
  p_status TEXT DEFAULT 'All',
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT := 0;
  v_delivered_count BIGINT := 0;
  v_delivered_revenue NUMERIC := 0;
  v_search TEXT := NULLIF(btrim(COALESCE(p_search, '')), '');
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COALESCE(SUM(total_amount + COALESCE(delivery_fee, 0)) FILTER (WHERE status = 'delivered'), 0)
  INTO
    v_total_count,
    v_delivered_count,
    v_delivered_revenue
  FROM public.orders
  WHERE
    (
      p_status IS NULL OR p_status = 'All'
      OR (p_status = 'Active' AND status IN ('received', 'preparing', 'out_for_delivery'))
      OR (p_status = 'Delivered' AND status = 'delivered')
      OR (p_status = 'Canceled' AND status = 'canceled')
    )
    AND (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at < p_end)
    AND (
      v_search IS NULL
      OR id::TEXT ILIKE '%' || v_search || '%'
      OR customer_name ILIKE '%' || v_search || '%'
      OR customer_phone ILIKE '%' || v_search || '%'
    );

  RETURN jsonb_build_object(
    'total_count', v_total_count,
    'delivered_count', v_delivered_count,
    'delivered_revenue', v_delivered_revenue
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_orders_summary_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_orders_summary_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;
