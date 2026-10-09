import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin } from './auth';
import { getSupabaseServer } from '../lib/supabase';
import { toSafeError } from './errors';
import type { Category, MenuItem } from '../types';

export const getCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
      
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []) as Category[];
  } catch (err) {
    console.error('getCategories error:', err);
    return [];
  }
});

export const getMenuItems = createServerFn({ method: "GET" })
  .validator((d: string | undefined) => d)
  .handler(async ({ data: categoryId }): Promise<MenuItem[]> => {
    try {
      const supabase = getSupabaseServer();
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
        return [];
      }

      return (data || []) as MenuItem[];
    } catch (err) {
      console.error('getMenuItems error:', err);
      return [];
    }
  });

export const searchMenuItems = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {
    if (!searchQuery) return [];
    
    let cleanQuery = searchQuery.slice(0, 50).replace(/[,()%\*'"]/g, '').trim();
    if (!cleanQuery) return [];

    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,sub_category.ilike.%${cleanQuery}%`);
        
      if (error) {
        console.error('Error searching menu items:', error);
        return [];
      }
      
      return (data || []) as MenuItem[];
    } catch (err) {
      console.error('searchMenuItems error:', err);
      return [];
    }
  });

export const updateMenuItemFn = createServerFn({ method: "POST" })
  .validator((d: { id: string, price: number, image_url: string, is_available?: boolean, pin?: string }) => d)
  .handler(async ({ data }) => {
    try {
      verifyAdminPin(data.pin);
      const supabase = getSupabaseServer();
      const updateData: any = { price: data.price, image_url: data.image_url };
      if (data.is_available !== undefined) {
        updateData.is_available = data.is_available;
      }
      const { error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', data.id);
      if (error) {
        console.error('Error updating menu item:', error);
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });

export const getCategoryImagesFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from('restaurant_knowledge').select('content').eq('title', 'category_images').maybeSingle();
    if (data && data.content) {
      try { return JSON.parse(data.content); } catch (e) {}
    }
  } catch (err) {
    console.error('getCategoryImagesFn error:', err);
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

export const updateCategoryImagesFn = createServerFn({ method: "POST" })
  .validator((d: { data: Record<string, string>, pin?: string }) => d)
  .handler(async ({ data: payload }) => {
    try {
      verifyAdminPin(payload.pin);
      const data = payload.data;
      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('restaurant_knowledge').select('id').eq('title', 'category_images').maybeSingle();
      if (existing) {
        await supabase.from('restaurant_knowledge').update({ content: JSON.stringify(data) }).eq('id', existing.id);
      } else {
        await supabase.from('restaurant_knowledge').insert({ title: 'category_images', content: JSON.stringify(data) });
      }
      return { success: true };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });

export const getHighlightImagesFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from('restaurant_knowledge').select('content').eq('title', 'highlight_images').maybeSingle();
    if (data && data.content) {
      try { return JSON.parse(data.content); } catch (e) {}
    }
  } catch (err) {
    console.error('getHighlightImagesFn error:', err);
  }
  return {
    hl_shawarma: '/images/food-placeholder.jpg',
    hl_burger: '/images/food-placeholder.jpg',
    hl_combos: '/images/food-placeholder.jpg'
  };
});

export const updateHighlightImagesFn = createServerFn({ method: "POST" })
  .validator((d: { data: Record<string, string>, pin?: string }) => d)
  .handler(async ({ data: payload }) => {
    try {
      verifyAdminPin(payload.pin);
      const data = payload.data;
      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('restaurant_knowledge').select('id').eq('title', 'highlight_images').maybeSingle();
      if (existing) {
        await supabase.from('restaurant_knowledge').update({ content: JSON.stringify(data) }).eq('id', existing.id);
      } else {
        await supabase.from('restaurant_knowledge').insert({ title: 'highlight_images', content: JSON.stringify(data) });
      }
      return { success: true };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });
