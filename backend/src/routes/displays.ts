/**
 * DISPLAYS ROUTES
 * Read-only endpoints for display screens
 * 
 * These routes REQUIRE authentication (like all other routes)
 * Uses backend API for data access, bypassing RLS
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { getCurrentAttempt, getActiveAthlete } from '../controllers/displaysController.js';

const router = Router();

// All display routes require authentication
router.use(verifyToken);

/**
 * GET /api/displays/:meetId/current-attempt
 * Get current attempt info for vote result display
 * Query: ?groupId=1&liftId=MU
 */
router.get('/:meetId/current-attempt', getCurrentAttempt);

/**
 * GET /api/displays/:meetId/active-athlete
 * Auto-discover and return the currently active athlete on platform
 * No query params needed - scans all groups in the meet
 */
router.get('/:meetId/active-athlete', getActiveAthlete);

export default router;


