-- AMIR FAST FOOD COMPLETE DATABASE SCHEMA
-- Generated from Supabase OpenAPI definition

CREATE TABLE public.restaurant_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text,
  embedding public.vector(1536)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  total_amount numeric,
  delivery_fee numeric,
  payment_method text,
  status text DEFAULT received,
  delivery_address text,
  customer_name text,
  customer_phone text,
  customer_email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  menu_item_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric,
  selected_variants jsonb
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  role text DEFAULT customer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  balance numeric DEFAULT 10000,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.categories (
  id text PRIMARY KEY,
  name text,
  slug text,
  sort_order integer
);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text,
  sub_category text,
  name text,
  description text,
  price numeric,
  image_url text,
  is_available boolean DEFAULT true,
  variants jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid,
  amount numeric,
  type text,
  description text,
  created_at timestamptz DEFAULT now()
);

