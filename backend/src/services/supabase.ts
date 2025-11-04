/**
 * SUPABASE CLIENT - Backend
 * 
 * Backend uses ONLY supabaseAdmin (SERVICE_ROLE_KEY):
 * - Bypasses Row Level Security (RLS)
 * - Permissions managed manually in code
 * - JWT verification handled by verifyToken middleware
 * 
 * AUTHENTICATION:
 * - Login/Logout handled by FRONTEND (Supabase client-side)
 * - Backend receives and verifies JWT token via middleware
 * 
 * SECURITY: 
 * - Never expose SERVICE_ROLE_KEY to frontend
 * - Always validate user permissions before DB queries
 * - Use RLS policies as additional security layer
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validation
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables!\n' +
    'Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env'
  );
}

/**
 * SUPABASE ADMIN CLIENT
 * 
 * Uses SERVICE_ROLE_KEY - Bypasses RLS
 * Permissions must be managed manually in code
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

export default supabaseAdmin;
