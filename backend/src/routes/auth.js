/**
 * 🔐 AUTH ROUTES
 * 
 * Gestisce autenticazione a 2 step:
 * 1. Login organizzazione (email + password)
 * 2. Selezione ruolo (Director/Judge/Organizer)
 */

import express from 'express'
import { 
  loginOrganization, 
  selectRole,
  logout,
  verifySession
} from '../controllers/authController.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

/**
 * POST /api/auth/login
 * STEP 1: Login con credenziali organizzazione
 * 
 * Body: { email, password }
 * Response: { token, user: { id, name, role, email } }
 */
router.post('/login', loginOrganization)

// ============================================
// PROTECTED ROUTES (Require token)
// ============================================

/**
 * POST /api/auth/select-role
 * STEP 2: Seleziona ruolo operativo
 * 
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { role: "DIRECTOR" | "REFEREE" | "ORGANIZER", meet_id?, judge_name? }
 * Response: { token, active_role, ... }
 */
router.post('/select-role', verifyToken, selectRole)

/**
 * POST /api/auth/logout
 * Termina sessione
 * 
 * Headers: { Authorization: "Bearer <token>" }
 */
router.post('/logout', verifyToken, logout)

/**
 * GET /api/auth/verify
 * Verifica validità token + restituisce user info
 * 
 * Headers: { Authorization: "Bearer <token>" }
 * Response: { user: { ... } }
 */
router.get('/verify', verifyToken, verifySession)

export default router
