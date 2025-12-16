/**
 * DIRECTOR CONTROLLER
 * Handles competition management operations for Director role
 * 
 * Key concepts:
 * - current_state: Tracks current athlete for each (group_id, lift_id) combination
 * - Athlete ordering: By current attempt weight (ASC), then bodyweight (DESC) for ties
 * - 0kg = first position (lowest), null/missing = last position
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create current_state for a group+lift combination
 */
async function getOrCreateCurrentState(groupId: number, liftId: string) {
  // Try to get existing
  const { data: existing } = await supabaseAdmin
    .from('current_state')
    .select('*')
    .eq('group_id', groupId)
    .eq('lift_id', liftId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new - will be populated when first athlete is determined
  const { data: created, error } = await supabaseAdmin
    .from('current_state')
    .insert({
      group_id: groupId,
      lift_id: liftId,
      current_attempt_no: 1,
      current_weight_in_info_id: null,
      completed: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating current_state:', error);
    return null;
  }

  return created;
}

/**
 * Update current_state record
 */
async function updateCurrentState(
  groupId: number, 
  liftId: string, 
  updates: {
    current_weight_in_info_id?: number | null;
    current_attempt_no?: number;
    completed?: boolean;
  }
) {
  const { error } = await supabaseAdmin
    .from('current_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('group_id', groupId)
    .eq('lift_id', liftId);

  if (error) {
    console.error('Error updating current_state:', error);
    return false;
  }
  return true;
}

/**
 * Sort athletes by current round's attempt weight
 * Rules:
 * - 0kg = first (lowest possible weight)
 * - Has weight = sorted ascending
 * - No weight (null/undefined) = last
 * - Ties: higher bodyweight goes first
 */
function sortAthletesByAttemptWeight(athletes: any[], attemptNo: number): any[] {
  return [...athletes].sort((a, b) => {
    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attemptA = a[attemptKey];
    const attemptB = b[attemptKey];
    
    // Get weights (null if no attempt or no weight)
    const weightA = attemptA?.weight_kg;
    const weightB = attemptB?.weight_kg;
    
    // Both have weights: sort ascending
    if (weightA !== null && weightA !== undefined && weightB !== null && weightB !== undefined) {
      if (weightA !== weightB) {
        return weightA - weightB; // Ascending
      }
      // Tie: higher bodyweight first
      return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
    }
    
    // A has weight, B doesn't: A comes first
    if (weightA !== null && weightA !== undefined) return -1;
    
    // B has weight, A doesn't: B comes first
    if (weightB !== null && weightB !== undefined) return 1;
    
    // Neither has weight: sort by bodyweight (higher first)
    return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
  });
}

/**
 * Find the next athlete who needs to attempt in the current round
 * Returns null if all athletes have completed this round
 */
function findNextAthleteForRound(athletes: any[], attemptNo: number): any | null {
  const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
  
  // Sort athletes first
  const sorted = sortAthletesByAttemptWeight(athletes, attemptNo);
  
  // Find first athlete whose attempt for this round is still PENDING
  for (const athlete of sorted) {
    const attempt = athlete[attemptKey];
    
    // If no attempt exists or attempt is PENDING, this athlete needs to go
    if (!attempt || attempt.status === 'PENDING') {
      return athlete;
    }
  }
  
  // All athletes have completed this round
  return null;
}

// ============================================
// GET DIRECTOR STATE
// ============================================

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

// ============================================
// GET GROUP ATHLETES
// ============================================

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

    // Get or create current_state for this group+lift
    const currentState = await getOrCreateCurrentState(parseInt(groupId), liftId as string);

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
        athletes: [],
        currentState: currentState || null
      });
    }

    // Get all nomination IDs
    const nominationIds = nominations.map((n: any) => n.id);

    // OPTIMIZED: Batch fetch all weight_in_info for all nominations
    const { data: allWeighInData } = await supabaseAdmin
      .from('weight_in_info')
      .select('id, nomination_id, bodyweight_kg, notes')
      .in('nomination_id', nominationIds);

    if (!allWeighInData || allWeighInData.length === 0) {
      return res.json({
        success: true,
        athletes: [],
        currentState: currentState || null
      });
    }

    // Get all weight_in_info IDs
    const weightInInfoIds = allWeighInData.map(w => w.id);

    // OPTIMIZED: Batch fetch all attempts for all weight_in_infos for this lift
    const { data: allAttempts } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_in_info_id, attempt_no, weight_kg, status')
      .in('weight_in_info_id', weightInInfoIds)
      .eq('lift_id', liftId)
      .order('attempt_no');

    // Create lookup maps for O(1) access
    const weighInByNomId = new Map(allWeighInData.map(w => [w.nomination_id, w]));
    const attemptsByWiiId = new Map<number, any[]>();
    (allAttempts || []).forEach((att: any) => {
      if (!attemptsByWiiId.has(att.weight_in_info_id)) {
        attemptsByWiiId.set(att.weight_in_info_id, []);
      }
      attemptsByWiiId.get(att.weight_in_info_id)!.push(att);
    });

    // Build athletes array (no async needed - all data is in memory)
    const athletes = nominations.map((nom: any) => {
      const formInfo = nom.form_info;
      const athlete = formInfo?.athletes;
      const weightCat = formInfo?.weight_categories_std;
      const weighInData = weighInByNomId.get(nom.id);

      if (!weighInData) {
        return null; // Skip athletes without weigh-in
      }

      const attempts = attemptsByWiiId.get(weighInData.id) || [];
      const attemptsMap: Record<number, any> = {};
      attempts.forEach((att: any) => {
        attemptsMap[att.attempt_no] = {
          id: att.id,
          weight_kg: Number(att.weight_kg),
          status: att.status
        };
      });

      return {
        nomination_id: nom.id,
        weight_in_info_id: weighInData.id,
        athlete_id: athlete?.id,
        first_name: athlete?.first_name,
        last_name: athlete?.last_name,
        sex: athlete?.sex,
        weight_category: weightCat?.name,
        bodyweight_kg: weighInData.bodyweight_kg,
        notes: weighInData.notes || '',
        attempt1: attemptsMap[1] || null,
        attempt2: attemptsMap[2] || null,
        attempt3: attemptsMap[3] || null
      };
    });

    // Filter nulls
    const validAthletes = athletes.filter(a => a !== null);

    // Determine current round (1, 2, or 3)
    // Round is the lowest attempt_no where at least one athlete has PENDING status
    let currentRound = currentState?.current_attempt_no || 1;
    
    // Check if all athletes completed current round → advance to next
    const hasAthleteInCurrentRound = validAthletes.some(a => {
      const attemptKey = `attempt${currentRound}` as 'attempt1' | 'attempt2' | 'attempt3';
      const attempt = a[attemptKey];
      return !attempt || attempt.status === 'PENDING';
    });

    if (!hasAthleteInCurrentRound && currentRound < 3) {
      currentRound++;
      // Update in DB
      await updateCurrentState(parseInt(groupId), liftId as string, { current_attempt_no: currentRound });
    }

    // Sort athletes by current round's attempt weight
    const sortedAthletes = sortAthletesByAttemptWeight(validAthletes, currentRound);

    // Find current athlete (first one needing to attempt in this round)
    const currentAthlete = findNextAthleteForRound(sortedAthletes, currentRound);
    
    // Update current_state with current athlete
    if (currentAthlete) {
      await updateCurrentState(parseInt(groupId), liftId as string, {
        current_weight_in_info_id: currentAthlete.weight_in_info_id,
        current_attempt_no: currentRound,
        completed: false
      });
    } else if (currentRound >= 3) {
      // All rounds completed
      await updateCurrentState(parseInt(groupId), liftId as string, {
        current_weight_in_info_id: null,
        completed: true
      });
    }

    return res.json({
      success: true,
      athletes: sortedAthletes,
      currentState: {
        current_round: currentRound,
        current_weight_in_info_id: currentAthlete?.weight_in_info_id || null,
        completed: !currentAthlete && currentRound >= 3
      }
    });

  } catch (error: any) {
    console.error('Error in getGroupAthletes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// ============================================
// UPDATE ATTEMPT
// ============================================

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
      .select('id, weight_kg, status, lift_id, weight_in_info_id')
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
      const finalWeight = updateData.weight_kg ?? attempt.weight_kg;
      if (finalWeight === null || finalWeight === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Cannot set status without weight'
        });
      }

      if (!['PENDING', 'VALID', 'INVALID'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value'
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

// ============================================
// CREATE NEXT ATTEMPT
// ============================================

export async function createNextAttempt(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { weight_kg, lift_id, weight_in_info_id, attempt_no } = req.body;

    if (!lift_id || !weight_in_info_id || !attempt_no) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: lift_id, weight_in_info_id, attempt_no'
      });
    }

    // Validate attempt_no
    if (![1, 2, 3].includes(attempt_no)) {
      return res.status(400).json({
        success: false,
        error: 'attempt_no must be 1, 2, or 3'
      });
    }

    // For attempt 2 and 3, check previous attempt exists and is completed
    if (attempt_no > 1) {
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
      const updateData: any = { status: 'PENDING' };
      if (weight_kg !== undefined && weight_kg !== null) {
        updateData.weight_kg = parseFloat(weight_kg);
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('attempts')
        .update(updateData)
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
    const insertData: any = {
      weight_in_info_id: parseInt(weight_in_info_id),
      lift_id,
      attempt_no,
      status: 'PENDING'
    };

    if (weight_kg !== undefined && weight_kg !== null) {
      insertData.weight_kg = parseFloat(weight_kg);
    } else {
      insertData.weight_kg = 0; // Default to 0 if no weight provided
    }

    const { data: newAttempt, error: insertError } = await supabaseAdmin
      .from('attempts')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
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

// ============================================
// ADVANCE TO NEXT ATHLETE
// ============================================

/**
 * Called after marking an attempt as VALID or INVALID
 * Advances to the next athlete in the current round
 * If all athletes completed, advances to next round
 */
export async function advanceToNextAthlete(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { groupId, liftId } = req.body;

    if (!groupId || !liftId) {
      return res.status(400).json({
        success: false,
        error: 'groupId and liftId are required'
      });
    }

    // Get current state
    const currentState = await getOrCreateCurrentState(groupId, liftId);
    
    if (!currentState) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get current state'
      });
    }

    // Get all athletes in this group
    const { data: nominations } = await supabaseAdmin
      .from('nomination')
      .select(`
        id,
        form_info (
          id,
          athletes (id, first_name, last_name)
        )
      `)
      .eq('group_id', groupId);

    if (!nominations || nominations.length === 0) {
      return res.json({
        success: true,
        message: 'No athletes in group',
        nextAthlete: null
      });
    }

    // Get all weight_in_info for these nominations
    const nomIds = nominations.map(n => n.id);
    const { data: weighInInfos } = await supabaseAdmin
      .from('weight_in_info')
      .select('id, nomination_id, bodyweight_kg')
      .in('nomination_id', nomIds);

    if (!weighInInfos || weighInInfos.length === 0) {
      return res.json({
        success: true,
        message: 'No weigh-in data',
        nextAthlete: null
      });
    }

    // Get all attempts for these athletes for this lift
    const wiiIds = weighInInfos.map(w => w.id);
    const { data: allAttempts } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_in_info_id, attempt_no, weight_kg, status')
      .in('weight_in_info_id', wiiIds)
      .eq('lift_id', liftId);

    // Build athlete data
    const athleteData = weighInInfos.map(wii => {
      const nom = nominations.find(n => n.id === wii.nomination_id);
      const attempts = (allAttempts || []).filter(a => a.weight_in_info_id === wii.id);
      
      const attemptsMap: Record<number, any> = {};
      attempts.forEach(att => {
        attemptsMap[att.attempt_no] = {
          id: att.id,
          weight_kg: Number(att.weight_kg),
          status: att.status
        };
      });

      return {
        weight_in_info_id: wii.id,
        bodyweight_kg: wii.bodyweight_kg,
        athlete: (nom?.form_info as any)?.athletes,
        attempt1: attemptsMap[1] || null,
        attempt2: attemptsMap[2] || null,
        attempt3: attemptsMap[3] || null
      };
    });

    // Find current round and next athlete
    let currentRound = currentState.current_attempt_no;
    let nextAthlete = findNextAthleteForRound(athleteData, currentRound);

    // If no athlete found in current round, try next round
    if (!nextAthlete && currentRound < 3) {
      currentRound++;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }

    // If still no athlete, try round 3
    if (!nextAthlete && currentRound < 3) {
      currentRound = 3;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }

    // Update current_state
    await updateCurrentState(groupId, liftId, {
      current_attempt_no: currentRound,
      current_weight_in_info_id: nextAthlete?.weight_in_info_id || null,
      completed: !nextAthlete
    });

    return res.json({
      success: true,
      currentState: {
        current_round: currentRound,
        current_weight_in_info_id: nextAthlete?.weight_in_info_id || null,
        completed: !nextAthlete
      },
      nextAthlete: nextAthlete ? {
        weight_in_info_id: nextAthlete.weight_in_info_id,
        first_name: nextAthlete.athlete?.first_name,
        last_name: nextAthlete.athlete?.last_name
      } : null
    });

  } catch (error: any) {
    console.error('Error in advanceToNextAthlete:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// ============================================
// JUDGE AND ADVANCE (OPTIMIZED - SINGLE CALL)
// ============================================

/**
 * Combined operation: Mark attempt as VALID/INVALID AND advance to next athlete
 * This is the optimized version that combines two operations into one API call
 * Reduces latency by 50% compared to separate calls
 */
export async function judgeAndAdvance(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { attemptId, status, groupId, liftId } = req.body;

    if (!attemptId || !status || !groupId || !liftId) {
      return res.status(400).json({
        success: false,
        error: 'attemptId, status, groupId, and liftId are required'
      });
    }

    if (!['VALID', 'INVALID'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be VALID or INVALID'
      });
    }

    // STEP 1: Update attempt status (fast, single DB operation)
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('attempts')
      .update({ status })
      .eq('id', attemptId)
      .select('id, weight_kg, status')
      .single();

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update attempt'
      });
    }

    // STEP 2: Get current state for this group+lift
    const currentState = await getOrCreateCurrentState(groupId, liftId);
    
    if (!currentState) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get current state'
      });
    }

    // STEP 3: Get all athletes in this group (batch query - optimized)
    const { data: nominations } = await supabaseAdmin
      .from('nomination')
      .select('id')
      .eq('group_id', groupId);

    if (!nominations || nominations.length === 0) {
      return res.json({
        success: true,
        attempt: updatedAttempt,
        currentState: {
          current_round: currentState.current_attempt_no,
          current_weight_in_info_id: null,
          completed: true
        },
        nextAthlete: null
      });
    }

    const nomIds = nominations.map(n => n.id);
    const { data: weighInInfos } = await supabaseAdmin
      .from('weight_in_info')
      .select('id, nomination_id, bodyweight_kg')
      .in('nomination_id', nomIds);

    if (!weighInInfos || weighInInfos.length === 0) {
      return res.json({
        success: true,
        attempt: updatedAttempt,
        currentState: {
          current_round: currentState.current_attempt_no,
          current_weight_in_info_id: null,
          completed: true
        },
        nextAthlete: null
      });
    }

    // STEP 4: Get all attempts for these athletes (single batch query)
    const wiiIds = weighInInfos.map(w => w.id);
    const { data: allAttempts } = await supabaseAdmin
      .from('attempts')
      .select('id, weight_in_info_id, attempt_no, weight_kg, status')
      .in('weight_in_info_id', wiiIds)
      .eq('lift_id', liftId);

    // STEP 5: Build minimal athlete data for next athlete calculation
    const athleteData = weighInInfos.map(wii => {
      const attempts = (allAttempts || []).filter(a => a.weight_in_info_id === wii.id);
      
      const attemptsMap: Record<number, any> = {};
      attempts.forEach(att => {
        attemptsMap[att.attempt_no] = {
          id: att.id,
          weight_kg: Number(att.weight_kg),
          status: att.status
        };
      });

      return {
        weight_in_info_id: wii.id,
        bodyweight_kg: wii.bodyweight_kg,
        attempt1: attemptsMap[1] || null,
        attempt2: attemptsMap[2] || null,
        attempt3: attemptsMap[3] || null
      };
    });

    // STEP 6: Find next athlete
    let currentRound = currentState.current_attempt_no;
    let nextAthlete = findNextAthleteForRound(athleteData, currentRound);

    // If no athlete found in current round, try next round
    if (!nextAthlete && currentRound < 3) {
      currentRound++;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }

    // If still no athlete, try round 3
    if (!nextAthlete && currentRound < 3) {
      currentRound = 3;
      nextAthlete = findNextAthleteForRound(athleteData, currentRound);
    }

    // STEP 7: Update current_state
    await updateCurrentState(groupId, liftId, {
      current_attempt_no: currentRound,
      current_weight_in_info_id: nextAthlete?.weight_in_info_id || null,
      completed: !nextAthlete
    });

    return res.json({
      success: true,
      attempt: updatedAttempt,
      currentState: {
        current_round: currentRound,
        current_weight_in_info_id: nextAthlete?.weight_in_info_id || null,
        completed: !nextAthlete
      },
      nextAthlete: nextAthlete ? {
        weight_in_info_id: nextAthlete.weight_in_info_id
      } : null
    });

  } catch (error: any) {
    console.error('Error in judgeAndAdvance:', error);
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
  createNextAttempt,
  advanceToNextAthlete,
  judgeAndAdvance
};
