import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL 
  ? process.env.VITE_SUPABASE_URL 
  : (import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY 
  ? process.env.VITE_SUPABASE_ANON_KEY 
  : (import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '');

// Polyfill WebSocket for Node 20 SSR without adding dependencies
class DummyWS {
  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const getSsrOptions = () => {
  if (typeof window === 'undefined') {
    return {
      realtime: {
        transport: DummyWS as any
      }
    };
  }
  return {};
};

// Browser client (safe for public use, uses anon key)
export const supabaseBrowser = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  getSsrOptions()
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
    ...getSsrOptions()
  });
};
