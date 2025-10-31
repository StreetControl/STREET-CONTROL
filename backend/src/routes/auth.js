/**
 * AUTH ROUTES
 * 
 * Manages 2-step authentication:
 * 1. Organization login (email + password)
 * 2. Role selection (Director/Referee/Organizer)
 */

import express from 'express'
import { verifyRole, getUserInfos } from '../controllers/authController.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

// ============================================
// PROTECTED ROUTES (Require token)
// ============================================

/**
 * POST /api/auth/verify-role
 * Validates if the requested role is available for the user
 * 
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { role: "DIRECTOR" | "REFEREE" | "ORGANIZER" }
 * Response: { valid: boolean }
 */
router.post('/verify-role', verifyToken, verifyRole)

/**
 * GET /api/auth/user-info
 * Returns the authenticated user's information including available roles
 * 
 * Headers: { Authorization: "Bearer <token>" }
 * Response: { user: { id: string, name: string, role: string, roles: Array<string> } }
 */
router.get('/user-info', verifyToken, getUserInfos)

export default router
