import dotenv from 'dotenv';
dotenv.config();
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
fetch(URL + '/rest/v1/categories', { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } })
  .then(res => res.json())
  .then(console.log);
