-- Drop and recreate categories
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE menu_items CASCADE;

INSERT INTO categories (id, name, slug, sort_order) VALUES
('cat_deals', 'Deals & Combos', 'deals', 1),
('cat_specials', 'Specials', 'specials', 2),
('cat_burgers', 'Burgers', 'burgers', 3),
('cat_shawarma', 'Shawarma & Paratha', 'shawarma', 4),
('cat_pizza', 'Pizza', 'pizza', 5),
('cat_chicken', 'Chicken & Wings', 'chicken', 6),
('cat_sandwiches_fries', 'Sandwiches & Fries', 'sandwiches-fries', 7),
('cat_drinks', 'Drinks', 'drinks', 8);

-- Insert items
INSERT INTO menu_items (id, category_id, sub_category, name, description, price, is_available, image_url) VALUES
-- Deals
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 1', '1 Zinger Burger, Reg Fries, Coke', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 2', '6 Hot Wings, Reg Fries, Coke', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 3', '1 Sandwich, 1 Reg Fries, Reg Coke', 600, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 4', '1 Pratha Roll, Reg Fries, Reg Coke', 580, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 5', '2 Zinger Burger, Reg Fries, 0.5 Lt Coke', 940, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 6', '1 Zinger, 1 Full Wing, Reg Fries, Reg Coke', 700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 7', '1 Small Pizza, 0.5 Litter Coke', 650, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 8', '1 Zinger, 1 Chicken Chapli Burger, Reg Fries, 0.5 Coke', 850, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 9', 'Nuggets, 2 Zinger, 0.5 Litter Coke', 1050, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 10', '1 Small Pizza, 1 Zinger, 0.5 Coke', 1000, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 11', '1 Zinger Burger, 1 Pratha Roll, Reg Fries, 0.5 Coke', 950, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 12', '2 Small Pizza, 1 Litter Coke', 1200, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 13', '3 Zinger Burger, Reg Fries, 1 Lt Coke', 1300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 14', '1 Medium Pizza, 1 Litter Coke', 1200, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 15', '5 Zinger, 1 Family Fries, 1.5 Coke', 2000, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 16', '1 Large Pizza, 1.5 Litter Coke', 1700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 17', '2 Medium Pizza, 1.5 Litter Coke', 2150, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 18', '2 Large Pizza, Jumbo Coke', 3100, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 19', '1 Small Pizza, 6 pcs Hotwing, 1 Reg Fries, 0.5 Coke', 1150, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_deals', 'Deals', 'Deal 20', '2 Zinger, 6 Pc Hot Wings, 0.5 Coke, Reg Fries', 1250, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Specials
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Tikka Boti Shawarma', '', 320, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Malai Boti Shawarma', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Chicken Grill Burger', '', 400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Chicken Grill Burger Special', 'With Fries', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Chicken Grilled Sandwich', '', 600, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Pizza Burger', 'With Fries', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Duble Masti Burger', 'With Fries', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Oven Back Pasta - Small', '', 400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Oven Back Pasta - Large', '', 700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Loaded Fries - Small', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_specials', 'Specials', 'Loaded Fries - Large', '', 650, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Burgers
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Zinger Burger', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Chicken Patty Cheese', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'B.B.Q Burger', '', 400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Double Patty + Cheese', '', 500, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Chicken Patty', '', 300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Chicken Chapli Burger', '', 300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_burgers', 'Burgers', 'Amir''s Sp Burger', '', 550, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Shawarma
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Zinger Shawarma', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Chicken Shawarma - Small', '', 150, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Chicken Shawarma - Medium', '', 200, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Chicken Shawarma - Large', '', 250, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Plater Shawarma', '', 600, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'B.B.Q Paratha', '', 380, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Twister Roll', '', 380, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_shawarma', 'Shawarma', 'Kabab Paratha', '', 380, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Chicken
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'Full Wings', '', 120, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'B.B.Q Wings', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'Hot wings (6pcs)', '', 350, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'Chicken piece', '', 300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'Nugets (6pc)', '', 300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_chicken', 'Chicken', 'Hot Shot', '', 500, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Sandwiches & Fries
(uuid_generate_v4(), 'cat_sandwiches_fries', 'Sandwiches', 'Club Sandwich', '', 400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_sandwiches_fries', 'Fries', 'Reg French Fries', '', 150, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_sandwiches_fries', 'Fries', 'Family French Fries', '', 300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Drinks
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Coke Reg.NR', '', 80, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Coke 0.5L', '', 120, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Coke 1.5L', '', 200, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Coke 2.25L', '', 250, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Water 0.5L', '', 60, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_drinks', 'Drinks', 'Water 1.5L', '', 100, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

-- Pizza (Single Rates)
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Tikka - Small', '', 450, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Tikka - Medium', '', 900, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Tikka - Large', '', 1300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Fajitta - Small', '', 450, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Fajitta - Medium', '', 900, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Fajitta - Large', '', 1300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Supreme - Small', '', 450, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Supreme - Medium', '', 900, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Classic', 'Chicken Supreme - Large', '', 1300, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

(uuid_generate_v4(), 'cat_pizza', 'Special', 'Malai Boti - Small', '', 600, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Special', 'Malai Boti - Medium', '', 1200, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Special', 'Malai Boti - Large', '', 1700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Crown Crust - Small', '', 700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Crown Crust - Medium', '', 1400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Crown Crust - Large', '', 2000, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),

(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Amir Special - Small', '', 700, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Amir Special - Medium', '', 1400, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'),
(uuid_generate_v4(), 'cat_pizza', 'Premium', 'Amir Special - Large', '', 2000, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80');
