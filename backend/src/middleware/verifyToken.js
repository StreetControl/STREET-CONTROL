/**
 * 🛡️ VERIFY TOKEN MIDDLEWARE
 * 
 * Middleware per verificare JWT token Supabase
 * Protegge route che richiedono autenticazione
 */

import { supabase } from '../services/supabase.js'

/**
 * Verifica validità token JWT Supabase
 * 
 * Estrae token da header Authorization: "Bearer <token>"
 * Verifica con Supabase auth.getUser()
 * Se valido: popola req.user e passa al next()
 * Se invalido: risponde 401 Unauthorized
 */
export async function verifyToken(req, res, next) {
  try {
    // 1. Estrae token da header Authorization
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token mancante. Effettua il login.' 
      })
    }

    const token = authHeader.split(' ')[1]

    // 2. Verifica token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('❌ Token verification failed:', error?.message)
      return res.status(401).json({ 
        error: 'Token non valido o scaduto. Effettua nuovamente il login.' 
      })
    }

    // 3. Popola req.user con dati utente
    req.user = user
    req.token = token

    // Debug log (rimuovi in produzione)
    console.log(`✅ Token verified: User ${user.email}`)

    // 4. Passa al controller
    next()

  } catch (error) {
    console.error('❌ Verify token error:', error)
    res.status(500).json({ 
      error: 'Errore interno durante verifica token' 
    })
  }
}

/**
 * Middleware per verificare ruolo specifico
 * 
 * Uso:
 * router.post('/director/action', verifyToken, requireRole(['DIRECTOR']), controller)
 */
export function requireRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const authUser = req.user

      if (!authUser) {
        return res.status(401).json({ 
          error: 'Autenticazione richiesta' 
        })
      }

      // Query user da DB
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_uid', authUser.id)
        .single()

      if (error || !user) {
        return res.status(404).json({ 
          error: 'Utente non trovato' 
        })
      }

      // Verifica ruolo
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: `Accesso negato. Ruolo richiesto: ${allowedRoles.join(' o ')}` 
        })
      }

      // Passa al controller
      next()

    } catch (error) {
      console.error('❌ Require role error:', error)
      res.status(500).json({ 
        error: 'Errore interno durante verifica permessi' 
      })
    }
  }
}

/**
 * Middleware per verificare active_role (per azioni specifiche)
 * 
 * Esempio: Solo chi ha selezionato ruolo DIRECTOR può premere NEXT
 */
export function requireActiveRole(allowedActiveRoles) {
  return (req, res, next) => {
    const authUser = req.user
    const activeRole = authUser?.user_metadata?.active_role

    if (!activeRole || !allowedActiveRoles.includes(activeRole)) {
      return res.status(403).json({ 
        error: `Azione riservata a: ${allowedActiveRoles.join(' o ')}` 
      })
    }

    next()
  }
}

export default {
  verifyToken,
  requireRole,
  requireActiveRole
}
