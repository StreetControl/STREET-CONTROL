/**
 * WEIGH-IN CONTROLLER
 * Handles pre-competition weigh-in operations
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

/**
 * ============================================
 * GET WEIGH-IN ATHLETES
 * ============================================
 * 
 * Returns all athletes for a meet organized by flights and groups
 * with their weigh-in data (if already entered)
 */
export async function getWeighInAthletes(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;

    if (!meetId) {
      return res.status(400).json({
        success: false,
        error: 'Meet ID is required'
      });
    }

    // Get meet info and lifts for this meet type
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
      .select('lift_id, sequence')
      .eq('meet_type_id', meet.meet_type_id)
      .order('sequence');

    if (liftsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch meet lifts'
      });
    }

    const liftIds = meetTypeLifts?.map(l => l.lift_id) || [];

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

    if (!flights || flights.length === 0) {
      return res.json({
        success: true,
        flights: [],
        lifts: liftIds
      });
    }

    // For each flight, get groups and athletes
    const flightsWithAthletes = await Promise.all(
      flights.map(async (flight) => {
        const groups = Array.isArray(flight.groups) ? flight.groups : [];

        const groupsWithAthletes = await Promise.all(
          groups.map(async (group: any) => {
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
                    sex,
                    birth_date
                  ),
                  weight_categories_std (
                    id,
                    name
                  )
                )
              `)
              .eq('group_id', group.id);

            if (nomError) {
              console.error('Error fetching nominations:', nomError);
              return {
                ...group,
                athletes: []
              };
            }

            // For each athlete, get weigh-in data and attempts
            const athletes = await Promise.all(
              (nominations || []).map(async (nom: any) => {
                const formInfo = nom.form_info;
                const athlete = formInfo?.athletes;
                const weightCat = formInfo?.weight_categories_std;

                // Get or create weight_in_info
                const { data: weighInData } = await supabaseAdmin
                  .from('weight_in_info')
                  .select('*')
                  .eq('nomination_id', nom.id)
                  .maybeSingle();

                // Get existing attempts (openers) for this athlete
                const openers: Record<string, number | null> = {};
                
                if (weighInData) {
                  const { data: attempts } = await supabaseAdmin
                    .from('attempts')
                    .select('lift_id, weight_kg')
                    .eq('weight_in_info_id', weighInData.id)
                    .eq('attempt_no', 1);

                  if (attempts) {
                    attempts.forEach((att: any) => {
                      openers[att.lift_id] = att.weight_kg;
                    });
                  }
                }

                return {
                  nomination_id: nom.id,
                  form_id: formInfo?.id,
                  athlete_id: athlete?.id,
                  cf: athlete?.cf,
                  first_name: athlete?.first_name,
                  last_name: athlete?.last_name,
                  sex: athlete?.sex,
                  birth_date: athlete?.birth_date,
                  weight_category: weightCat?.name,
                  weight_cat_id: formInfo?.weight_cat_id,
                  // Weigh-in data
                  weight_in_info_id: weighInData?.id || null,
                  bodyweight_kg: weighInData?.bodyweight_kg || null,
                  rack_height: weighInData?.rack_height || 0,
                  belt_height: weighInData?.belt_height || 0,
                  out_of_weight: weighInData?.out_of_weight || 0,
                  notes: weighInData?.notes || '',
                  // Openers (first attempts)
                  openers
                };
              })
            );

            return {
              id: group.id,
              name: group.name,
              ord: group.ord,
              athletes: athletes.filter(a => a.athlete_id) // Filter out null athletes
            };
          })
        );

        return {
          id: flight.id,
          name: flight.name,
          day_number: flight.day_number,
          start_time: flight.start_time,
          groups: groupsWithAthletes.sort((a, b) => a.ord - b.ord)
        };
      })
    );

    return res.json({
      success: true,
      flights: flightsWithAthletes,
      lifts: liftIds
    });

  } catch (error: any) {
    console.error('Error in getWeighInAthletes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * UPDATE WEIGH-IN DATA
 * ============================================
 * 
 * Updates weigh-in data and openers for a specific athlete (nomination)
 */
export async function updateWeighIn(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { nominationId } = req.params;
    const { 
      bodyweight_kg, 
      rack_height, 
      belt_height, 
      out_of_weight, 
      notes,
      openers // { 'MU': 15, 'PU': 60, 'DIP': 90, 'SQ': 160 }
    } = req.body;

    if (!nominationId) {
      return res.status(400).json({
        success: false,
        error: 'Nomination ID is required'
      });
    }

    // Validate nomination exists
    const { data: nomination, error: nomError } = await supabaseAdmin
      .from('nomination')
      .select('id')
      .eq('id', nominationId)
      .single();

    if (nomError || !nomination) {
      return res.status(404).json({
        success: false,
        error: 'Nomination not found'
      });
    }

    // Check if weight_in_info already exists
    const { data: existingWeighIn } = await supabaseAdmin
      .from('weight_in_info')
      .select('id')
      .eq('nomination_id', nominationId)
      .maybeSingle();

    let weighInInfoId: number;

    if (existingWeighIn) {
      // UPDATE existing record
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('weight_in_info')
        .update({
          bodyweight_kg: bodyweight_kg || null,
          rack_height: rack_height || 0,
          belt_height: belt_height || 0,
          out_of_weight: out_of_weight || 0,
          notes: notes || null
        })
        .eq('id', existingWeighIn.id)
        .select('id')
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update weigh-in data'
        });
      }

      weighInInfoId = updated.id;

    } else {
      // INSERT new record
      const { data: created, error: insertError } = await supabaseAdmin
        .from('weight_in_info')
        .insert({
          nomination_id: parseInt(nominationId),
          bodyweight_kg: bodyweight_kg || null,
          rack_height: rack_height || 0,
          belt_height: belt_height || 0,
          out_of_weight: out_of_weight || 0,
          notes: notes || null
        })
        .select('id')
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create weigh-in data'
        });
      }

      weighInInfoId = created.id;
    }

    // Update openers (attempts with attempt_no = 1)
    if (openers && typeof openers === 'object') {
      const liftIds = Object.keys(openers);

      for (const liftId of liftIds) {
        const weight = openers[liftId];

        if (weight === null || weight === undefined || weight === '') {
          // Skip empty openers
          continue;
        }

        // Check if attempt already exists
        const { data: existingAttempt } = await supabaseAdmin
          .from('attempts')
          .select('id')
          .eq('weight_in_info_id', weighInInfoId)
          .eq('lift_id', liftId)
          .eq('attempt_no', 1)
          .maybeSingle();

        if (existingAttempt) {
          // UPDATE existing attempt
          await supabaseAdmin
            .from('attempts')
            .update({
              weight_kg: parseFloat(weight)
            })
            .eq('id', existingAttempt.id);
        } else {
          // INSERT new attempt
          await supabaseAdmin
            .from('attempts')
            .insert({
              weight_in_info_id: weighInInfoId,
              lift_id: liftId,
              attempt_no: 1,
              weight_kg: parseFloat(weight),
              status: 'PENDING'
            });
        }
      }
    }

    return res.json({
      success: true,
      message: 'Weigh-in data saved successfully',
      weight_in_info_id: weighInInfoId
    });

  } catch (error: any) {
    console.error('Error in updateWeighIn:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
