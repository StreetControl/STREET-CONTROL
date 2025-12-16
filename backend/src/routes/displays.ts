/**
 * DISPLAYS ROUTES
 * Read-only endpoints for display screens (spectators, OBS, etc.)
 * 
 * These routes do NOT require authentication
 * They are intentionally public for easy access from display screens
 */

import { Router } from 'express';
import { getCurrentAttempt } from '../controllers/displaysController.js';

const router = Router();

/**
 * GET /api/displays/:meetId/current-attempt
 * Get current attempt info for vote result display
 * Query: ?groupId=1&liftId=MU
 */
router.get('/:meetId/current-attempt', getCurrentAttempt);

export default router;
