-- 1) RPCs: only the server (service role) may run process_order
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p
           where p.proname = 'process_order' and p.pronamespace = 'public'::regnamespace
  loop execute format('revoke all on function %s from public, anon, authenticated', r.sig); end loop;
end $$;

-- 2) RLS on every private table; NO policies = anon/authenticated can't read or write (service role bypasses RLS)
do $$ declare t text; begin
  foreach t in array array['orders','order_items','push_subscriptions','restaurant_knowledge',
                           'profiles','wallets','wallet_transactions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- 3) Public read-only tables (menu data only)
alter table public.menu_items enable row level security;
drop policy if exists "Public read menu_items" on public.menu_items;
create policy "Public read menu_items" on public.menu_items for select using (true);
alter table public.categories enable row level security;
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);
revoke insert, update, delete on public.menu_items, public.categories from anon, authenticated;

/* ROLLBACK:
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p
           where p.proname = 'process_order' and p.pronamespace = 'public'::regnamespace
  loop execute format('grant all on function %s to public, anon, authenticated', r.sig); end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['orders','order_items','push_subscriptions','restaurant_knowledge',
                           'profiles','wallets','wallet_transactions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I disable row level security', t);
      execute format('grant all on table public.%I to anon, authenticated', t);
    end if;
  end loop;
end $$;
*/
