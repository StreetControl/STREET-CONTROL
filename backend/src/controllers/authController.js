/**
 * 🎯 AUTH CONTROLLER
 * 
 * Gestisce logica autenticazione usando Supabase Auth
 */

import { supabaseAuth, supabaseAdmin } from '../services/supabase.js'

/**
 * ============================================
 * STEP 1: LOGIN ORGANIZZAZIONE
 * ============================================
 * 
 * Login con email + password tramite Supabase Auth
 */
export async function loginOrganization(req, res) {
  try {
    const { email, password } = req.body

    // Validazione input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e password sono obbligatori' 
      })
    }

    // 1. Login con Supabase Auth (usa ANON_KEY)
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return res.status(401).json({ 
        error: 'Credenziali non valide' 
      })
    }

    // 2. Query tabella users con SERVICE_ROLE_KEY (bypassa RLS)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, role, created_at')
      .eq('auth_uid', authData.user.id)
      .single()

    if (userError || !user) {
      console.error('❌ User not found in users table:', userError)
      return res.status(404).json({ 
        error: 'Utente non trovato nel sistema' 
      })
    }

    // 3. Determina ruoli disponibili in base al ruolo DB
    const availableRoles = []
    
    // SUPER_ADMIN e ADMIN possono usare tutti i ruoli
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      availableRoles.push(
        { id: 1, role: 'DIRECTOR', name: 'Regista' },
        { id: 2, role: 'ORGANIZER', name: 'Pre-Gara' },
        { id: 3, role: 'REFEREE', name: 'Giudice' }
      )
    } 
    // Altri ruoli possono usare solo il loro ruolo specifico
    else if (user.role === 'DIRECTOR') {
      availableRoles.push({ id: 1, role: 'DIRECTOR', name: 'Regista' })
    }
    else if (user.role === 'ORGANIZER') {
      availableRoles.push({ id: 2, role: 'ORGANIZER', name: 'Pre-Gara' })
    }
    else if (user.role === 'REFEREE') {
      availableRoles.push({ id: 3, role: 'REFEREE', name: 'Giudice' })
    }

    // 4. Restituisci token Supabase + user info
    res.json({
      success: true,
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: authData.user.email,
        auth_uid: authData.user.id,
        available_roles: availableRoles,
        organization_name: user.name // Frontend si aspetta questo campo
      }
    })

    console.log(`✅ Login successful: ${user.name} (${email})`)

  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ 
      error: 'Errore interno del server' 
    })
  }
}

/**
 * ============================================
 * STEP 2: SELEZIONE RUOLO
 * ============================================
 * 
 * Dopo login, user seleziona ruolo operativo
 * Verifica permessi e genera token specifico
 */
export async function selectRole(req, res) {
  try {
    const { role_id, meet_id, judge_name } = req.body
    const authUser = req.user // Popolato da middleware verifyToken

    // Mappa role_id a role string
    const roleMap = {
      1: 'DIRECTOR',
      2: 'ORGANIZER',
      3: 'REFEREE'
    }

    const role = roleMap[role_id]

    // Validazione role
    if (!role) {
      return res.status(400).json({ 
        error: 'Ruolo non valido' 
      })
    }

    // 1. Query tabella users con supabaseAdmin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_uid', authUser.id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'Utente non trovato' 
      })
    }

    // 2. Verifica permessi per ruolo richiesto
    const rolePermissions = {
      'DIRECTOR': ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'],
      'ORGANIZER': ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
      'REFEREE': ['REFEREE', 'ADMIN', 'SUPER_ADMIN']
    }

    if (!rolePermissions[role].includes(user.role)) {
      return res.status(403).json({ 
        error: `Non hai i permessi per accedere come ${role}` 
      })
    }

    // 3. Logica specifica per REFEREE (giudice)
    if (role === 'REFEREE') {
      if (!meet_id || !judge_name) {
        return res.status(400).json({ 
          error: 'meet_id e judge_name sono obbligatori per i giudici' 
        })
      }

      // Query: trova giudice per questa gara
      const { data: judge, error: judgeError } = await supabaseAdmin
        .from('judges')
        .select('*')
        .eq('user_id', user.id)
        .or(`first_name.eq.${judge_name},last_name.eq.${judge_name}`)
        .single()

      if (judgeError || !judge) {
        return res.status(404).json({ 
          error: 'Giudice non trovato per questa gara' 
        })
      }

      // Genera token Supabase con metadata custom (usa supabaseAuth)
      const { data: sessionData, error: sessionError } = await supabaseAuth.auth.updateUser({
        data: {
          active_role: 'REFEREE',
          judge_id: judge.id,
          judge_role: judge.role, // HEAD | LEFT | RIGHT
          meet_id: meet_id
        }
      })

      if (sessionError) {
        return res.status(500).json({ 
          error: 'Errore aggiornamento sessione' 
        })
      }

      return res.json({
        success: true,
        active_role: 'REFEREE',
        judge: {
          id: judge.id,
          role: judge.role,
          name: `${judge.first_name} ${judge.last_name}`
        },
        meet_id: meet_id
      })
    }

    // 4. Per DIRECTOR e ORGANIZER: aggiorna metadata sessione
    const { data: sessionData, error: sessionError } = await supabaseAuth.auth.updateUser({
      data: {
        active_role: role
      }
    })

    if (sessionError) {
      return res.status(500).json({ 
        error: 'Errore aggiornamento sessione' 
      })
    }

    res.json({
      success: true,
      active_role: role,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    })

    console.log(`✅ Role selected: ${user.name} → ${role}`)

  } catch (error) {
    console.error('❌ Select role error:', error)
    res.status(500).json({ 
      error: 'Errore interno del server' 
    })
  }
}

/**
 * ============================================
 * LOGOUT
 * ============================================
 */
export async function logout(req, res) {
  try {
    const authUser = req.user

    // Supabase logout (invalida token) - usa supabaseAuth
    const { error } = await supabaseAuth.auth.signOut()

    if (error) {
      console.error('❌ Logout error:', error)
      return res.status(500).json({ 
        error: 'Errore durante logout' 
      })
    }

    res.json({
      success: true,
      message: 'Logout effettuato con successo'
    })

    console.log(`✅ Logout successful: User ${authUser.id}`)

  } catch (error) {
    console.error('❌ Logout error:', error)
    res.status(500).json({ 
      error: 'Errore interno del server' 
    })
  }
}

/**
 * ============================================
 * VERIFY SESSION
 * ============================================
 * 
 * Verifica validità token e restituisce user info
 */
export async function verifySession(req, res) {
  try {
    const authUser = req.user // Già verificato da middleware

    // Query user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('auth_uid', authUser.id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'Utente non trovato' 
      })
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: authUser.email,
        active_role: authUser.user_metadata?.active_role || null
      }
    })

  } catch (error) {
    console.error('❌ Verify session error:', error)
    res.status(500).json({ 
      error: 'Errore interno del server' 
    })
  }
}

export default {
  loginOrganization,
  selectRole,
  logout,
  verifySession
}
