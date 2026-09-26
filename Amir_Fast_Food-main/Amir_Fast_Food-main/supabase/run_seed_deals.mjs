import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

async function seed() {
  console.log('--- SEEDING 20 COMBO DEALS ---');

  // 1. Upsert the deals category
  const { error: catError } = await supabase
    .from('categories')
    .upsert({ id: 'cat_deals', name: 'Special Deals & Combos', slug: 'deals', sort_order: 99 }, { onConflict: 'id' });
  
  if (catError) {
    console.error('Category insert error:', catError.message);
    return;
  }
  console.log('✅ Category cat_deals upserted.');

  // 2. Insert 20 combo deals
  const deals = [
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 1 - Solo Zinger Combo', description: '1 Crispy Zinger + Regular Fries + 345ml Drink', price: 620, image_url: '/images/deals/deal01.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Duo Combos', name: 'Deal 2 - Double Trouble', description: '2 Crispy Zingers + 1 Large Fries + 2 Drinks', price: 1199, image_url: '/images/deals/deal02.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Duo Combos', name: 'Deal 3 - Buddy Patty Pack', description: '2 Beef Smash Burgers + Cheesy Fries + 2 Drinks', price: 1350, image_url: '/images/deals/deal03.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 4 - Crispy Broast Feast', description: '1 Quarter Broast (Leg/Chest) + Bun + Garlic Dip + 345ml Drink', price: 550, image_url: '/images/deals/deal04.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Family Platters', name: 'Deal 5 - Family Broast Bucket', description: '8 Pcs Crispy Chicken + 4 Buns + Large Fries + 1.5L Drink', price: 2299, image_url: '/images/deals/deal05.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 6 - Midnight Craver', description: '1 Chicken Chapli Burger + 1 Cold Drink', price: 380, image_url: '/images/deals/deal06.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 7 - Mega Crunch Box', description: '1 Zinger + 2 Pcs Hot Wings + Regular Fries + Drink', price: 799, image_url: '/images/deals/deal07.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 8 - Pizza Burger Mashup', description: '1 Gourmet Pizza Burger + Curly Fries + Drink', price: 720, image_url: '/images/deals/deal08.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 9 - Loaded Fries Bonanza', description: '1 Large Chicken Cheesy Loaded Fries + 2 Drinks', price: 750, image_url: '/images/deals/deal09.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Duo Combos', name: 'Deal 10 - Wing It Combo', description: '10 Pcs Buffalo Hot Wings + Ranch Dip + 2 Drinks', price: 899, image_url: '/images/deals/deal10.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 11 - Student Pocket Saver', description: '1 Egg Shami Burger + 345ml Drink', price: 250, image_url: '/images/deals/deal11.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Duo Combos', name: 'Deal 12 - Twin Beef Delight', description: '2 Classic Beef Cheeseburgers + Medium Fries + 2 Drinks', price: 1250, image_url: '/images/deals/deal12.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 13 - Tender Strips Platter', description: '6 Pcs Crispy Chicken Tenders + Honey Mustard + Fries + Drink', price: 699, image_url: '/images/deals/deal13.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Duo Combos', name: 'Deal 14 - Rolls Mania Duo', description: '2 Malai Boti Paratha Rolls + 2 Drinks', price: 640, image_url: '/images/deals/deal14.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 15 - Spicy Zinger Stack', description: '1 Double Decker Zinger + Regular Fries + Drink', price: 820, image_url: '/images/deals/deal15.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Family Platters', name: 'Deal 16 - Party Platter 1', description: '4 Zingers + 10 Wings + 2 Jumbo Fries + 1.5L Drink', price: 2799, image_url: '/images/deals/deal16.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Family Platters', name: 'Deal 17 - Party Platter 2', description: '3 Beef Burgers + 3 Chicken Burgers + 1.5L Drink', price: 3150, image_url: '/images/deals/deal17.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 18 - Fish Burger Catch', description: '1 Crispy Fish Burger + Tartar Sauce + Fries + Drink', price: 690, image_url: '/images/deals/deal18.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Solo Combos', name: 'Deal 19 - Snack Attack', description: '4 Pcs Nuggets + 4 Pcs Hot Wings + Dip + 1 Drink', price: 520, image_url: '/images/deals/deal19.webp', is_available: true, variants: [] },
    { category_id: 'cat_deals', sub_category: 'Family Platters', name: 'Deal 20 - Ultimate Amir Feast', description: '2 Zingers + 2 Beef Burgers + 4 Broast Pcs + 4 Drinks', price: 3499, image_url: '/images/deals/deal20.webp', is_available: true, variants: [] },
  ];

  const { data, error: insertError } = await supabase
    .from('menu_items')
    .insert(deals)
    .select('id, name, price');

  if (insertError) {
    console.error('Deals insert error:', insertError.message);
    return;
  }

  console.log(`✅ Successfully seeded ${data.length} combo deals:`);
  data.forEach(d => console.log(`   ${d.name} — PKR ${d.price}`));

  // Verify total count
  const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('category_id', 'cat_deals');
  console.log(`\n📊 Total deals in cat_deals: ${count}`);

  process.exit(0);
}

seed();
