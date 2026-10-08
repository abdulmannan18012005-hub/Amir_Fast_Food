# Anon Access Audit

**Date:** 2026-10-07

## Overview
We executed `scripts/check-anon-access.mjs` using the Supabase `anon` key to verify if public users could read or mutate sensitive tables directly from the browser.

## Findings
1. **`menu_items` (Read):** SUCCESS. Allowed as expected.
2. **`orders` (Read/Write):** VULNERABLE. The `anon` key successfully read from the `orders` table.
3. **`restaurant_knowledge` (Update):** VULNERABLE. The `anon` key successfully mutated the knowledge base table.

## Root Cause & Remediation
The database currently lacks proper Row Level Security (RLS) enforcement. 

To fix this, **the owner MUST execute the following SQL migration in the Supabase SQL Editor:**
- `supabase/migrations/20261006_lock_orders.sql` (This locks down `orders`, `order_items`, and `push_subscriptions`).

**Additional Migration Required (Action Item for Owner):**
The `restaurant_knowledge` table also needs to be locked down so the `anon` key cannot mutate it. Please run the following in the Supabase SQL Editor:
```sql
ALTER TABLE restaurant_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for restaurant_knowledge" ON restaurant_knowledge;
CREATE POLICY "Public read access for restaurant_knowledge" ON restaurant_knowledge FOR SELECT USING (true);
```
*(This ensures the server's Service Role key is strictly required for writing, but public users can still read).*
