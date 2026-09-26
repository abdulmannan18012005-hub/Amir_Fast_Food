import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import type { Category, MenuItem } from '../types';

export const getCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
    
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data as Category[];
});

export const getMenuItems = createServerFn({ method: "GET" }).validator((d: string | undefined) => d).handler(async ({ data: categoryId }): Promise<MenuItem[]> => {
  const supabase = getSupabaseServer();
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
    return [];
  }
  return data as MenuItem[];
});

export const searchMenuItems = createServerFn({ method: "GET" }).validator((d: string) => d).handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {
  if (!searchQuery) return [];
  const supabase = getSupabaseServer();
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sub_category.ilike.%${searchQuery}%`);
    
  if (error) {
    console.error('Error searching menu items:', error);
    return [];
  }
  return data as MenuItem[];
});
