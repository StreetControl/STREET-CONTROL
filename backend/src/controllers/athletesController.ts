/**
 * ATHLETES CONTROLLER
 * Handles athlete management operations
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

/**
 * ============================================
 * GET ATHLETES FOR A MEET
 * ============================================
 */
export async function getAthletes(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;

    if (!meetId) {
      return res.status(400).json({
        success: false,
        error: 'Meet ID is required'
      });
    }

    // Get all athletes registered for this meet via form_info
    const { data: formInfos, error: formError } = await supabaseAdmin
      .from('form_info')
      .select(`
        id,
        athlete_id,
        athletes (
          id,
          cf,
          first_name,
          last_name,
          sex,
          birth_date
        )
      `)
      .eq('meet_id', meetId);

    if (formError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch athletes'
      });
    }

    return res.json({
      success: true,
      athletes: formInfos || []
    });
  } catch (error: any) {
    console.error('Error in getAthletes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * CREATE SINGLE ATHLETE
 * ============================================
 */
export async function createAthlete(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;
    const { cf, firstName, lastName, sex, birthDate } = req.body;

    // Validation
    if (!cf || !firstName || !lastName || !sex || !birthDate) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: cf, firstName, lastName, sex, birthDate'
      });
    }

    if (!['M', 'F'].includes(sex)) {
      return res.status(400).json({
        success: false,
        error: 'Sex must be M or F'
      });
    }

    // Check if athlete already exists by CF
    const { data: existingAthlete } = await supabaseAdmin
      .from('athletes')
      .select('id')
      .eq('cf', cf)
      .single();

    let athleteId: number;

    if (existingAthlete) {
      // Athlete exists, use existing ID
      athleteId = existingAthlete.id;
    } else {
      // Create new athlete
      const { data: newAthlete, error: athleteError } = await supabaseAdmin
        .from('athletes')
        .insert({
          cf,
          first_name: firstName,
          last_name: lastName,
          sex,
          birth_date: birthDate
        })
        .select('id')
        .single();

      if (athleteError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create athlete'
        });
      }

      athleteId = newAthlete.id;
    }

    // Check if athlete is already registered for this meet
    const { data: existingFormInfo } = await supabaseAdmin
      .from('form_info')
      .select('id')
      .eq('meet_id', meetId)
      .eq('athlete_id', athleteId)
      .single();

    if (existingFormInfo) {
      return res.status(400).json({
        success: false,
        error: 'Athlete already registered for this meet'
      });
    }

    // Get default weight and age categories (first available)
    const { data: weightCat } = await supabaseAdmin
      .from('weight_categories_std')
      .select('id')
      .eq('sex', sex)
      .order('ord')
      .limit(1)
      .single();

    const { data: ageCat } = await supabaseAdmin
      .from('age_categories_std')
      .select('id')
      .order('ord')
      .limit(1)
      .single();

    if (!weightCat || !ageCat) {
      return res.status(500).json({
        success: false,
        error: 'Default categories not found'
      });
    }

    // Register athlete for the meet in form_info
    const { data: formInfo, error: formError } = await supabaseAdmin
      .from('form_info')
      .insert({
        meet_id: parseInt(meetId),
        athlete_id: athleteId,
        weight_cat_id: weightCat.id,
        age_cat_id: ageCat.id
      })
      .select('id')
      .single();

    if (formError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to register athlete for meet'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Athlete registered successfully',
      athleteId,
      formInfoId: formInfo.id
    });

  } catch (error: any) {
    console.error('Error in createAthlete:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * BULK CREATE ATHLETES FROM CSV
 * ============================================
 * 
 * Expected CSV format:
 * first_name,last_name,birth_date,weight_category,sex,cf,team,max_sq,max_pu,max_dip,max_mp,max_mu
 * Mario,Rossi,1995-06-15,-80M,M,RSSMRA95H15H501Z,Team Alpha,120.5,15,25,,
 */
export async function bulkCreateAthletes(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;
    const { athletes } = req.body; // Array of athlete objects

    if (!Array.isArray(athletes) || athletes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Athletes array is required and cannot be empty'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Get default categories
    const { data: weightCatM } = await supabaseAdmin
      .from('weight_categories_std')
      .select('id')
      .eq('sex', 'M')
      .order('ord')
      .limit(1)
      .single();

    const { data: weightCatF } = await supabaseAdmin
      .from('weight_categories_std')
      .select('id')
      .eq('sex', 'F')
      .order('ord')
      .limit(1)
      .single();

    const { data: ageCat } = await supabaseAdmin
      .from('age_categories_std')
      .select('id')
      .order('ord')
      .limit(1)
      .single();

    if (!weightCatM || !weightCatF || !ageCat) {
      return res.status(500).json({
        success: false,
        error: 'Default categories not found in database'
      });
    }

    // Process each athlete
    for (const athlete of athletes) {
      try {
        const { cf, firstName, lastName, sex, birthDate } = athlete;

        // Validation
        if (!cf || !firstName || !lastName || !sex || !birthDate) {
          results.failed++;
          results.errors.push(`Athlete ${cf || 'unknown'}: Missing required fields`);
          continue;
        }

        if (!['M', 'F'].includes(sex)) {
          results.failed++;
          results.errors.push(`Athlete ${cf}: Invalid sex (must be M or F)`);
          continue;
        }

        // Check if athlete exists
        const { data: existingAthlete } = await supabaseAdmin
          .from('athletes')
          .select('id')
          .eq('cf', cf)
          .single();

        let athleteId: number;

        if (existingAthlete) {
          athleteId = existingAthlete.id;
        } else {
          // Create new athlete
          const { data: newAthlete, error: athleteError } = await supabaseAdmin
            .from('athletes')
            .insert({
              cf,
              first_name: firstName,
              last_name: lastName,
              sex,
              birth_date: birthDate
            })
            .select('id')
            .single();

          if (athleteError) {
            results.failed++;
            results.errors.push(`Athlete ${cf}: Failed to create - ${athleteError.message}`);
            continue;
          }

          athleteId = newAthlete.id;
        }

        // Check if already registered for this meet
        const { data: existingFormInfo } = await supabaseAdmin
          .from('form_info')
          .select('id')
          .eq('meet_id', meetId)
          .eq('athlete_id', athleteId)
          .single();

        if (existingFormInfo) {
          results.failed++;
          results.errors.push(`Athlete ${cf}: Already registered for this meet`);
          continue;
        }

        // Register for meet
        const weightCatId = sex === 'M' ? weightCatM.id : weightCatF.id;

        const { error: formError } = await supabaseAdmin
          .from('form_info')
          .insert({
            meet_id: parseInt(meetId),
            athlete_id: athleteId,
            weight_cat_id: weightCatId,
            age_cat_id: ageCat.id
          });

        if (formError) {
          results.failed++;
          results.errors.push(`Athlete ${cf}: Failed to register - ${formError.message}`);
          continue;
        }

        results.success++;

      } catch (err: any) {
        results.failed++;
        results.errors.push(`Athlete ${athlete.cf || 'unknown'}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${results.success} athletes, ${results.failed} failed`,
      results
    });

  } catch (error: any) {
    console.error('Error in bulkCreateAthletes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * UPDATE ATHLETE
 * ============================================
 */
export async function updateAthlete(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { athleteId } = req.params;
    const { firstName, lastName, sex, birthDate } = req.body;

    const updateData: any = {};

    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (sex) {
      if (!['M', 'F'].includes(sex)) {
        return res.status(400).json({
          success: false,
          error: 'Sex must be M or F'
        });
      }
      updateData.sex = sex;
    }
    if (birthDate) updateData.birth_date = birthDate;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const { error } = await supabaseAdmin
      .from('athletes')
      .update(updateData)
      .eq('id', athleteId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update athlete'
      });
    }

    return res.json({
      success: true,
      message: 'Athlete updated successfully'
    });

  } catch (error: any) {
    console.error('Error in updateAthlete:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * ============================================
 * DELETE ATHLETE FROM MEET
 * ============================================
 */
export async function deleteAthleteFromMeet(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId, athleteId } = req.params;

    // Delete from form_info (this will cascade delete related data)
    const { error } = await supabaseAdmin
      .from('form_info')
      .delete()
      .eq('meet_id', meetId)
      .eq('athlete_id', athleteId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to remove athlete from meet'
      });
    }

    return res.json({
      success: true,
      message: 'Athlete removed from meet successfully'
    });

  } catch (error: any) {
    console.error('Error in deleteAthleteFromMeet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
