/**
 * WEIGH-IN ROUTES
 * Routes for pre-competition weigh-in operations
 */

import { Router } from 'express';
import { getWeighInAthletes, updateWeighIn } from '../controllers/weighInController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/meets/:meetId/weigh-in
 * Get all athletes with weigh-in data for a meet (organized by flights/groups)
 */
router.get('/:meetId/weigh-in', getWeighInAthletes);

/**
 * PATCH /api/weigh-in/:nominationId
 * Update weigh-in data and openers for a specific athlete
 */
router.patch('/weigh-in/:nominationId', updateWeighIn);

export default router;
