import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function seed() {
  console.log("Deleting orders...");
  await fetch(`${URL}/rest/v1/order_items?id=not.is.null`, { method: 'DELETE', headers });
  await fetch(`${URL}/rest/v1/orders?id=not.is.null`, { method: 'DELETE', headers });
  console.log("Deleting old menu items...");
  let res = await fetch(`${URL}/rest/v1/menu_items?id=not.is.null0000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
  if (!res.ok) console.error(await res.text());

  console.log("Deleting old categories...");
  res = await fetch(`${URL}/rest/v1/categories?id=not.is.null`, { method: 'DELETE', headers });
  if (!res.ok) console.error(await res.text());

  console.log("Inserting categories...");
  const categories = [
    { "id": 'cat_deals', "name": 'Deals & Combos', "slug": 'deals', "sort_order": 1 },
    { "id": 'cat_specials', "name": 'Specials', "slug": 'specials', "sort_order": 2 },
    { "id": 'cat_burgers', "name": 'Burgers', "slug": 'burgers', "sort_order": 3 },
    { "id": 'cat_shawarma', "name": 'Shawarma & Paratha', "slug": 'shawarma', "sort_order": 4 },
    { "id": 'cat_pizza', "name": 'Pizza', "slug": 'pizza', "sort_order": 5 },
    { "id": 'cat_chicken', "name": 'Chicken & Wings', "slug": 'chicken', "sort_order": 6 },
    { "id": 'cat_sandwiches_fries', "name": 'Sandwiches & Fries', "slug": 'sandwiches-fries', "sort_order": 7 },
    { "id": 'cat_drinks', "name": 'Drinks', "slug": 'drinks', "sort_order": 8 }
  ];
  res = await fetch(`${URL}/rest/v1/categories`, { method: 'POST', body: JSON.stringify(categories), headers });
  if (!res.ok) console.error(await res.text());

  console.log("Inserting menu items...");
  const img = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80';
  const menuItems = [
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 1', description: '1 Zinger Burger, Reg Fries, Coke', price: 550, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 2', description: '6 Hot Wings, Reg Fries, Coke', price: 550, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 3', description: '1 Sandwich, 1 Reg Fries, Reg Coke', price: 600, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 4', description: '1 Pratha Roll, Reg Fries, Reg Coke', price: 580, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 5', description: '2 Zinger Burger, Reg Fries, 0.5 Lt Coke', price: 940, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 6', description: '1 Zinger, 1 Full Wing, Reg Fries, Reg Coke', price: 700, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 7', description: '1 Small Pizza, 0.5 Litter Coke', price: 650, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 8', description: '1 Zinger, 1 Chicken Chapli Burger, Reg Fries, 0.5 Coke', price: 850, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 9', description: 'Nuggets, 2 Zinger, 0.5 Litter Coke', price: 1050, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 10', description: '1 Small Pizza, 1 Zinger, 0.5 Coke', price: 1000, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 11', description: '1 Zinger Burger, 1 Pratha Roll, Reg Fries, 0.5 Coke', price: 950, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 12', description: '2 Small Pizza, 1 Litter Coke', price: 1200, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 13', description: '3 Zinger Burger, Reg Fries, 1 Lt Coke', price: 1300, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 14', description: '1 Medium Pizza, 1 Litter Coke', price: 1200, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 15', description: '5 Zinger, 1 Family Fries, 1.5 Coke', price: 2000, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 16', description: '1 Large Pizza, 1.5 Litter Coke', price: 1700, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 17', description: '2 Medium Pizza, 1.5 Litter Coke', price: 2150, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 18', description: '2 Large Pizza, Jumbo Coke', price: 3100, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 19', description: '1 Small Pizza, 6 pcs Hotwing, 1 Reg Fries, 0.5 Coke', price: 1150, is_available: true, image_url: img },
    { category_id: 'cat_deals', sub_category: 'Deals', name: 'Deal 20', description: '2 Zinger, 6 Pc Hot Wings, 0.5 Coke, Reg Fries', price: 1250, is_available: true, image_url: img },

    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Tikka Boti Shawarma', description: '', price: 320, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Malai Boti Shawarma', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Chicken Grill Burger', description: '', price: 400, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Chicken Grill Burger Special', description: 'With Fries', price: 550, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Chicken Grilled Sandwich', description: '', price: 600, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Pizza Burger', description: 'With Fries', price: 550, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Duble Masti Burger', description: 'With Fries', price: 550, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Oven Back Pasta - Small', description: '', price: 400, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Oven Back Pasta - Large', description: '', price: 700, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Loaded Fries - Small', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_specials', sub_category: 'Specials', name: 'Loaded Fries - Large', description: '', price: 650, is_available: true, image_url: img },

    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Zinger Burger', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Chicken Patty Cheese', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'B.B.Q Burger', description: '', price: 400, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Double Patty + Cheese', description: '', price: 500, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Chicken Patty', description: '', price: 300, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Chicken Chapli Burger', description: '', price: 300, is_available: true, image_url: img },
    { category_id: 'cat_burgers', sub_category: 'Burgers', name: 'Amir\'s Sp Burger', description: '', price: 550, is_available: true, image_url: img },

    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Zinger Shawarma', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Chicken Shawarma - Small', description: '', price: 150, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Chicken Shawarma - Medium', description: '', price: 200, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Chicken Shawarma - Large', description: '', price: 250, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Plater Shawarma', description: '', price: 600, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'B.B.Q Paratha', description: '', price: 380, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Twister Roll', description: '', price: 380, is_available: true, image_url: img },
    { category_id: 'cat_shawarma', sub_category: 'Shawarma', name: 'Kabab Paratha', description: '', price: 380, is_available: true, image_url: img },

    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'Full Wings', description: '', price: 120, is_available: true, image_url: img },
    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'B.B.Q Wings', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'Hot wings (6pcs)', description: '', price: 350, is_available: true, image_url: img },
    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'Chicken piece', description: '', price: 300, is_available: true, image_url: img },
    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'Nugets (6pc)', description: '', price: 300, is_available: true, image_url: img },
    { category_id: 'cat_chicken', sub_category: 'Chicken', name: 'Hot Shot', description: '', price: 500, is_available: true, image_url: img },

    { category_id: 'cat_sandwiches_fries', sub_category: 'Sandwiches', name: 'Club Sandwich', description: '', price: 400, is_available: true, image_url: img },
    { category_id: 'cat_sandwiches_fries', sub_category: 'Fries', name: 'Reg French Fries', description: '', price: 150, is_available: true, image_url: img },
    { category_id: 'cat_sandwiches_fries', sub_category: 'Fries', name: 'Family French Fries', description: '', price: 300, is_available: true, image_url: img },

    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Coke Reg.NR', description: '', price: 80, is_available: true, image_url: img },
    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Coke 0.5L', description: '', price: 120, is_available: true, image_url: img },
    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Coke 1.5L', description: '', price: 200, is_available: true, image_url: img },
    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Coke 2.25L', description: '', price: 250, is_available: true, image_url: img },
    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Water 0.5L', description: '', price: 60, is_available: true, image_url: img },
    { category_id: 'cat_drinks', sub_category: 'Drinks', name: 'Water 1.5L', description: '', price: 100, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Tikka - Small', description: '', price: 450, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Tikka - Medium', description: '', price: 900, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Tikka - Large', description: '', price: 1300, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Fajitta - Small', description: '', price: 450, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Fajitta - Medium', description: '', price: 900, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Fajitta - Large', description: '', price: 1300, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Supreme - Small', description: '', price: 450, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Supreme - Medium', description: '', price: 900, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Classic', name: 'Chicken Supreme - Large', description: '', price: 1300, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Special', name: 'Malai Boti - Small', description: '', price: 600, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Special', name: 'Malai Boti - Medium', description: '', price: 1200, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Special', name: 'Malai Boti - Large', description: '', price: 1700, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Crown Crust - Small', description: '', price: 700, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Crown Crust - Medium', description: '', price: 1400, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Crown Crust - Large', description: '', price: 2000, is_available: true, image_url: img },

    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Amir Special - Small', description: '', price: 700, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Amir Special - Medium', description: '', price: 1400, is_available: true, image_url: img },
    { category_id: 'cat_pizza', sub_category: 'Premium', name: 'Amir Special - Large', description: '', price: 2000, is_available: true, image_url: img }
  ];

  res = await fetch(`${URL}/rest/v1/menu_items`, { method: 'POST', body: JSON.stringify(menuItems), headers });
  if (!res.ok) console.error(await res.text());

  console.log(`Successfully seeded ${categories.length} categories and ${menuItems.length} menu items!`);
}

seed().catch(console.error);
