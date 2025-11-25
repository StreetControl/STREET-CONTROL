/**
 * DIRECTOR ROUTES
 * Routes for competition management (Director role)
 */

import { Router } from 'express';
import { 
  getDirectorState, 
  getGroupAthletes,
  updateAttempt,
  createNextAttempt 
} from '../controllers/directorController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/director/meets/:meetId/state
 * Get complete state for director page (flights, groups, lifts)
 */
router.get('/meets/:meetId/state', getDirectorState);

/**
 * GET /api/director/groups/:groupId/athletes?liftId=XX
 * Get athletes in a group with their attempts for a specific lift
 * Ordered by current attempt weight
 */
router.get('/groups/:groupId/athletes', getGroupAthletes);

/**
 * PATCH /api/director/attempts/:attemptId
 * Update attempt weight or status
 * Body: { weight_kg?, status? }
 */
router.patch('/attempts/:attemptId', updateAttempt);

/**
 * POST /api/director/attempts
 * Create next attempt (2 or 3) for an athlete
 * Body: { weight_kg, lift_id, weight_in_info_id, attempt_no }
 */
router.post('/attempts', createNextAttempt);

export default router;
