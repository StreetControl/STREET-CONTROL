/**
 * VOTES CONTROLLER
 * Handles judge voting endpoints
 */

import { Response } from 'express';
import { submitVote, getVoteStatus, forceInvalid } from '../services/votingService.js';
import type { AuthRequest } from '../types/index.js';

// Types
type JudgePosition = 'HEAD' | 'LEFT' | 'RIGHT';

interface SubmitVoteBody {
  attemptId: number;
  judgePosition: JudgePosition;
  vote: boolean;  // true = VALID, false = INVALID
  groupId: number;
  liftId: string;
  meetId: number;  // For broadcast to display screens
}

interface ForceInvalidBody {
  attemptId: number;
  groupId: number;
  liftId: string;
  meetId: number;  // For broadcast to display screens
}

/**
 * POST /api/votes
 * Submit a judge vote for the current attempt
 */
export async function submitVoteHandler(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { attemptId, judgePosition, vote, groupId, liftId, meetId } = req.body as SubmitVoteBody;

    // Validation
    if (!attemptId || typeof attemptId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'attemptId is required and must be a number'
      });
    }

    if (!judgePosition || !['HEAD', 'LEFT', 'RIGHT'].includes(judgePosition)) {
      return res.status(400).json({
        success: false,
        error: 'judgePosition must be HEAD, LEFT, or RIGHT'
      });
    }

    if (typeof vote !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'vote must be a boolean (true for VALID, false for INVALID)'
      });
    }

    if (!groupId || typeof groupId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'groupId is required and must be a number'
      });
    }

    if (!liftId || typeof liftId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'liftId is required and must be a string'
      });
    }

    if (!meetId || typeof meetId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'meetId is required and must be a number'
      });
    }

    // Submit vote to voting service
    const result = await submitVote(attemptId, judgePosition, vote, groupId, liftId, meetId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);

  } catch (error: any) {
    console.error('Error in submitVoteHandler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * POST /api/votes/force-invalid
 * HEAD judge X button - immediately marks attempt as INVALID
 */
export async function forceInvalidHandler(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { attemptId, groupId, liftId, meetId } = req.body as ForceInvalidBody;

    // Validation
    if (!attemptId || typeof attemptId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'attemptId is required and must be a number'
      });
    }

    if (!groupId || typeof groupId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'groupId is required and must be a number'
      });
    }

    if (!liftId || typeof liftId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'liftId is required and must be a string'
      });
    }

    if (!meetId || typeof meetId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'meetId is required and must be a number'
      });
    }

    // Force invalid via voting service
    const result = await forceInvalid(attemptId, groupId, liftId, meetId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);

  } catch (error: any) {
    console.error('Error in forceInvalidHandler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * GET /api/votes/status
 * Get current vote status for a group+lift context
 */
export async function getVoteStatusHandler(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { groupId, liftId } = req.query;

    if (!groupId || !liftId) {
      return res.status(400).json({
        success: false,
        error: 'groupId and liftId query parameters are required'
      });
    }

    const status = getVoteStatus(parseInt(groupId as string), liftId as string);

    return res.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error('Error in getVoteStatusHandler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

export default {
  submitVoteHandler,
  forceInvalidHandler,
  getVoteStatusHandler
};

