/**
 * VOTES ROUTES
 * Judge voting endpoints
 */

import express, { Response } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { submitVoteHandler, getVoteStatusHandler, forceInvalidHandler } from '../controllers/votesController.js';
import { broadcastTimerStarted } from '../services/votingService.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/votes
 * Submit a judge vote
 * Body: { attemptId, judgePosition, vote, groupId, liftId, meetId }
 */
router.post('/', submitVoteHandler);

/**
 * POST /api/votes/force-invalid
 * HEAD judge X button - force INVALID immediately
 * Body: { attemptId, groupId, liftId, meetId }
 */
router.post('/force-invalid', forceInvalidHandler);

/**
 * POST /api/votes/timer-start
 * Broadcast timer start to display screens
 * Body: { meetId, groupId, liftId, seconds }
 */
router.post('/timer-start', async (req: AuthRequest, res: Response) => {
    try {
        const { meetId, groupId, liftId, seconds } = req.body;

        if (!meetId || !groupId || !liftId || !seconds) {
            return res.status(400).json({
                success: false,
                error: 'meetId, groupId, liftId, and seconds are required'
            });
        }

        await broadcastTimerStarted(meetId, groupId, liftId, seconds);

        return res.json({
            success: true,
            message: 'Timer start broadcasted'
        });
    } catch (error: any) {
        console.error('Error broadcasting timer:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to broadcast timer'
        });
    }
});

/**
 * GET /api/votes/status
 * Get current vote status
 * Query: ?groupId=1&liftId=MU
 */
router.get('/status', getVoteStatusHandler);

export default router;


