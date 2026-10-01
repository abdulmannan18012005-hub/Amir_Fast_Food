require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Fix typos
  const { data: items } = await supabase.from('menu_items').select('*');
  for (let item of items) {
    if (item.name.toLowerCase().includes('backpasta') || item.name.toLowerCase().includes('back pasta')) {
      const newName = item.name.replace(/back\s*pasta/i, 'Baked Pasta').replace(/backpasta/i, 'Baked Pasta');
      console.log(`Fixing: ${item.name} -> ${newName}`);
      await supabase.from('menu_items').update({ name: newName }).eq('id', item.id);
    }
  }

  // 2. Update Deals images (20 items)
  const { data: deals } = await supabase.from('menu_items').select('*').eq('category_id', 'cat_deals');
  
  // Sort deals by number
  deals.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/) || [0])[0];
    const numB = parseInt(b.name.match(/\d+/) || [0])[0];
    return numA - numB;
  });

  const dealImages = [
    "https://images.unsplash.com/photo-1594221708734-ea4b0e4d45c0?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1626082895617-2c6ab34758cb?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1605333396914-23cbddce037c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1610614819513-58e349898480?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1522878316139-4d6d601d3cb2?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1603064752734-4c48eff53d05?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1561758033-7e924f619b47?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1525268323446-0505b6fea774?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1606131731446-5568d87113aa?auto=format&fit=crop&w=600&q=80"
  ];

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];
    const newImage = dealImages[i % dealImages.length];
    console.log(`Updating ${deal.name} image`);
    await supabase.from('menu_items').update({ image_url: newImage }).eq('id', deal.id);
  }
  
  console.log("Done");
}

run();
