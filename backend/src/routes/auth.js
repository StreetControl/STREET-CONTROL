/**
 * AUTH ROUTES
 * 
 * Manages 2-step authentication:
 * 1. Organization login (email + password)
 * 2. Role selection (Director/Referee/Organizer)
 */

import express from 'express'
import { getAvailableRoles, verifyRole } from '../controllers/authController.js'
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
 * GET /api/auth/get-available-roles
 * Returns a list of available roles for the authenticated user
 * 
 * Headers: { Authorization: "Bearer <token>" }
 * Response: { roles: Array<"DIRECTOR" | "REFEREE" | "ORGANIZER"> }
 */
router.get('/get-available-roles', verifyToken, getAvailableRoles)

export default router
