import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  console.log('Testing anon access...');
  
  // 1. Should be able to read menu items
  const { error: err1 } = await supabase.from('menu_items').select('*').limit(1);
  console.log('Menu items read error:', err1?.message || 'None (Success)');
  
  // 2. Should NOT be able to read orders
  const { error: err2 } = await supabase.from('orders').select('*').limit(1);
  console.log('Orders read error:', err2?.message || 'None (VULNERABLE!)');
  
  // 3. Should NOT be able to update restaurant_knowledge
  const { error: err3 } = await supabase.from('restaurant_knowledge').update({ content: '{}' }).eq('title', 'category_images');
  console.log('Knowledge update error:', err3?.message || 'None (VULNERABLE!)');
}

test();
