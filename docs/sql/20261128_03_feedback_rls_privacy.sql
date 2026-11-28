-- =====================================================================
-- AMIR FAST FOOD: Lock Down Anonymous SELECT on customer_feedback
-- Forward-Only, Non-Destructive SQL Migration
-- Apply in Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Remove unsafe unrestricted public read policy identified by audit
DROP POLICY IF EXISTS "Allow public read customer_feedback" ON public.customer_feedback;

-- Server functions (submitFeedbackFn, getFeedbackForOrderFn, getAdminFeedbackListFn)
-- use the service_role client, so anon SELECT/INSERT is not required.
DROP POLICY IF EXISTS "Allow public insert for delivered orders" ON public.customer_feedback;
