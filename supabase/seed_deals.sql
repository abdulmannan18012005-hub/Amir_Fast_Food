-- Seed 20 Combo Deals for Amir Fast Food
-- Category: cat_deals ("Special Deals & Combos")

-- 1. Add original_price column if it doesn't exist
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS original_price decimal(10, 2) DEFAULT NULL;

-- 2. Ensure the deals category exists
INSERT INTO categories (id, name, slug, sort_order)
VALUES ('cat_deals', 'Special Deals & Combos', 'deals', 99)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 3. Insert 20 combo deal menu items (uuid auto-generated)
INSERT INTO menu_items (category_id, sub_category, name, description, price, original_price, image_url, is_available, variants)
VALUES
  ('cat_deals', 'Solo Combos', 'Deal 1 - Solo Zinger Combo', '1 Crispy Zinger + Regular Fries + 345ml Drink', 620, 750, '/images/deals/deal01.webp', true, '[]'),
  ('cat_deals', 'Duo Combos', 'Deal 2 - Double Trouble', '2 Crispy Zingers + 1 Large Fries + 2 Drinks', 1199, 1450, '/images/deals/deal02.webp', true, '[]'),
  ('cat_deals', 'Duo Combos', 'Deal 3 - Buddy Patty Pack', '2 Beef Smash Burgers + Cheesy Fries + 2 Drinks', 1350, 1600, '/images/deals/deal03.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 4 - Crispy Broast Feast', '1 Quarter Broast (Leg/Chest) + Bun + Garlic Dip + 345ml Drink', 550, 680, '/images/deals/deal04.webp', true, '[]'),
  ('cat_deals', 'Family Platters', 'Deal 5 - Family Broast Bucket', '8 Pcs Crispy Chicken + 4 Buns + Large Fries + 1.5L Drink', 2299, 2800, '/images/deals/deal05.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 6 - Midnight Craver', '1 Chicken Chapli Burger + 1 Cold Drink', 380, 450, '/images/deals/deal06.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 7 - Mega Crunch Box', '1 Zinger + 2 Pcs Hot Wings + Regular Fries + Drink', 799, 950, '/images/deals/deal07.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 8 - Pizza Burger Mashup', '1 Gourmet Pizza Burger + Curly Fries + Drink', 720, 850, '/images/deals/deal08.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 9 - Loaded Fries Bonanza', '1 Large Chicken Cheesy Loaded Fries + 2 Drinks', 750, 900, '/images/deals/deal09.webp', true, '[]'),
  ('cat_deals', 'Duo Combos', 'Deal 10 - Wing It Combo', '10 Pcs Buffalo Hot Wings + Ranch Dip + 2 Drinks', 899, 1100, '/images/deals/deal10.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 11 - Student Pocket Saver', '1 Egg Shami Burger + 345ml Drink', 250, 320, '/images/deals/deal11.webp', true, '[]'),
  ('cat_deals', 'Duo Combos', 'Deal 12 - Twin Beef Delight', '2 Classic Beef Cheeseburgers + Medium Fries + 2 Drinks', 1250, 1500, '/images/deals/deal12.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 13 - Tender Strips Platter', '6 Pcs Crispy Chicken Tenders + Honey Mustard + Fries + Drink', 699, 850, '/images/deals/deal13.webp', true, '[]'),
  ('cat_deals', 'Duo Combos', 'Deal 14 - Rolls Mania Duo', '2 Malai Boti Paratha Rolls + 2 Drinks', 640, 780, '/images/deals/deal14.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 15 - Spicy Zinger Stack', '1 Double Decker Zinger + Regular Fries + Drink', 820, 980, '/images/deals/deal15.webp', true, '[]'),
  ('cat_deals', 'Family Platters', 'Deal 16 - Party Platter 1', '4 Zingers + 10 Wings + 2 Jumbo Fries + 1.5L Drink', 2799, 3400, '/images/deals/deal16.webp', true, '[]'),
  ('cat_deals', 'Family Platters', 'Deal 17 - Party Platter 2', '3 Beef Burgers + 3 Chicken Burgers + 1.5L Drink', 3150, 3800, '/images/deals/deal17.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 18 - Fish Burger Catch', '1 Crispy Fish Burger + Tartar Sauce + Fries + Drink', 690, 820, '/images/deals/deal18.webp', true, '[]'),
  ('cat_deals', 'Solo Combos', 'Deal 19 - Snack Attack', '4 Pcs Nuggets + 4 Pcs Hot Wings + Dip + 1 Drink', 520, 650, '/images/deals/deal19.webp', true, '[]'),
  ('cat_deals', 'Family Platters', 'Deal 20 - Ultimate Amir Feast', '2 Zingers + 2 Beef Burgers + 4 Broast Pcs + 4 Drinks', 3499, 4200, '/images/deals/deal20.webp', true, '[]');
