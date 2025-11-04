/**
 * AUTH ROUTES
 */

import { Router } from 'express';
import { verifyRole, getUserInfos } from '../controllers/authController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
 * GET /api/auth/user-info
 * Returns user info + available roles
 */
router.get('/user-info', verifyToken, getUserInfos);

/**
 * POST /api/auth/verify-role
 * Validates and selects a role
 * Body: { role: string }
 */
router.post('/verify-role', verifyToken, verifyRole);

export default router;
