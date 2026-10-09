import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
  process.exit(1);
}

class DummyWS {
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const supabase = createClient(supabaseUrl, anonKey, {
  realtime: { transport: DummyWS }
});

async function checkReadOnlyAnonAccess() {
  console.log('=== Supabase Anon Key READ-ONLY Access Audit ===\n');

  // 1. Menu items (Public: should succeed)
  const { data: menuData, error: err1 } = await supabase.from('menu_items').select('id, name').limit(1);
  if (!err1 && menuData) {
    console.log('✅ menu_items: Anon can read (Expected for public menu)');
  } else {
    console.log('⚠️ menu_items: Failed to read:', err1?.message);
  }

  // 2. Categories (Public: should succeed)
  const { data: catData, error: err2 } = await supabase.from('categories').select('id, name').limit(1);
  if (!err2 && catData) {
    console.log('✅ categories: Anon can read (Expected for public menu)');
  } else {
    console.log('⚠️ categories: Failed to read:', err2?.message);
  }

  // 3. Orders (Private: anon should NOT be able to select all orders)
  const { data: ordersData, error: err3 } = await supabase.from('orders').select('id, customer_name, customer_phone').limit(1);
  if (err3) {
    console.log('🔒 orders: Anon read BLOCKED by RLS policy (Secure):', err3.message);
  } else if (!ordersData || ordersData.length === 0) {
    console.log('ℹ️ orders: Anon query returned 0 rows (RLS policy filters data or table empty)');
  } else {
    console.log('⚠️ orders: Anon can read orders (RLS migration needs to be applied by owner)');
  }

  // 4. Push Subscriptions (Private: anon should NOT read other subscriptions)
  const { data: subsData, error: err4 } = await supabase.from('push_subscriptions').select('id, endpoint').limit(1);
  if (err4) {
    console.log('🔒 push_subscriptions: Anon read BLOCKED by RLS policy (Secure):', err4.message);
  } else if (!subsData || subsData.length === 0) {
    console.log('ℹ️ push_subscriptions: Anon query returned 0 rows (RLS filtered or empty)');
  } else {
    console.log('⚠️ push_subscriptions: Anon can read rows (RLS migration needs to be applied by owner)');
  }

  console.log('\nAudit complete. No write or mutation operations were executed.');
}

checkReadOnlyAnonAccess();
