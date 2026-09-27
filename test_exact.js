import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, KEY);

async function test() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, category_id, sub_category, name, description, price, original_price, image_url, variants, is_available, created_at')
    .eq('is_available', true);
  
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('SUCCESS, length:', data.length);
  }
}

test();
