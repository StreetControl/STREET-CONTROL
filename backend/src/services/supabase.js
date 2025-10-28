/**
 * 🔥 SUPABASE CLIENT - Backend
 * 
 * Client Supabase con SERVICE_ROLE_KEY per operazioni privilegiate.
 * 
 * DIFFERENZE CON FRONTEND:
 * - Frontend usa ANON_KEY (permessi limitati, RLS attivo)
 * - Backend usa SERVICE_ROLE_KEY (permessi admin, bypassa RLS)
 * 
 * QUANDO USARE:
 * - Creazione utenti (admin.createUser)
 * - Query che bypassano RLS
 * - Operazioni privilegiate
 * 
 * ⚠️ SICUREZZA: SERVICE_KEY mai esporre al frontend!
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carica variabili ambiente
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Validazione
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n' +
    'Assicurati che SUPABASE_URL e SUPABASE_SERVICE_KEY siano in .env'
  )
}

// Crea client con SERVICE_ROLE_KEY
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

// Export anche URL per debug
export const SUPABASE_URL = supabaseUrl

console.log('✅ Supabase backend client initialized')

export default supabase
