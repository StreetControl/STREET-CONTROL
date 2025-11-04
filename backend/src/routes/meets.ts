/**
 * MEETS ROUTES
 * Routes for competition/meet management
 */

import { Router } from 'express';
import { getMeets, createMeet } from '../controllers/meetsController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
 * GET /api/meets
 * Returns all meets for authenticated user's federation
 */
router.get('/', verifyToken, getMeets);

/**
 * POST /api/meets
 * Creates a new meet
 * Body: { name, meet_type_id, start_date, level, regulation_code }
 */
router.post('/', verifyToken, createMeet);

export default router;
