/**
 * 🔥 SUPABASE CLIENTS - Backend
 * 
 * DUE client Supabase:
 * 1. supabaseAdmin (SERVICE_ROLE_KEY) - Per query al DB che bypassano RLS
 * 2. supabaseAuth (ANON_KEY) - Per autenticazione (signInWithPassword)
 * 
 * QUANDO USARE:
 * - supabaseAuth: Login, signup, password reset
 * - supabaseAdmin: Query al database, operazioni privilegiate
 * 
 * ⚠️ SICUREZZA: SERVICE_KEY mai esporre al frontend!
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carica variabili ambiente
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Validazione
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n' +
    'Assicurati che SUPABASE_URL, SUPABASE_SERVICE_KEY e SUPABASE_ANON_KEY siano in .env'
  )
}

// Client per AUTENTICAZIONE (usa ANON_KEY)
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
})

// Client per DATABASE (usa SERVICE_ROLE_KEY, bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'apikey': supabaseServiceKey
    }
  }
})

// Export default per retrocompatibilità (usa Admin)
export const supabase = supabaseAdmin

// Export anche URL per debug
export const SUPABASE_URL = supabaseUrl

console.log('✅ Supabase backend client initialized')

export default supabase
