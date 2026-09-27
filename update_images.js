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

const imageMap = {
  'cat_pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  'cat_drinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
  'cat_deals': 'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=400&q=80',
  'cat_shawarma': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80',
  'cat_chicken': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80',
  'cat_sandwiches_fries': 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=400&q=80',
  'cat_burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
  'cat_specials': 'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=400&q=80'
};

async function updateImages() {
  for (const [cat, img] of Object.entries(imageMap)) {
    console.log(`Updating ${cat}...`);
    const res = await fetch(`${URL}/rest/v1/menu_items?category_id=eq.${cat}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ image_url: img })
    });
    if (!res.ok) {
      console.error(`Failed to update ${cat}:`, await res.text());
    }
  }
  console.log('Finished updating images!');
}

updateImages();
