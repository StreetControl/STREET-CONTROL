/**
 * MEETS ROUTES
 * Routes for competition/meet management
 */

import { Router } from 'express';
import { getMeets, createMeet, updateMeet } from '../controllers/meetsController.js';
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

/**
 * PATCH /api/meets/:meetId
 * Updates a meet (all fields except meet_type_id)
 * Body: { name, start_date, level, regulation_code, score_type }
 */
router.patch('/:meetId', verifyToken, updateMeet);

export default router;
