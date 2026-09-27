import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const badUrls = [
  'https://images.unsplash.com/photo-1604381536171-482433f02eeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1626804475297-4160cb6cb9fc?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1626082895617-2c6b4122cc0d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1594221708734-ea4b0e4d45c0?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1648809139265-d0c3eb17bca8?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1569691105775-4acf8c3395c8?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1606850780554-b55ea44fce10?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1576107248386-36940fb9c7b9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1630431341973-02e1b662ce40?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1599863456886-c40d7c50a0ec?auto=format&fit=crop&w=400&q=80'
];

const fallbackImg = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80';

async function fixBadUrls() {
  for (const bad of badUrls) {
    const res = await fetch(`${URL}/rest/v1/menu_items?image_url=eq.${encodeURIComponent(bad)}`, {
      method: 'PATCH',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ image_url: fallbackImg })
    });
    console.log(`Replaced bad URL ${bad.slice(0,40)}... Status: ${res.status}`);
  }
}

fixBadUrls();
