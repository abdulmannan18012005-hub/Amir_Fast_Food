-- 1. EXTENSIONS
create extension if not exists vector;

-- 2. CORE TABLES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role text default 'customer' check (role in ('customer', 'kitchen_staff', 'admin')),
  created_at timestamptz default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  balance decimal(12, 2) default 10000.00 check (balance >= 0),
  updated_at timestamptz default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.wallets(id) on delete cascade,
  amount decimal(12, 2) not null,
  type text check (type in ('signup_grant', 'order_payment', 'refund', 'topup')),
  description text,
  created_at timestamptz default now()
);

-- Auto-credit PKR 10,000 on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_wallet_id uuid;
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'Customer'), 
    new.raw_user_meta_data->>'phone', 
    'customer'
  );

  insert into public.wallets (user_id, balance)
  values (new.id, 10000.00)
  returning id into new_wallet_id;

  insert into public.wallet_transactions (wallet_id, amount, type, description)
  values (new_wallet_id, 10000.00, 'signup_grant', 'Welcome grant of PKR 10,000');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Category table with short readable text primary keys
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text unique not null,
  sort_order int default 0
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id text references public.categories(id) on delete cascade,
  sub_category text not null,
  name text not null,
  description text,
  price decimal(10, 2) not null check (price >= 0),
  image_url text not null,
  is_available boolean default true,
  variants jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  total_amount decimal(10, 2) not null,
  delivery_fee decimal(10, 2) default 0.00,
  payment_method text not null check (payment_method in ('wallet', 'cod', 'online_transfer')),
  status text default 'received' check (status in ('received', 'preparing', 'out_for_delivery', 'delivered', 'canceled')),
  delivery_address text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete restrict,
  quantity int default 1 check (quantity > 0),
  unit_price decimal(10, 2) not null,
  selected_variants jsonb default '[]'::jsonb
);

create table if not exists public.restaurant_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding vector(1536)
);

-- Atomic checkout stored procedure
create or replace function public.process_order(
  p_user_id uuid,
  p_total decimal,
  p_delivery_fee decimal,
  p_payment_method text,
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_items jsonb
)
returns uuid language plpgsql as $$
declare
  v_wallet_id uuid;
  v_balance decimal;
  v_order_id uuid;
  v_item jsonb;
begin
  if p_payment_method = 'wallet' then
    select id, balance into v_wallet_id, v_balance 
    from public.wallets where user_id = p_user_id for update;

    if v_balance < (p_total + p_delivery_fee) then
      raise exception 'Insufficient wallet balance.';
    end if;

    update public.wallets set balance = balance - (p_total + p_delivery_fee) where id = v_wallet_id;

    insert into public.wallet_transactions (wallet_id, amount, type, description)
    values (v_wallet_id, -(p_total + p_delivery_fee), 'order_payment', 'Food order payment');
  end if;

  insert into public.orders (
    user_id, total_amount, delivery_fee, payment_method, 
    customer_name, customer_phone, customer_email, delivery_address, status
  )
  values (
    p_user_id, p_total, p_delivery_fee, p_payment_method,
    p_name, p_phone, p_email, p_address, 'received'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, menu_item_id, quantity, unit_price, selected_variants)
    values (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'price')::decimal,
      coalesce(v_item->'variants', '[]'::jsonb)
    );
  end loop;

  return v_order_id;
end;
$$;

-- 3. SEED CATEGORIES (Short Readable IDs)
insert into public.categories (id, name, slug, sort_order) values
  ('cat_burgers', 'Burgers', 'burgers', 1),
  ('cat_broast', 'Broast & Chicken', 'broast-chicken', 2),
  ('cat_shawarma', 'Shawarmas & Wraps', 'shawarmas-wraps', 3),
  ('cat_fries', 'Loaded Fries & Starters', 'loaded-fries', 4),
  ('cat_pizza', 'Pizzas & Calzones', 'pizzas-calzones', 5),
  ('cat_paratha', 'Paratha Rolls', 'paratha-rolls', 6),
  ('cat_wings', 'Wings & Tenders', 'wings-tenders', 7),
  ('cat_drinks', 'Chilled Drinks', 'drinks-beverages', 8),
  ('cat_dips', 'Dips & Sauces', 'dips-sauces', 9),
  ('cat_desserts', 'Desserts & Shakes', 'desserts-shakes', 10)
on conflict (id) do nothing;

