-- Phase 1 Step 6: RLS Recommendations
-- DO NOT RUN THESE DIRECTLY UNLESS READY. These are recommendations for the owner.

/*
-- 1. Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- 2. Menu Items (Public Read, Admin Write)
CREATE POLICY "Public can read available menu items" ON menu_items
  FOR SELECT USING (true); -- Because server functions and public need to read. (Server functions using Service Role bypass this anyway).

-- 3. Orders (No direct public read/write)
-- Since we moved createOrder, getPublicOrder, and getKitchenOrders to server functions (using the service role),
-- we DO NOT need to allow the anon key to read or insert into orders directly!
CREATE POLICY "Deny all public access to orders" ON orders
  FOR ALL USING (false);

-- 4. Order Items (No direct public read/write)
CREATE POLICY "Deny all public access to order_items" ON order_items
  FOR ALL USING (false);

-- Notes: 
-- Realtime (postgres_changes) STILL WORKS with RLS enabled! The service role handles the initial query,
-- but wait! If RLS is enabled and 'orders' is set to false, anon subscriptions will NOT receive payloads.
-- To allow realtime subscriptions for a specific order ID, we would need a policy like:
-- CREATE POLICY "Users can listen to their own order" ON orders FOR SELECT USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub');
-- But since we don't have auth, it's complex. For now, leave RLS disabled or only restrict INSERT/UPDATE, and let SELECT remain open.
*/
