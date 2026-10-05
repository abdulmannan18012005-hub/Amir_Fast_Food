import { createServerFn } from '@tanstack/react-start';
import { supabaseBrowser, getSupabaseServer } from '../lib/supabase';
import type { Category, MenuItem } from '../types';

export const getCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const supabase = supabaseBrowser;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
    
  if (error) {
    console.error('Error fetching categories:', error);
  }

  return data as Category[];
});

export const getMenuItems = createServerFn({ method: "GET" }).validator((d: string | undefined) => d).handler(async ({ data: categoryId }): Promise<MenuItem[]> => {
  const supabase = supabaseBrowser;
  let query = supabase
    .from('menu_items')
    .select('id, category_id, sub_category, name, description, price, image_url, variants, is_available, created_at')
    .eq('is_available', true);
    
  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching menu items:', error);
  }
  
  
  if (false) {
    return [
      { id: '1', category_id: 'cat_burgers', sub_category: 'Smash & Zinger', name: 'Ultimate Crispy Zinger', description: 'Double crispy chicken fillet, cheese, jalapeños, and our secret Amir sauce.', price: 550, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '2', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 1 - Solo', description: '1 Zinger Burger, 1 Regular Fries, 1 Regular Drink.', price: 799, original_price: 950, image_url: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '3', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Classic Chicken Shawarma', description: 'Juicy chicken, pickles, and garlic sauce wrapped in fresh pita.', price: 250, image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '4', category_id: 'cat_burgers', sub_category: 'Beef', name: 'Gourmet Smash Burger', description: 'Double smashed beef patties with caramelized onions and cheddar.', price: 650, image_url: 'https://amir-fast-food.vercel.app/assets/food-burger-B13oD7Kh.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '5', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 2 - Couple', description: '2 Zinger Burgers, 1 Large Fries, 2 Regular Drinks.', price: 1499, original_price: 1800, image_url: 'https://amir-fast-food.vercel.app/assets/food-combo-BbZhBSG3.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '6', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Platter Shawarma', description: 'Open faced shawarma with extra meat, hummus, and pita.', price: 450, image_url: 'https://amir-fast-food.vercel.app/assets/food-shawarma-0HL7THD0.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '7', category_id: 'cat_deals', sub_category: 'Party', name: 'Family Fiesta', description: '4 Burgers, 2 Shawarmas, 1 Family Fries, 1.5L Drink.', price: 2999, original_price: 3500, image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() }
    ];
  }

  return data as MenuItem[];
});

export const searchMenuItems = createServerFn({ method: "GET" }).validator((d: string) => d).handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {
  if (!searchQuery) return [];
  
  // Sanitize input: limit to 50 chars, remove special characters
  let cleanQuery = searchQuery.slice(0, 50).replace(/[,()%\*'"]/g, '').trim();
  if (!cleanQuery) return [];

  const supabase = supabaseBrowser;
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,sub_category.ilike.%${cleanQuery}%`);
    
  if (error) {
    console.error('Error searching menu items:', error);
  }
  
  return (data || []) as MenuItem[];
});

export const updateMenuItemFn = createServerFn({ method: "POST" }).validator((d: { id: string, price: number, image_url: string, pin?: string }) => d).handler(async ({ data }) => {
  const EXPECTED_PIN = process.env.ADMIN_PIN || '7864';
  if (data.pin !== EXPECTED_PIN) throw new Error("Unauthorized");
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('menu_items')
    .update({ price: data.price, image_url: data.image_url })
    .eq('id', data.id);
  if (error) {
    console.error('Error updating menu item:', error);
    throw new Error(error.message);
  }
  return { success: true };
});


export const getCategoryImagesFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('restaurant_knowledge').select('content').eq('title', 'category_images').maybeSingle();
  if (data && data.content) {
    try { return JSON.parse(data.content); } catch (e) {}
  }
  return {
    cat_deals: 'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=300&q=80',
    cat_specials: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
    cat_burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
    cat_shawarma: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80',
    cat_pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    cat_chicken: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
    cat_sandwiches_fries: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=300&q=80',
    cat_drinks: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80'
  };
});

export const updateCategoryImagesFn = createServerFn({ method: "POST" }).validator((d: { data: Record<string, string>, pin?: string }) => d).handler(async ({ data: payload }) => {
  const EXPECTED_PIN = process.env.ADMIN_PIN || '7864';
  if (payload.pin !== EXPECTED_PIN) throw new Error("Unauthorized");
  const data = payload.data;
  const supabase = getSupabaseServer();
  const { data: existing } = await supabase.from('restaurant_knowledge').select('id').eq('title', 'category_images').maybeSingle();
  if (existing) {
    await supabase.from('restaurant_knowledge').update({ content: JSON.stringify(data) }).eq('id', existing.id);
  } else {
    await supabase.from('restaurant_knowledge').insert({ title: 'category_images', content: JSON.stringify(data) });
  }
  return { success: true };
});

export const getHighlightImagesFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('restaurant_knowledge').select('content').eq('title', 'highlight_images').maybeSingle();
  if (data && data.content) {
    try { return JSON.parse(data.content); } catch (e) {}
  }
  return {
    hl_shawarma: 'https://amir-fast-food.vercel.app/assets/food-shawarma-0HL7THD0.jpg',
    hl_burger: 'https://amir-fast-food.vercel.app/assets/food-burger-B13oD7Kh.jpg',
    hl_combos: 'https://amir-fast-food.vercel.app/assets/food-combo-BbZhBSG3.jpg'
  };
});

export const updateHighlightImagesFn = createServerFn({ method: "POST" }).validator((d: { data: Record<string, string>, pin?: string }) => d).handler(async ({ data: payload }) => {
  const EXPECTED_PIN = process.env.ADMIN_PIN || '7864';
  if (payload.pin !== EXPECTED_PIN) throw new Error("Unauthorized");
  const data = payload.data;
  const supabase = getSupabaseServer();
  const { data: existing } = await supabase.from('restaurant_knowledge').select('id').eq('title', 'highlight_images').maybeSingle();
  if (existing) {
    await supabase.from('restaurant_knowledge').update({ content: JSON.stringify(data) }).eq('id', existing.id);
  } else {
    await supabase.from('restaurant_knowledge').insert({ title: 'highlight_images', content: JSON.stringify(data) });
  }
  return { success: true };
});
