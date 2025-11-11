/**
 * DIVISION ROUTES
 * Routes for automatic division of athletes into flights and groups
 */

import { Router } from 'express';
import { createDivision, getDivision, saveDivision } from '../controllers/divisionController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
 * POST /api/meets/:meetId/division/create
 * Automatically creates division structure (flights, groups, nominations)
 */
router.post('/:meetId/division/create', verifyToken, createDivision);

/**
 * GET /api/meets/:meetId/division
 * Returns current division structure
 */
router.get('/:meetId/division', verifyToken, getDivision);

/**
 * POST /api/meets/:meetId/division/save
 * Saves modified division structure (after drag & drop)
 */
router.post('/:meetId/division/save', verifyToken, saveDivision);

export default router;
