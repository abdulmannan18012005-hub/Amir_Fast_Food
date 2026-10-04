-- AMR Fast Food — web app v3 migration. Safe to run more than once. Take a backup first.

-- 1) Columns the code already uses or now needs
alter table public.orders add column if not exists rider_name text;
alter table public.orders add column if not exists rider_phone text;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists canceled_at timestamptz;
alter table public.orders add column if not exists status_changed_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();
alter table public.orders add column if not exists payment_trx_id text;
alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;
alter table public.orders add column if not exists distance_km numeric(6,2);
alter table public.orders add column if not exists distance_fee numeric(10,2) default 0;
alter table public.orders add column if not exists cod_fee numeric(10,2) default 0;
alter table public.orders alter column customer_email drop not null;

-- 2) Automatically keep updated_at / status_changed_at / canceled_at correct
create or replace function public.orders_touch_status() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status = 'canceled' and new.canceled_at is null then
      new.canceled_at := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_orders_touch_status on public.orders;
create trigger trg_orders_touch_status before update on public.orders
for each row execute function public.orders_touch_status();

-- 3) Push subscriptions (only the server / service role can read or write this table)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
create unique index if not exists push_sub_order_endpoint_uidx
  on public.push_subscriptions(order_id, endpoint) where order_id is not null;
create unique index if not exists push_sub_admin_endpoint_uidx
  on public.push_subscriptions(endpoint) where order_id is null;
create index if not exists push_sub_order_idx on public.push_subscriptions(order_id);
alter table public.push_subscriptions enable row level security;  -- no policies on purpose

-- 4) Realtime: add tables WITHOUT removing the ones already there
do $$
declare t text;
begin
  foreach t in array array['orders','menu_items','categories','restaurant_knowledge'] loop
    if to_regclass('public.' || t) is not null
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
