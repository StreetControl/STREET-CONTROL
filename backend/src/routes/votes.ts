/**
 * VOTES ROUTES
 * Judge voting endpoints
 */

import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { submitVoteHandler, getVoteStatusHandler, forceInvalidHandler } from '../controllers/votesController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/votes
 * Submit a judge vote
 * Body: { attemptId, judgePosition, vote, groupId, liftId }
 */
router.post('/', submitVoteHandler);

/**
 * POST /api/votes/force-invalid
 * HEAD judge X button - force INVALID immediately
 * Body: { attemptId, groupId, liftId }
 */
router.post('/force-invalid', forceInvalidHandler);

/**
 * GET /api/votes/status
 * Get current vote status
 * Query: ?groupId=1&liftId=MU
 */
router.get('/status', getVoteStatusHandler);

export default router;

