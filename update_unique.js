import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

const images = {
  cat_pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1604381536171-482433f02eeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1564936281291-294551497d81?auto=format&fit=crop&w=400&q=80',
  ],
  cat_burgers: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1594221708734-ea4b0e4d45c0?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1603064752734-4c48eff53d05?auto=format&fit=crop&w=400&q=80',
  ],
  cat_drinks: [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=400&q=80',
  ],
  cat_deals: [
    'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1626804475297-4160cb6cb9fc?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1626082895617-2c6b4122cc0d?auto=format&fit=crop&w=400&q=80',
  ],
  cat_shawarma: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1648809139265-d0c3eb17bca8?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1599863456886-c40d7c50a0ec?auto=format&fit=crop&w=400&q=80',
  ],
  cat_chicken: [
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1569691105775-4acf8c3395c8?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1606850780554-b55ea44fce10?auto=format&fit=crop&w=400&q=80',
  ],
  cat_sandwiches_fries: [
    'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1576107248386-36940fb9c7b9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1630431341973-02e1b662ce40?auto=format&fit=crop&w=400&q=80',
  ],
  cat_specials: [
    'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1594221708734-ea4b0e4d45c0?auto=format&fit=crop&w=400&q=80',
  ]
};

async function updateUniqueImages() {
  const res = await fetch(`${URL}/rest/v1/menu_items?select=id,category_id`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  
  if (!res.ok) {
    console.error('Failed to fetch items:', await res.text());
    return;
  }
  
  const items = await res.json();
  const indexMap = {};
  
  for (const item of items) {
    const cat = item.category_id;
    if (!indexMap[cat]) indexMap[cat] = 0;
    
    const catImages = images[cat] || images['cat_burgers'];
    const imgUrl = catImages[indexMap[cat] % catImages.length];
    indexMap[cat]++;
    
    console.log(`Updating item ${item.id} (${cat}) -> img ${indexMap[cat]}`);
    await fetch(`${URL}/rest/v1/menu_items?id=eq.${item.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ image_url: imgUrl })
    });
  }
  
  console.log('Successfully updated all 79 items with unique images!');
}

updateUniqueImages();
