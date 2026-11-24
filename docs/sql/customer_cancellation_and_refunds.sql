-- =====================================================================
-- AMIR FAST FOOD: Customer Cancellation, Secure Ownership & Refund System
-- Safe, Idempotent Database Migration Script
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =====================================================================

-- 1. ADD COLUMNS (Idempotent)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_token_hash TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_source TEXT DEFAULT 'customer';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'not_required';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_proof_path TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_paid_at TIMESTAMPTZ;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_trx_ref TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_admin_note TEXT;

-- 2. ADD CHECK CONSTRAINTS (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_refund_status_check'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_refund_status_check 
        CHECK (refund_status IN ('not_required', 'pending_review', 'approved', 'paid', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_cancellation_source_check'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_cancellation_source_check 
        CHECK (cancellation_source IN ('customer', 'admin', 'system'));
    END IF;
END $$;

-- 3. CREATE FILTERING INDEXES (Idempotent)
CREATE INDEX IF NOT EXISTS idx_orders_refund_status 
ON public.orders (refund_status) 
WHERE refund_status != 'not_required';

CREATE INDEX IF NOT EXISTS idx_orders_cancellation_source 
ON public.orders (cancellation_source) 
WHERE status = 'canceled';

-- 4. HISTORICAL DATA CONSISTENCY
-- Ensure existing canceled orders have valid default cancellation source and refund status
UPDATE public.orders 
SET cancellation_source = 'admin' 
WHERE status = 'canceled' AND cancellation_source IS NULL;

UPDATE public.orders 
SET refund_status = 'not_required' 
WHERE refund_status IS NULL;

-- 5. VERIFICATION QUERY
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN (
    'cancellation_token_hash', 
    'cancellation_source', 
    'refund_status', 
    'refund_proof_path', 
    'refund_reviewed_at', 
    'refund_paid_at', 
    'refund_trx_ref', 
    'refund_admin_note'
  )
ORDER BY column_name;
