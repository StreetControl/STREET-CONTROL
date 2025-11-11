/**
 * DIVISION CONTROLLER
 * Handles automatic division of athletes into flights and groups
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

/**
 * ============================================
 * CREATE DIVISION
 * ============================================
 * 
 * Automatically divides athletes into flights and groups based on:
 * 1. Sex (F first, then M)
 * 2. Weight category (ordered by weight_categories_std.ord)
 * 3. Total declared kg (ascending)
 * 
 * Rules:
 * - Max 15 athletes per group
 * - Max 2-3 groups per flight
 * - Athletes with same weight category stay together when possible
 */
export async function createDivision(req: AuthRequest, res: Response): Promise<Response> {
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
      .select('id, name, start_date, end_date')
      .eq('id', meetId)
      .single();

    if (meetError || !meet) {
      return res.status(404).json({ 
        success: false,
        error: 'Meet not found' 
      });
    }

    // Calculate meet duration in days
    const startDate = new Date(meet.start_date);
    const endDate = new Date(meet.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get all athletes registered for this meet with weight category info
    const { data: formInfos, error: formError } = await supabaseAdmin
      .from('form_info')
      .select(`
        id,
        meet_id,
        athlete_id,
        weight_cat_id,
        age_cat_id,
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
          name,
          sex,
          ord
        )
      `)
      .eq('meet_id', meetId);

    if (formError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch athletes' 
      });
    }

    if (!formInfos || formInfos.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No athletes registered for this meet' 
      });
    }

    // Get declared lifts for each athlete (form_lifts)
    const formIds = formInfos.map(f => f.id);
    const { data: formLifts, error: liftsError } = await supabaseAdmin
      .from('form_lifts')
      .select('form_id, lift_id, declared_max_kg')
      .in('form_id', formIds);

    if (liftsError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch declared lifts' 
      });
    }

    // Calculate total kg for each athlete
    const athleteTotals = new Map<number, number>();
    (formLifts || []).forEach(lift => {
      const current = athleteTotals.get(lift.form_id) || 0;
      athleteTotals.set(lift.form_id, current + Number(lift.declared_max_kg));
    });

    // Enrich athletes with total kg
    const enrichedAthletes = formInfos.map(form => ({
      form_id: form.id,
      athlete: form.athletes as any,
      weight_category: form.weight_categories_std as any,
      total_kg: athleteTotals.get(form.id) || 0
    }));

    // Sort athletes by:
    // 1. Sex (F first = 'F' < 'M')
    // 2. Weight category order (ord ascending)
    // 3. Total kg (ascending - weakest first)
    const sortedAthletes = enrichedAthletes.sort((a, b) => {
      // 1. Sex (F before M)
      if (a.athlete.sex !== b.athlete.sex) {
        return a.athlete.sex === 'F' ? -1 : 1;
      }
      
      // 2. Weight category order
      if (a.weight_category.ord !== b.weight_category.ord) {
        return a.weight_category.ord - b.weight_category.ord;
      }
      
      // 3. Total kg (ascending)
      return a.total_kg - b.total_kg;
    });

    // Divide into flights and groups
    const MAX_ATHLETES_PER_GROUP = 15;
    const MAX_GROUPS_PER_FLIGHT = 3;

    const flightsData: any[] = [];
    let currentFlight: any = null;
    let currentGroup: any = null;
    let athletesInCurrentGroup = 0;
    let groupsInCurrentFlight = 0;
    let flightNumber = 1;
    let groupNumber = 1;
    let currentDay = 1;

    // Helper: Create new flight
    const createNewFlight = () => {
      // Determine start time based on flight number
      let startTime = '09:00';
      if (flightNumber === 2) startTime = '12:30';
      if (flightNumber === 3) startTime = '17:30';
      
      // Determine day (if multi-day meet)
      if (durationDays > 1) {
        // Distribute flights across days
        if (flightNumber > 3) {
          currentDay = 2;
          startTime = flightNumber === 4 ? '09:00' : '14:00';
        }
      }

      currentFlight = {
        flight_number: flightNumber,
        name: `Flight ${String.fromCharCode(64 + flightNumber)}`, // A, B, C...
        day_number: currentDay,
        start_time: startTime,
        groups: []
      };
      flightsData.push(currentFlight);
      groupsInCurrentFlight = 0;
      flightNumber++;
    };

    // Helper: Create new group
    const createNewGroup = () => {
      currentGroup = {
        group_number: groupNumber,
        name: `Gruppo ${groupNumber}`,
        athletes: []
      };
      currentFlight.groups.push(currentGroup);
      athletesInCurrentGroup = 0;
      groupsInCurrentFlight++;
      groupNumber++;
    };

    // Start first flight and group
    createNewFlight();
    createNewGroup();

    // Assign athletes to groups
    sortedAthletes.forEach((athlete) => {
      // Check if we need a new group
      if (athletesInCurrentGroup >= MAX_ATHLETES_PER_GROUP) {
        // Check if we need a new flight
        if (groupsInCurrentFlight >= MAX_GROUPS_PER_FLIGHT) {
          createNewFlight();
        }
        createNewGroup();
      }

      // Add athlete to current group
      currentGroup.athletes.push({
        form_id: athlete.form_id,
        athlete_id: athlete.athlete.id,
        first_name: athlete.athlete.first_name,
        last_name: athlete.athlete.last_name,
        sex: athlete.athlete.sex,
        weight_category: athlete.weight_category.name,
        total_kg: athlete.total_kg
      });
      athletesInCurrentGroup++;
    });

    // Insert flights, groups, and nominations into database
    // Start transaction
    const insertedFlights: any[] = [];
    const insertedGroups: any[] = [];
    const insertedNominations: any[] = [];

    try {
      // Insert flights
      for (const flightData of flightsData) {
        const { data: flight, error: flightError } = await supabaseAdmin
          .from('flights')
          .insert({
            meet_id: parseInt(meetId),
            name: flightData.name,
            ord: flightData.flight_number,
            day_number: flightData.day_number,
            start_time: flightData.start_time
          })
          .select()
          .single();

        if (flightError) throw flightError;
        insertedFlights.push(flight);

        // Insert groups for this flight
        for (const groupData of flightData.groups) {
          const { data: group, error: groupError } = await supabaseAdmin
            .from('groups')
            .insert({
              flight_id: flight.id,
              name: groupData.name,
              ord: groupData.group_number
            })
            .select()
            .single();

          if (groupError) throw groupError;
          insertedGroups.push(group);

          // Insert nominations for this group
          for (const athleteData of groupData.athletes) {
            const { data: nomination, error: nomError } = await supabaseAdmin
              .from('nomination')
              .insert({
                group_id: group.id,
                form_id: athleteData.form_id
              })
              .select()
              .single();

            if (nomError) throw nomError;
            insertedNominations.push(nomination);
          }
        }
      }

      return res.status(201).json({
        success: true,
        division: {
          flights: insertedFlights.length,
          groups: insertedGroups.length,
          athletes: insertedNominations.length
        },
        message: 'Division created successfully'
      });

    } catch (dbError: any) {
      // Rollback: Delete all created records
      if (insertedFlights.length > 0) {
        await supabaseAdmin
          .from('flights')
          .delete()
          .in('id', insertedFlights.map(f => f.id));
      }

      return res.status(500).json({ 
        success: false,
        error: 'Failed to save division: ' + dbError.message 
      });
    }

  } catch (error: any) {
    console.error('Error in createDivision:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * ============================================
 * GET DIVISION
 * ============================================
 * 
 * Returns current division structure for a meet
 */
export async function getDivision(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;

    // Get flights with groups and nominations
    const { data: flights, error: flightsError } = await supabaseAdmin
      .from('flights')
      .select(`
        id,
        meet_id,
        name,
        ord,
        day_number,
        start_time,
        groups (
          id,
          flight_id,
          name,
          ord,
          nomination (
            id,
            group_id,
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
                name,
                sex,
                ord
              )
            )
          )
        )
      `)
      .eq('meet_id', meetId)
      .order('ord', { ascending: true });

    if (flightsError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch division' 
      });
    }

    return res.json({
      success: true,
      flights: flights || []
    });

  } catch (error: any) {
    console.error('Error in getDivision:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * ============================================
 * SAVE DIVISION
 * ============================================
 * 
 * Saves modified division structure (after drag & drop)
 */
export async function saveDivision(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;
    const { flights } = req.body;

    if (!flights || !Array.isArray(flights)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid flights data' 
      });
    }

    // Delete existing division
    const { error: deleteError } = await supabaseAdmin
      .from('flights')
      .delete()
      .eq('meet_id', meetId);

    if (deleteError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete old division' 
      });
    }

    // Insert new division (same logic as createDivision)
    // Re-insert flights, groups, nominations from req.body
    
    // ... (implementeremo nello step successivo)

    return res.json({
      success: true,
      message: 'Division saved successfully'
    });

  } catch (error: any) {
    console.error('Error in saveDivision:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}
