-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on menu_items" ON menu_items;

-- Create policies to allow anyone to read the menu
CREATE POLICY "Allow public read access on categories" 
ON categories FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access on menu_items" 
ON menu_items FOR SELECT 
USING (true);