-- 4. SEED DETAILED MENU ITEMS
insert into public.menu_items (category_id, sub_category, name, description, price, image_url, variants) values
-- Category: Burgers
('cat_burgers', 'Crispy Zingers', 'Ultimate Crispy Zinger', 'Crispy fillet, iceberg lettuce, signature mayo.', 550.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', '[{"name": "Add Cheese", "price": 80}]'::jsonb),
('cat_burgers', 'Smashed Beef', 'Double Smash Beef Burger', 'Dual 100g beef patties, caramelized onions, cheddar.', 890.00, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_burgers', 'Chapli/Desi Fusion', 'Smoky Chapli Fusion Burger', 'Spiced minced beef patty with grilled tomato, mint chutney.', 620.00, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_burgers', 'Double-Decker Stacks', 'Amir Grand Monster Stack', 'Dual fillets, double cheese, onion rings, chipotle drizzle.', 980.00, 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_burgers', 'Grilled Chicken Fillet', 'Flame Peri-Peri Grilled Burger', 'Juicy grilled fillet marinated in peri-peri spices.', 640.00, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Broast & Chicken
('cat_broast', 'Quarter Broast (Chest)', 'Golden Quarter Chest Broast', 'Pressure-fried chicken, crinkle fries, dinner bun, garlic dip.', 680.00, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_broast', 'Quarter Broast (Leg)', 'Juicy Quarter Leg Broast', 'Crispy chicken leg piece, crinkle fries, bun, garlic paste.', 640.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_broast', 'Half/Full Family Buckets', '8-Piece Family Broast Bucket', '8 pieces crispy broast, 4 buns, large fries, 3 dips.', 1850.00, 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_broast', 'Spicy Masala Broast', 'Lahori Masala Crispy Broast', 'Hot broast dusted in chaat masala and red chili spices.', 690.00, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_broast', 'Golden Crispy Strips', 'Boneless Chicken Tenders (5 Pcs)', 'Whole white meat tenders fried golden with dipping sauce.', 480.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Shawarmas & Wraps
('cat_shawarma', 'Classic Arabic Pita Shawarma', 'Authentic Arabic Chicken Shawarma', 'Spit-roasted chicken, pickles, garlic toum sauce in pita.', 320.00, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_shawarma', 'Jumbo Tortilla Zinger Wrap', 'Zinger Twister Wrap', 'Zinger strips, lettuce, pepper mayo in 10-inch tortilla.', 520.00, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_shawarma', 'Cheese-Loaded Shawarma', 'Melted Mozzarella Shawarma Roll', 'Chicken shawarma baked with melted mozzarella and olives.', 440.00, 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_shawarma', 'Open Rice-Bowl Shawarma Platter', 'Arabic Shawarma Platter on Rice', 'Spit-roasted chicken over basmati rice with pita wedges.', 690.00, 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_shawarma', 'Grilled Tikka Roll Wrap', 'Charcoal Chicken Tikka Wrap', 'Charcoal chicken tikka boti cubes wrapped in thin pita.', 360.00, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Loaded Fries & Starters
('cat_fries', 'Pizza Fries', 'Supreme Cheese Pizza Fries', 'Crinkle fries, marinara, tikka chunks, jalapeños, baked mozzarella.', 750.00, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_fries', 'Garlic Mayo Fries', 'Loaded Garlic Mayo Crinkle Fries', 'Crinkle fries tossed in peri salt and signature garlic mayo.', 450.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_fries', 'Jalapeño Nacho Fries', 'Fiery Nacho Cheese Fries', 'Fries drenched in hot cheddar nacho cheese and jalapeños.', 580.00, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_fries', 'Mozzarella Cheese Sticks', 'Crispy Mozzarella Sticks (4 Pcs)', 'Stretchy mozzarella sticks with Italian marinara dip.', 490.00, 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_fries', 'Fried Chicken Nuggets', 'Golden Chicken Nuggets (6 Pcs)', 'Crispy bite-sized seasoned nuggets with tomato dip.', 380.00, 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Pizzas & Calzones
('cat_pizza', 'Crown Crust', '10-inch Royal Crown Crust Chicken Fajita', 'Stretched dough with cream cheese crown pockets & fajita chicken.', 1150.00, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_pizza', 'Chicken Fajita & Tikka', 'Classic Chicken Tikka Feast (Medium)', 'Tandoori chicken tikka, onions, tomatoes, and mozzarella.', 950.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_pizza', 'Stuffed Cheesy Calzones', 'Smoky BBQ Chicken Calzone Pocket', 'Folded pizza pocket with BBQ chicken, onions, and cheese.', 650.00, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_pizza', 'Cheesy Pepperoni', 'Beef Pepperoni Delight', 'Loaded with beef pepperoni slices and double mozzarella.', 1100.00, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_pizza', 'Peri-Peri Pan Pizzas', 'Spicy African Peri-Peri Pan Pizza', 'Spicy peri chicken, bird eye chilies, and peri sauce.', 980.00, 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Paratha Rolls
('cat_paratha', 'Crispy Puri Paratha Chicken Tikka', 'Karachi Style Chicken Chatpata Roll', 'Flaky puri paratha with charcoal chicken tikka boti & chutney.', 320.00, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_paratha', 'Zinger Paratha Roll', 'Crispy Zinger Puri Paratha Roll', 'Crispy zinger fillet strips wrapped in butter paratha with mayo.', 380.00, 'https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_paratha', 'Beef Bihari Boti Roll', 'Melt-in-Mouth Beef Bihari Roll', 'Tender beef bihari threads grilled and rolled with onions.', 450.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_paratha', 'Garlic Mayo Egg Roll', 'Cheesy Egg Mayo Paratha Roll', 'Fried egg, spiced potato hash, cheese, and garlic mayo.', 280.00, 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_paratha', 'Malai Boti Roll', 'Creamy Reshmi Malai Boti Roll', 'Chicken cubes marinated in cream and cashews, grilled tender.', 410.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Wings & Tenders
('cat_wings', 'Buffalo Wings', 'Fiery Buffalo Wings (6 Pcs)', 'Wings tossed in cayenne hot sauce with ranch dip.', 480.00, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_wings', 'Sweet BBQ Glazed', 'Smoky Honey BBQ Wings (6 Pcs)', 'Crispy wings coated in sticky honey BBQ glaze with sesames.', 490.00, 'https://images.unsplash.com/photo-1527477321005-4d45d314bc33?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_wings', 'Honey Mustard Crispy Tenders', 'Honey Mustard Tenders (4 Pcs)', 'Panko-breaded breast strips glazed with honey mustard.', 420.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_wings', 'Ghost Pepper Extra Spicy', 'Daredevil Ghost Pepper Wings (6 Pcs)', 'Seasoned with real smoked bhut jolokia ghost peppers.', 540.00, 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_wings', 'Garlic Parmesan Wings', 'Buttery Garlic Parmesan Wings (6 Pcs)', 'Fried wings tossed in garlic butter and aged parmesan.', 520.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Chilled Drinks
('cat_drinks', 'Single-Serve Cans (250ml)', 'Chilled Soda Can (250ml)', 'Refreshing carbonated soft drink served ice-cold.', 120.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', '[{"name": "Cola", "price": 0}, {"name": "Sprite", "price": 0}]'::jsonb),
('cat_drinks', 'Medium Bottles (500ml)', 'Chilled Soda Bottle (500ml)', 'Handy 500ml PET bottle for meals on the go.', 180.00, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80', '[{"name": "Cola", "price": 0}, {"name": "Sprite", "price": 0}]'::jsonb),
('cat_drinks', 'Family Bottles (1.5L)', 'Family Soda Bottle (1.5L)', '1.5-liter bottle for group and family meals.', 280.00, 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', '[{"name": "Cola", "price": 0}, {"name": "Sprite", "price": 0}]'::jsonb),
('cat_drinks', 'Fresh Mint Lemonade', 'Special Iced Mint Margarita', 'Fresh lemon juice blended with garden mint and crushed ice.', 250.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_drinks', 'Mineral Water', 'Pure Mineral Spring Water (500ml)', 'Clean drinking water with balanced minerals.', 80.00, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Dips & Sauces
('cat_dips', 'Signature Garlic Mayo Dip', 'Amir Secret Garlic Mayo Tub (75ml)', 'Homemade emulsion of crushed garlic and creamy mayo.', 70.00, 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_dips', 'Spicy Chipotle Sauce', 'Smoky Chipotle Dipping Sauce (75ml)', 'Smoked jalapeños blended with cream and roasted cumin.', 80.00, 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_dips', 'Honey Mustard Dip', 'Creamy Honey Mustard Cup', 'Tangy yellow mustard blended with honey.', 70.00, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_dips', 'Extra Cheddar Cheese Slice', 'Real Melted Cheddar Slice', 'Warm golden dairy cheddar slice for any item.', 80.00, 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_dips', 'Brioche/Dinner Bun', 'Toasted Butter Dinner Bun', 'Soft bakery dinner bun brushed with melted butter.', 50.00, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),

-- Category: Desserts & Shakes
('cat_desserts', 'Thick Belgian Chocolate Shakes', 'Belgian Double Chocolate Shake', 'Dark chocolate ganache blended with premium vanilla cream.', 480.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_desserts', 'Oreo Cookie Krush', 'Oreo Krush Monster Thickshake', 'Crushed whole Oreos blended with chocolate fudge drizzle.', 490.00, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_desserts', 'Lotus Biscoff Frappe', 'Caramelized Lotus Biscoff Shake', 'Speculoos Biscoff spread blended with biscuit crumbs.', 550.00, 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_desserts', 'Warm Molten Lava Cake', 'Belgian Molten Chocolate Lava Cake', 'Warm chocolate cake with a molten core that flows.', 420.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', '[]'::jsonb),
('cat_desserts', 'Soft-Serve Cones', 'Crispy Waffle Chocolate Cone', 'Vanilla-chocolate soft-serve on a crispy waffle cone.', 180.00, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', '[]'::jsonb);

-- 5. REALTIME REPLICATION
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.wallets;