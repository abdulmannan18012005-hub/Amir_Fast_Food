import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mnbuukffxvnmqqxqabkq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYnV1a2ZmeHZubXFxeHFhYmtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQxNzU0MywiZXhwIjoyMTA1OTkzNTQzfQ.yQvNU3nt86o1HGeruNet2supIHNArXKyHl-YIikB9cE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cats, error: e1 } = await supabase.from('categories').select('*');
  const { data: items, error: e2 } = await supabase.from('menu_items').select('*');
  console.log('Categories:', cats?.length, e1);
  console.log('Items:', items?.length, e2);
}
check();
