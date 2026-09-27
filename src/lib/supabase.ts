import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://mnbuukffxvnmqqxqabkq.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYnV1a2ZmeHZubXFxeHFhYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTc1NDMsImV4cCI6MjEwNTk5MzU0M30.X4TbApcaT6iGRh2QX9tgxkw7B9h5AxcuSD3CNbKAiwc';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Browser client (safe for public use, uses anon key)
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// Server client (requires service role key, DO NOT EXPOSE TO BROWSER)
export const getSupabaseServer = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYnV1a2ZmeHZubXFxeHFhYmtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQxNzU0MywiZXhwIjoyMTA1OTkzNTQzfQ.yQvNU3nt86o1HGeruNet2supIHNArXKyHl-YIikB9cE';
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable on server');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
