/**
 * 🔥 SUPABASE CLIENT - Frontend
 * 
 * Questo file inizializza il client Supabase per il frontend.
 * Importalo ovunque ti serve fare query al database o ascoltare eventi real-time.
 * 
 * ESEMPIO USO:
 * 
 * import { supabase } from '@/services/supabase'
 * 
 * // Query
 * const { data, error } = await supabase.from('athletes').select('*')
 * 
 * // Real-time
 * supabase
 *   .channel('attempts-changes')
 *   .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attempts' },
 *     (payload) => console.log('Attempt aggiornato!', payload)
 *   )
 *   .subscribe()
 */

import { createClient } from '@supabase/supabase-js'

// Variabili d'ambiente (da .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validazione
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n' +
    'Assicurati che VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY siano in .env.local'
  )
}

// Crea e esporta il client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configurazioni autenticazione (se userai login)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    // Configurazioni WebSocket real-time
    params: {
      eventsPerSecond: 10 // Limita eventi per non sovraccaricare
    }
  }
})

// Esporta anche URL per debug
export const SUPABASE_URL = supabaseUrl

/**
 * 🔧 HELPER FUNCTIONS
 */

// Test connessione (utile per debug)
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('meets').select('count').limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabella non esiste
      console.error('❌ Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connected successfully!')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message)
    return false
  }
}

// Sottoscrizione real-time semplificata
export const subscribeToTable = (tableName, callback) => {
  const channel = supabase
    .channel(`${tableName}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe()

  // Ritorna funzione per unsubscribe
  return () => {
    supabase.removeChannel(channel)
  }
}

export default supabase
