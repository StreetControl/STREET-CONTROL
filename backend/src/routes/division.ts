/**
 * DIVISION ROUTES
 * Routes for automatic division of athletes into flights and groups
 */

import { Router } from 'express';
import { createDivision, getDivision, saveDivision, updateFlightsStructure } from '../controllers/divisionController.js';
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
 * PUT /api/meets/:meetId/division/flights
 * Updates flight structure (name, day, time, groups) without affecting athlete assignments
 */
router.put('/:meetId/division/flights', verifyToken, updateFlightsStructure);

/**
 * POST /api/meets/:meetId/division/save
 * Saves modified division structure (after drag & drop)
 */
router.post('/:meetId/division/save', verifyToken, saveDivision);

export default router;
