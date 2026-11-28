-- =====================================================================
-- AMIR FAST FOOD: Atomic Order Placement, Idempotency & Tracking Auth
-- Forward-Only, Non-Destructive SQL Migration
-- Apply in Supabase SQL Editor before deploying atomic checkout server code.
-- =====================================================================

-- 1. Add forward-only security & idempotency columns on public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token_hash
  ON public.orders (tracking_token_hash)
  WHERE tracking_token_hash IS NOT NULL;

-- Ensure required uniqueness constraints exist
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_active_trx
  ON public.orders (LOWER(TRIM(payment_trx_id)))
  WHERE payment_method = 'online_transfer'
    AND status != 'canceled'
    AND payment_trx_id IS NOT NULL
    AND TRIM(payment_trx_id) != '';

CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_idempotency_key
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Atomic All-or-Nothing Order Creation RPC (process_order_v2)
-- Inserts order header + all line items + payment/tracking/idempotency metadata
-- in a single PostgreSQL transaction, eliminating partial/orphan orders.
CREATE OR REPLACE FUNCTION public.process_order_v2(
  p_user_id UUID,
  p_total NUMERIC,
  p_delivery_fee NUMERIC,
  p_payment_method TEXT,
  p_payment_trx_id TEXT,
  p_payment_review_status TEXT,
  p_idempotency_key TEXT,
  p_request_fingerprint TEXT,
  p_cancellation_token_hash TEXT,
  p_tracking_token_hash TEXT,
  p_cancellation_source TEXT,
  p_refund_status TEXT,
  p_delivery_lat DOUBLE PRECISION,
  p_delivery_lng DOUBLE PRECISION,
  p_distance_km DOUBLE PRECISION,
  p_distance_fee NUMERIC,
  p_cod_fee NUMERIC,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_existing RECORD;
  v_constraint TEXT;
  v_item JSONB;
BEGIN
  -- 1. Check idempotency key inside transaction
  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT id, request_fingerprint
    INTO v_existing
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      IF v_existing.request_fingerprint IS NOT DISTINCT FROM p_request_fingerprint THEN
        RETURN jsonb_build_object(
          'status', 'idempotent_hit',
          'order_id', v_existing.id
        );
      ELSE
        RETURN jsonb_build_object(
          'status', 'idempotency_conflict'
        );
      END IF;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('status', 'validation_error', 'message', 'Cart is empty.');
  END IF;

  -- 2. Atomic subtransaction for order header + all order_items
  BEGIN
    INSERT INTO public.orders (
      user_id,
      total_amount,
      delivery_fee,
      payment_method,
      payment_trx_id,
      payment_review_status,
      idempotency_key,
      request_fingerprint,
      cancellation_token_hash,
      tracking_token_hash,
      cancellation_source,
      refund_status,
      delivery_lat,
      delivery_lng,
      distance_km,
      distance_fee,
      cod_fee,
      status,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address
    )
    VALUES (
      p_user_id,
      p_total,
      p_delivery_fee,
      p_payment_method,
      p_payment_trx_id,
      p_payment_review_status,
      NULLIF(btrim(COALESCE(p_idempotency_key, '')), ''),
      p_request_fingerprint,
      p_cancellation_token_hash,
      p_tracking_token_hash,
      p_cancellation_source,
      p_refund_status,
      p_delivery_lat,
      p_delivery_lng,
      p_distance_km,
      p_distance_fee,
      p_cod_fee,
      'received',
      p_name,
      p_phone,
      p_email,
      p_address
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.order_items (
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        selected_variants
      )
      VALUES (
        v_order_id,
        (v_item->>'menu_item_id')::UUID,
        (v_item->>'quantity')::INTEGER,
        COALESCE((v_item->>'unit_price')::NUMERIC, (v_item->>'price')::NUMERIC),
        COALESCE(v_item->'selected_variants', v_item->'variants', '[]'::JSONB)
      );
    END LOOP;

    RETURN jsonb_build_object(
      'status', 'created',
      'order_id', v_order_id
    );

  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

      IF v_constraint = 'orders_unique_active_trx' THEN
        RETURN jsonb_build_object('status', 'tid_duplicate');
      END IF;

      IF v_constraint = 'orders_unique_idempotency_key' THEN
        SELECT id, request_fingerprint
        INTO v_existing
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF FOUND THEN
          IF v_existing.request_fingerprint IS NOT DISTINCT FROM p_request_fingerprint THEN
            RETURN jsonb_build_object(
              'status', 'idempotent_hit',
              'order_id', v_existing.id
            );
          ELSE
            RETURN jsonb_build_object('status', 'idempotency_conflict');
          END IF;
        END IF;
      END IF;

      RETURN jsonb_build_object(
        'status', 'db_error',
        'message', 'Unique constraint violation during order creation'
      );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.process_order_v2(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, NUMERIC,
  TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_order_v2(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, NUMERIC,
  TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;
