import { createServerFn } from '@tanstack/react-start';
import { supabaseBrowser } from '../lib/supabase';
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

  if (!data || data.length === 0) {
    return [
      { id: 'cat_burgers', name: 'Burgers', slug: 'burgers', sort_order: 1 },
      { id: 'cat_deals', name: 'Deals & Combos', slug: 'deals', sort_order: 2 },
      { id: 'cat_shawarma', name: 'Shawarma', slug: 'shawarma', sort_order: 3 }
    ];
  }

  return data as Category[];
});

export const getMenuItems = createServerFn({ method: "GET" }).validator((d: string | undefined) => d).handler(async ({ data: categoryId }): Promise<MenuItem[]> => {
  const supabase = supabaseBrowser;
  let query = supabase
    .from('menu_items')
    .select('id, category_id, sub_category, name, description, price, original_price, image_url, variants, is_available, created_at')
    .eq('is_available', true);
    
  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching menu items:', error);
  }
  
  
  if (!data || data.length === 0) {
    return [
      { id: '1', category_id: 'cat_burgers', sub_category: 'Smash & Zinger', name: 'Ultimate Crispy Zinger', description: 'Double crispy chicken fillet, cheese, jalapeños, and our secret Amir sauce.', price: 550, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '2', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 1 - Solo', description: '1 Zinger Burger, 1 Regular Fries, 1 Regular Drink.', price: 799, original_price: 950, image_url: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '3', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Classic Chicken Shawarma', description: 'Juicy chicken, pickles, and garlic sauce wrapped in fresh pita.', price: 250, image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '4', category_id: 'cat_burgers', sub_category: 'Beef', name: 'Gourmet Smash Burger', description: 'Double smashed beef patties with caramelized onions and cheddar.', price: 650, image_url: 'https://amirfastfood.vercel.app/assets/food-burger-B13oD7Kh.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '5', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 2 - Couple', description: '2 Zinger Burgers, 1 Large Fries, 2 Regular Drinks.', price: 1499, original_price: 1800, image_url: 'https://amirfastfood.vercel.app/assets/food-combo-BbZhBSG3.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '6', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Platter Shawarma', description: 'Open faced shawarma with extra meat, hummus, and pita.', price: 450, image_url: 'https://amirfastfood.vercel.app/assets/food-shawarma-0HL7THD0.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
      { id: '7', category_id: 'cat_deals', sub_category: 'Party', name: 'Family Fiesta', description: '4 Burgers, 2 Shawarmas, 1 Family Fries, 1.5L Drink.', price: 2999, original_price: 3500, image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() }
    ];
  }

  return data as MenuItem[];
});

export const searchMenuItems = createServerFn({ method: "GET" }).validator((d: string) => d).handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {
  if (!searchQuery) return [];
  const supabase = supabaseBrowser;
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sub_category.ilike.%${searchQuery}%`);
    
  if (error) {
    console.error('Error searching menu items:', error);
  }
  
  if (!data || data.length === 0) {
      const mock = [
        { id: '1', category_id: 'cat_burgers', sub_category: 'Smash & Zinger', name: 'Ultimate Crispy Zinger', description: 'Double crispy chicken fillet, cheese, jalapeños, and our secret Amir sauce.', price: 550, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '2', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 1 - Solo', description: '1 Zinger Burger, 1 Regular Fries, 1 Regular Drink.', price: 799, original_price: 950, image_url: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '3', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Classic Chicken Shawarma', description: 'Juicy chicken, pickles, and garlic sauce wrapped in fresh pita.', price: 250, image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '4', category_id: 'cat_burgers', sub_category: 'Beef', name: 'Gourmet Smash Burger', description: 'Double smashed beef patties with caramelized onions and cheddar.', price: 650, image_url: 'https://amirfastfood.vercel.app/assets/food-burger-B13oD7Kh.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '5', category_id: 'cat_deals', sub_category: 'Family Deals', name: 'Deal 2 - Couple', description: '2 Zinger Burgers, 1 Large Fries, 2 Regular Drinks.', price: 1499, original_price: 1800, image_url: 'https://amirfastfood.vercel.app/assets/food-combo-BbZhBSG3.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '6', category_id: 'cat_shawarma', sub_category: 'Authentic Arab', name: 'Platter Shawarma', description: 'Open faced shawarma with extra meat, hummus, and pita.', price: 450, image_url: 'https://amirfastfood.vercel.app/assets/food-shawarma-0HL7THD0.jpg', variants: [], is_available: true, created_at: new Date().toISOString() },
        { id: '7', category_id: 'cat_deals', sub_category: 'Party', name: 'Family Fiesta', description: '4 Burgers, 2 Shawarmas, 1 Family Fries, 1.5L Drink.', price: 2999, original_price: 3500, image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', variants: [], is_available: true, created_at: new Date().toISOString() }
      ];
      const q = searchQuery.toLowerCase();
      return mock.filter(m => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
  }

  return data as MenuItem[];
});
