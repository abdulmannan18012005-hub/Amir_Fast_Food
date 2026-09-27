import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function checkURLs() {
  const res = await fetch(`${URL}/rest/v1/menu_items?select=id,image_url`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const data = await res.json();
  
  const urls = [...new Set(data.map(d => d.image_url))];
  console.log(`Checking ${urls.length} unique URLs...`);
  
  for (const url of urls) {
    try {
      const imgRes = await fetch(url, { method: 'HEAD' });
      if (!imgRes.ok) {
        console.log(`BAD URL: ${url} (Status: ${imgRes.status})`);
      }
    } catch (e) {
      console.log(`ERROR on URL: ${url} - ${e.message}`);
    }
  }
  console.log('Done checking URLs.');
}

checkURLs();
