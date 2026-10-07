-- Lock down orders and subscriptions so anon key cannot read private data
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Note: We intentionally do NOT add any policies for anon/authenticated roles.
-- The Service Role key (which bypasses RLS) is used by the server to read/write these tables.
-- This ensures the frontend browser (anon key) can NEVER read or write order data directly.

-- We leave public tables readable by anyone
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for menu_items" ON menu_items;
CREATE POLICY "Public read access for menu_items" ON menu_items FOR SELECT USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for categories" ON categories;
CREATE POLICY "Public read access for categories" ON categories FOR SELECT USING (true);

/* ROLLBACK:
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
*/
