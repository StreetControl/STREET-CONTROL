/**
 * DISPLAYS CONTROLLER
 * Handles read-only display screens for spectators
 * 
 * These endpoints provide real-time data for:
 * - Vote result display (3 judge circles)
 * - Ranking display
 * - Spotter loading info
 * - OBS overlay
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types/index.js';

/**
 * GET /api/displays/:meetId/current-attempt
 * Get current attempt info for vote result display
 * 
 * Returns:
 * - Current athlete info (name, category, lift)
 * - Current attempt weight
 * - Judge votes (if any)
 * - Timer running status
 */
export async function getCurrentAttempt(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId: _meetId } = req.params;  // eslint-disable-line @typescript-eslint/no-unused-vars
    const { groupId, liftId } = req.query;

    if (!groupId || !liftId) {
      return res.status(400).json({
        success: false,
        error: 'groupId and liftId query parameters are required'
      });
    }

    // Get current_state for this group+lift
    const { data: currentState, error: stateError } = await supabaseAdmin
      .from('current_state')
      .select('*')
      .eq('group_id', groupId)
      .eq('lift_id', liftId)
      .maybeSingle();

    if (stateError) {
      console.error('Error fetching current_state:', stateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch current state'
      });
    }

    if (!currentState || !currentState.current_weight_in_info_id) {
      return res.json({
        success: true,
        data: null,
        message: 'No current athlete'
      });
    }

    // Get weight_in_info with athlete details
    const { data: weightInInfo, error: wiiError } = await supabaseAdmin
      .from('weight_in_info')
      .select(`
        id,
        bodyweight_kg,
        nomination:nomination_id (
          id,
          athlete:athlete_id (
            id,
            first_name,
            last_name,
            sex
          ),
          weight_category:weight_category_id (
            name
          )
        )
      `)
      .eq('id', currentState.current_weight_in_info_id)
      .single();

    if (wiiError || !weightInInfo) {
      console.error('Error fetching weight_in_info:', wiiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch athlete info'
      });
    }

    // Get current attempt
    const currentRound = currentState.current_attempt_no || 1;
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_kg, status, attempt_no')
      .eq('weight_in_info_id', currentState.current_weight_in_info_id)
      .eq('lift_id', liftId)
      .eq('attempt_no', currentRound)
      .maybeSingle();

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError);
    }

    // Get lift name
    const { data: lift } = await supabaseAdmin
      .from('lifts_std')
      .select('name')
      .eq('id', liftId)
      .single();

    // Build response
    const nomination = weightInInfo.nomination as any;
    const athlete = nomination?.athlete;
    const weightCategory = nomination?.weight_category;

    return res.json({
      success: true,
      data: {
        athlete: {
          id: athlete?.id,
          firstName: athlete?.first_name || '',
          lastName: athlete?.last_name || '',
          sex: athlete?.sex || '',
          weightCategory: weightCategory?.name || '',
          bodyweightKg: weightInInfo.bodyweight_kg
        },
        attempt: attempt ? {
          id: attempt.id,
          weightKg: attempt.weight_kg,
          attemptNo: attempt.attempt_no,
          status: attempt.status
        } : null,
        lift: {
          id: liftId,
          name: lift?.name || liftId
        },
        currentRound,
        completed: currentState.completed
      }
    });

  } catch (error: any) {
    console.error('Error in getCurrentAttempt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

export default {
  getCurrentAttempt
};
