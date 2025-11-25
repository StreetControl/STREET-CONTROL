/**
 * DIRECTOR CONTROLLER
 * Handles competition management operations for Director role
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

/**
 * ============================================
 * GET DIRECTOR STATE
 * ============================================
 * 
 * Returns complete state for director page:
 * - Flights with groups
 * - Athletes with attempts (ordered by current attempt weight)
 * - Meet lifts
 */
export async function getDirectorState(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Get meet info
    const { data: meet, error: meetError } = await supabaseAdmin
      .from('meets')
      .select('id, name, meet_type_id')
      .eq('id', meetId)
      .single();

    if (meetError || !meet) {
      return res.status(404).json({
        success: false,
        error: 'Meet not found'
      });
    }

    // Get lifts for this meet type (in sequence order)
    const { data: meetTypeLifts, error: liftsError } = await supabaseAdmin
      .from('meet_type_lifts')
      .select('lift_id, sequence, lifts(id, name)')
      .eq('meet_type_id', meet.meet_type_id)
      .order('sequence');

    if (liftsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch meet lifts'
      });
    }

    const lifts = meetTypeLifts?.map((mtl: any) => ({
      id: mtl.lift_id,
      name: mtl.lifts.name,
      sequence: mtl.sequence
    })) || [];

    // Get all flights for this meet
    const { data: flights, error: flightsError } = await supabaseAdmin
      .from('flights')
      .select(`
        id,
        name,
        day_number,
        start_time,
        groups (
          id,
          name,
          ord
        )
      `)
      .eq('meet_id', meetId)
      .order('day_number')
      .order('start_time');

    if (flightsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch flights'
      });
    }

    // Transform flights structure
    const flightsWithGroups = (flights || []).map((flight: any) => ({
      id: flight.id,
      name: flight.name,
      day_number: flight.day_number,
      start_time: flight.start_time,
      groups: (flight.groups || [])
        .sort((a: any, b: any) => a.ord - b.ord)
        .map((group: any) => ({
          id: group.id,
          name: group.name,
          ord: group.ord
        }))
    }));

    return res.json({
      success: true,
      meet: {
        id: meet.id,
        name: meet.name
      },
      flights: flightsWithGroups,
      lifts
    });

  } catch (error: any) {
    console.error('Error in getDirectorState:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * GET GROUP ATHLETES
 * ============================================
 * 
 * Returns athletes in a specific group with their attempts
 * Ordered by current attempt weight (ascending), then by bodyweight (descending) for ties
 */
export async function getGroupAthletes(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { groupId } = req.params;
    const { liftId } = req.query;

    if (!liftId) {
      return res.status(400).json({
        success: false,
        error: 'liftId query parameter is required'
      });
    }

    // Get nominations for this group
    const { data: nominations, error: nomError } = await supabaseAdmin
      .from('nomination')
      .select(`
        id,
        form_id,
        form_info (
          id,
          athlete_id,
          weight_cat_id,
          athletes (
            id,
            cf,
            first_name,
            last_name,
            sex
          ),
          weight_categories_std (
            id,
            name
          )
        )
      `)
      .eq('group_id', groupId);

    if (nomError) {
      console.error('Error fetching nominations:', nomError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch athletes'
      });
    }

    if (!nominations || nominations.length === 0) {
      return res.json({
        success: true,
        athletes: []
      });
    }

    // For each athlete, get weight_in_info and attempts
    const athletes = await Promise.all(
      nominations.map(async (nom: any) => {
        const formInfo = nom.form_info;
        const athlete = formInfo?.athletes;
        const weightCat = formInfo?.weight_categories_std;

        // Get weight_in_info
        const { data: weighInData } = await supabaseAdmin
          .from('weight_in_info')
          .select('id, bodyweight_kg')
          .eq('nomination_id', nom.id)
          .maybeSingle();

        if (!weighInData) {
          return null; // Skip athletes without weigh-in
        }

        // Get attempts for this lift (attempt_no 1, 2, 3)
        const { data: attempts } = await supabaseAdmin
          .from('attempts')
          .select('id, attempt_no, weight_kg, status')
          .eq('weight_in_info_id', weighInData.id)
          .eq('lift_id', liftId)
          .order('attempt_no');

        // Create attempts array [attempt1, attempt2, attempt3]
        const attemptsMap: Record<number, any> = {};
        (attempts || []).forEach((att: any) => {
          attemptsMap[att.attempt_no] = {
            id: att.id,
            weight_kg: att.weight_kg,
            status: att.status
          };
        });

        const attempt1 = attemptsMap[1] || null;
        const attempt2 = attemptsMap[2] || null;
        const attempt3 = attemptsMap[3] || null;

        // Determine current attempt (first PENDING or null)
        let currentAttemptNo = 1;
        if (attempt1 && attempt1.status !== 'PENDING') currentAttemptNo = 2;
        if (attempt2 && attempt2.status !== 'PENDING') currentAttemptNo = 3;
        if (attempt3 && attempt3.status !== 'PENDING') currentAttemptNo = 4; // Done

        return {
          nomination_id: nom.id,
          weight_in_info_id: weighInData.id,
          athlete_id: athlete?.id,
          first_name: athlete?.first_name,
          last_name: athlete?.last_name,
          sex: athlete?.sex,
          weight_category: weightCat?.name,
          bodyweight_kg: weighInData.bodyweight_kg,
          attempt1,
          attempt2,
          attempt3,
          current_attempt_no: currentAttemptNo
        };
      })
    );

    // Filter nulls and sort
    const validAthletes = athletes.filter(a => a !== null);

    // Sort by current attempt weight (ascending), then bodyweight (descending)
    validAthletes.sort((a, b) => {
      const attemptKey = `attempt${a.current_attempt_no}` as 'attempt1' | 'attempt2' | 'attempt3';
      const weightA = a[attemptKey]?.weight_kg || 9999;
      const weightB = b[attemptKey]?.weight_kg || 9999;

      if (weightA !== weightB) {
        return weightA - weightB; // Ascending weight
      }

      // Tie: higher bodyweight goes first
      return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
    });

    return res.json({
      success: true,
      athletes: validAthletes
    });

  } catch (error: any) {
    console.error('Error in getGroupAthletes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * UPDATE ATTEMPT
 * ============================================
 * 
 * Updates attempt weight or status
 * Validates that status can only be set if weight exists
 */
export async function updateAttempt(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { attemptId } = req.params;
    const { weight_kg, status } = req.body;

    if (!attemptId) {
      return res.status(400).json({
        success: false,
        error: 'attemptId is required'
      });
    }

    // Get current attempt
    const { data: attempt, error: fetchError } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_kg, status')
      .eq('id', attemptId)
      .single();

    if (fetchError || !attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }

    // Prepare update data
    const updateData: any = {};

    // Update weight if provided
    if (weight_kg !== undefined && weight_kg !== null) {
      updateData.weight_kg = parseFloat(weight_kg);
    }

    // Update status if provided
    if (status !== undefined) {
      // Validate: can't set status if no weight
      const finalWeight = updateData.weight_kg || attempt.weight_kg;
      if (!finalWeight || finalWeight === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot set status without weight'
        });
      }

      if (!['PENDING', 'VALID', 'INVALID'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data to update'
      });
    }

    // Update attempt
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('attempts')
      .update(updateData)
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update attempt'
      });
    }

    return res.json({
      success: true,
      attempt: updated
    });

  } catch (error: any) {
    console.error('Error in updateAttempt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * CREATE NEXT ATTEMPT
 * ============================================
 * 
 * Creates next attempt (2 or 3) for an athlete in a specific lift
 * Only creates if previous attempt is completed (not PENDING)
 */
export async function createNextAttempt(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { weight_kg, lift_id, weight_in_info_id, attempt_no } = req.body;

    if (!weight_kg || !lift_id || !weight_in_info_id || !attempt_no) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: weight_kg, lift_id, weight_in_info_id, attempt_no'
      });
    }

    // Validate attempt_no
    if (![2, 3].includes(attempt_no)) {
      return res.status(400).json({
        success: false,
        error: 'attempt_no must be 2 or 3'
      });
    }

    // Check if previous attempt exists and is completed
    const { data: prevAttempt } = await supabaseAdmin
      .from('attempts')
      .select('id, status')
      .eq('weight_in_info_id', weight_in_info_id)
      .eq('lift_id', lift_id)
      .eq('attempt_no', attempt_no - 1)
      .maybeSingle();

    if (!prevAttempt) {
      return res.status(400).json({
        success: false,
        error: `Previous attempt (${attempt_no - 1}) does not exist`
      });
    }

    if (prevAttempt.status === 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Previous attempt (${attempt_no - 1}) is still pending`
      });
    }

    // Check if this attempt already exists
    const { data: existingAttempt } = await supabaseAdmin
      .from('attempts')
      .select('id')
      .eq('weight_in_info_id', weight_in_info_id)
      .eq('lift_id', lift_id)
      .eq('attempt_no', attempt_no)
      .maybeSingle();

    if (existingAttempt) {
      // Update existing
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('attempts')
        .update({ weight_kg: parseFloat(weight_kg) })
        .eq('id', existingAttempt.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update existing attempt'
        });
      }

      return res.json({
        success: true,
        attempt: updated,
        created: false
      });
    }

    // Insert new attempt
    const { data: newAttempt, error: insertError } = await supabaseAdmin
      .from('attempts')
      .insert({
        weight_in_info_id: parseInt(weight_in_info_id),
        lift_id,
        attempt_no,
        weight_kg: parseFloat(weight_kg),
        status: 'PENDING'
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create attempt'
      });
    }

    return res.json({
      success: true,
      attempt: newAttempt,
      created: true
    });

  } catch (error: any) {
    console.error('Error in createNextAttempt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

export default {
  getDirectorState,
  getGroupAthletes,
  updateAttempt,
  createNextAttempt
};
