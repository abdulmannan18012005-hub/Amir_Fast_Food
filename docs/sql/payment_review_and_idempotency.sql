-- =====================================================================
-- AMIR FAST FOOD: Payment Review Status, Duplicate TID Constraint, & Idempotency
-- Safe, Idempotent Database Migration Script
-- Note: Review diagnostics before applying in Supabase SQL Editor.
-- =====================================================================

-- 1. DIAGNOSTIC QUERY: Check for any existing duplicate active TIDs
-- If this query returns rows, resolve them manually or inspect order history
-- before applying the unique index below.
SELECT 
    LOWER(TRIM(payment_trx_id)) AS duplicate_tid, 
    COUNT(*) AS active_order_count,
    ARRAY_AGG(id) AS order_ids,
    ARRAY_AGG(status) AS statuses
FROM public.orders
WHERE payment_method = 'online_transfer'
  AND status != 'canceled'
  AND payment_trx_id IS NOT NULL
  AND TRIM(payment_trx_id) != ''
GROUP BY LOWER(TRIM(payment_trx_id))
HAVING COUNT(*) > 1;

-- 2. ADD COLUMNS (Idempotent)
-- Add payment_review_status column with allowed states
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_review_status TEXT DEFAULT 'not_required';

-- Add check constraint for payment_review_status if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_review_status_check'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_payment_review_status_check 
        CHECK (payment_review_status IN ('not_required', 'pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add idempotency_key column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 3. UNIQUE INDEXES (Idempotent)
-- Enforce partial uniqueness for active online transfer transaction IDs
-- Canceled orders do NOT hold the lock, allowing legitimate retries
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_active_trx 
ON public.orders (LOWER(TRIM(payment_trx_id))) 
WHERE payment_method = 'online_transfer' 
  AND status != 'canceled' 
  AND payment_trx_id IS NOT NULL 
  AND TRIM(payment_trx_id) != '';

-- Enforce uniqueness on non-null idempotency keys to prevent double-submit orders
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_idempotency_key 
ON public.orders (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 4. HISTORICAL BACKFILL (Preserves Existing Production Order States)
-- Past verified or progressed online orders are marked 'approved'
UPDATE public.orders 
SET payment_review_status = 'approved' 
WHERE payment_method = 'online_transfer' 
  AND (payment_verified_at IS NOT NULL OR status IN ('preparing', 'out_for_delivery', 'delivered'))
  AND (payment_review_status IS NULL OR payment_review_status = 'not_required');

-- Past received unverified online orders are marked 'pending'
UPDATE public.orders 
SET payment_review_status = 'pending' 
WHERE payment_method = 'online_transfer' 
  AND payment_verified_at IS NULL 
  AND status = 'received'
  AND (payment_review_status IS NULL OR payment_review_status = 'not_required');

-- Past canceled online orders are marked 'rejected' if canceled for payment reason
UPDATE public.orders 
SET payment_review_status = 'rejected' 
WHERE payment_method = 'online_transfer' 
  AND status = 'canceled'
  AND (cancel_reason ILIKE '%payment%' OR cancel_reason ILIKE '%tid%' OR cancel_reason ILIKE '%rejected%')
  AND (payment_review_status IS NULL OR payment_review_status = 'not_required');
