/**
 * SUPABASE CLIENT - Frontend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables!\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env.local'
  );
}

// Create and export the client with proper typing
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
