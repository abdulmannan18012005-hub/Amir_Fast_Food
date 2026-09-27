import dotenv from 'dotenv';
dotenv.config();
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
fetch(URL + '/rest/v1/menu_items?is_available=eq.true', { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } })
  .then(res => res.json())
  .then(data => console.log('Items available:', data.length))
  .catch(console.error);
