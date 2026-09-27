import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function checkEmpty() {
  const res = await fetch(`${URL}/rest/v1/menu_items?select=id,name,image_url`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const data = await res.json();
  const bad = data.filter(d => !d.image_url || d.image_url.includes('undefined'));
  console.log('Bad items:', bad.length);
  if (bad.length > 0) console.log(bad);
}

checkEmpty();
