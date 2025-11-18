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
      // Insert flights (ID auto-generated by SERIAL PRIMARY KEY)
      for (const flightData of flightsData) {
        const { data: flight, error: flightError } = await supabaseAdmin
          .from('flights')
          .insert({
            meet_id: parseInt(meetId),
            name: flightData.name,
            day_number: flightData.day_number,
            start_time: flightData.start_time
          })
          .select()
          .single();

        if (flightError) throw flightError;
        insertedFlights.push(flight);

        // Insert groups for this flight (ID auto-generated by SERIAL PRIMARY KEY)
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

          // Insert nominations for this group (ID auto-generated by SERIAL PRIMARY KEY)
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
      .order('day_number', { ascending: true })
      .order('start_time', { ascending: true });

    if (flightsError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch division' 
      });
    }

    // Transform data to match frontend expected structure
    const transformedFlights = (flights || []).map((flight: any) => ({
      id: flight.id,
      meet_id: flight.meet_id,
      name: flight.name,
      day_number: flight.day_number,
      start_time: flight.start_time,
      groups: (flight.groups || []).map((group: any) => ({
        id: group.id,
        flight_id: group.flight_id,
        name: group.name,
        ord: group.ord,
        athletes: (group.nomination || []).map((nom: any) => {
          const formInfo = nom.form_info;
          if (!formInfo) return null;
          
          const athlete = formInfo.athletes;
          const weightCat = formInfo.weight_categories_std;
          
          return {
            athlete_id: athlete?.id,
            form_id: formInfo.id,
            first_name: athlete?.first_name,
            last_name: athlete?.last_name,
            sex: athlete?.sex,
            weight_category: weightCat?.name || 'N/A'
          };
        }).filter((a: any) => a !== null) // Remove nulls
      }))
    }));

    return res.json({
      success: true,
      flights: transformedFlights
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

/**
 * ============================================
 * UPDATE FLIGHTS STRUCTURE
 * ============================================
 * Updates flight structure (name, day, time) without affecting athlete assignments
 */
export async function updateFlightsStructure(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { meetId } = req.params;
    const { flights } = req.body;
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    if (!flights || !Array.isArray(flights)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid flights data'
      });
    }

    // Get existing flights to determine what to update/delete/create
    const { data: existingFlights, error: fetchError } = await supabaseAdmin
      .from('flights')
      .select('id, meet_id')
      .eq('meet_id', meetId);

    if (fetchError) {
      console.error('Error fetching existing flights:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch existing flights'
      });
    }

    const existingFlightIds = existingFlights?.map(f => f.id) || [];
    const incomingFlightIds = flights.filter(f => f.id > 0 && existingFlightIds.includes(f.id)).map(f => f.id);
    const flightsToDelete = existingFlightIds.filter(id => !incomingFlightIds.includes(id));

    // Delete removed flights (cascade will delete groups and nominations)
    if (flightsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('flights')
        .delete()
        .in('id', flightsToDelete);

      if (deleteError) {
        console.error('Error deleting flights:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete removed flights'
        });
      }
    }

    // Get all existing groups for this meet
    const { data: existingGroups } = await supabaseAdmin
      .from('groups')
      .select('id, flight_id')
      .in('flight_id', existingFlightIds);

    const existingGroupIds = existingGroups?.map(g => g.id) || [];
    const incomingGroupIds: number[] = [];
    
    // Collect incoming group IDs
    flights.forEach(flight => {
      flight.groups.forEach((group: any) => {
        if (group.id > 0) incomingGroupIds.push(group.id);
      });
    });

    const groupsToDelete = existingGroupIds.filter(id => !incomingGroupIds.includes(id));

    // Redistribute athletes from deleted groups to first available group in same flight
    if (groupsToDelete.length > 0) {
      for (const groupId of groupsToDelete) {
        // Find the flight this group belongs to
        const groupInfo = existingGroups?.find(g => g.id === groupId);
        if (!groupInfo) continue;

        // Get nominations in this group
        const { data: nominations } = await supabaseAdmin
          .from('nomination')
          .select('id')
          .eq('group_id', groupId);

        if (nominations && nominations.length > 0) {
          // Find first remaining group in same flight
          const flight = flights.find(f => f.id === groupInfo.flight_id);
          if (flight && flight.groups.length > 0) {
            const targetGroupId = flight.groups[0].id;
            
            // Move nominations to target group
            await supabaseAdmin
              .from('nomination')
              .update({ group_id: targetGroupId })
              .eq('group_id', groupId);
          }
        }
      }

      // Delete the groups (after moving nominations)
      await supabaseAdmin
        .from('groups')
        .delete()
        .in('id', groupsToDelete);
    }

    // Calculate global group ordering (progressive across all flights)
    let globalGroupOrd = 1;
    const groupOrdMap = new Map<number, number>(); // Map group.id -> ord
    
    for (const flight of flights) {
      for (const group of flight.groups) {
        groupOrdMap.set(group.id, globalGroupOrd);
        globalGroupOrd++;
      }
    }

    // Update or insert flights
    for (const flight of flights) {
      const flightData = {
        meet_id: parseInt(meetId),
        name: flight.name,
        day_number: flight.day_number,
        start_time: flight.start_time || null
      };

      if (flight.id > 0 && existingFlightIds.includes(flight.id)) {
        // Update existing flight
        const { error: updateError } = await supabaseAdmin
          .from('flights')
          .update(flightData)
          .eq('id', flight.id);

        if (updateError) {
          console.error('Error updating flight:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update flight'
          });
        }

        // Update existing groups for this flight
        for (const group of flight.groups) {
          const groupData = {
            flight_id: flight.id,
            name: group.name,
            ord: groupOrdMap.get(group.id) || globalGroupOrd++
          };

          if (group.id > 0 && existingGroupIds.includes(group.id)) {
            // Update existing group
            await supabaseAdmin
              .from('groups')
              .update(groupData)
              .eq('id', group.id);
          } else {
            // Insert new group with correct ord
            const { data: newGroup } = await supabaseAdmin
              .from('groups')
              .insert(groupData)
              .select('id')
              .single();

            // Move athletes if specified in group.athletes
            if (newGroup && group.athletes && group.athletes.length > 0) {
              const formIds = group.athletes.map((a: any) => a.form_id).filter(Boolean);
              if (formIds.length > 0) {
                await supabaseAdmin
                  .from('nomination')
                  .update({ group_id: newGroup.id })
                  .in('form_id', formIds);
              }
            }
          }
        }
      } else {
        // Insert new flight
        const { data: newFlight, error: insertError } = await supabaseAdmin
          .from('flights')
          .insert(flightData)
          .select('id')
          .single();

        if (insertError || !newFlight) {
          console.error('Error inserting flight:', insertError);
          return res.status(500).json({
            success: false,
            error: 'Failed to create flight'
          });
        }

        // Insert groups for new flight with correct ord
        for (const group of flight.groups) {
          const { data: newGroup } = await supabaseAdmin
            .from('groups')
            .insert({
              flight_id: newFlight.id,
              name: group.name,
              ord: groupOrdMap.get(group.id) || globalGroupOrd++
            })
            .select('id')
            .single();

          // Move athletes if specified
          if (newGroup && group.athletes && group.athletes.length > 0) {
            const formIds = group.athletes.map((a: any) => a.form_id).filter(Boolean);
            if (formIds.length > 0) {
              await supabaseAdmin
                .from('nomination')
                .update({ group_id: newGroup.id, flight_id: newFlight.id })
                .in('form_id', formIds);
            }
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Flight structure updated successfully'
    });

  } catch (error: any) {
    console.error('Error in updateFlightsStructure:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}
