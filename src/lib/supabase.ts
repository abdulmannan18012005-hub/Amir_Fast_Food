import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL 
  ? process.env.VITE_SUPABASE_URL 
  : (import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY 
  ? process.env.VITE_SUPABASE_ANON_KEY 
  : (import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '');

// Browser client (safe for public use, uses anon key)
export const supabaseBrowser = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// Server client (requires service role key, DO NOT EXPOSE TO BROWSER)
export const getSupabaseServer = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable on server');
  }
  return createClient(supabaseUrl || '', serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
