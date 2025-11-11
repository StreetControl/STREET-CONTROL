/**
 * MEETS CONTROLLER
 * Handles competition/meet management operations
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import type { AuthRequest } from '../types';

/**
 * ============================================
 * GET MEETS
 * ============================================
 * 
 * Returns all meets for the authenticated user's federation
 * Sorted by start_date descending (newest first)
 */
export async function getMeets(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Get user from DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_uid', authUser.auth_uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Get all federation_ids for this user via user_federations junction table
    const { data: userFederations, error: ufError } = await supabaseAdmin
      .from('user_federations')
      .select('federation_id')
      .eq('user_id', user.id);

    if (ufError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch user federations' 
      });
    }

    if (!userFederations || userFederations.length === 0) {
      // User not associated with any federation
      return res.json({
        success: true,
        meets: []
      });
    }

    // Extract federation IDs
    const federationIds = userFederations.map(uf => uf.federation_id);

    // Fetch all meets for these federations
    const { data: meets, error: meetsError } = await supabaseAdmin
      .from('meets')
      .select(`
        id,
        federation_id,
        meet_code,
        name,
        start_date,
        level,
        regulation_code,
        meet_type_id,
        score_type,
        meet_types (
          id,
          name
        )
      `)
      .in('federation_id', federationIds)
      .order('start_date', { ascending: false });

    if (meetsError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch meets' 
      });
    }

    // Add status field based on start_date
    const meetsWithStatus = (meets || []).map(meet => {
      const startDate = new Date(meet.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';
      
      if (startDate > today) {
        status = 'SETUP'; // Future meet
      } else if (startDate.toDateString() === today.toDateString()) {
        status = 'IN_PROGRESS'; // Today
      } else {
        status = 'COMPLETED'; // Past
      }

      return {
        ...meet,
        status
      };
    });

    return res.json({
      success: true,
      meets: meetsWithStatus
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * ============================================
 * CREATE MEET
 * ============================================
 * 
 * Creates a new meet for the authenticated user's federation
 */
export async function createMeet(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Get user from DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_uid', authUser.auth_uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Get user's primary federation (first one if multiple)
    const { data: userFederations, error: ufError } = await supabaseAdmin
      .from('user_federations')
      .select('federation_id, federations(id, name, code)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (ufError || !userFederations) {
      return res.status(400).json({ 
        success: false,
        error: 'User not associated with any federation' 
      });
    }

    const federation = userFederations.federations as any;
    const federation_id = userFederations.federation_id;

    // Extract request body
    const { name, meet_type_id, start_date, end_date, level, regulation_code, score_type } = req.body;

    // Validation
    if (!name || !meet_type_id || !start_date || !end_date || !level || !regulation_code || !score_type) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: name, meet_type_id, start_date, end_date, level, regulation_code, score_type' 
      });
    }

    // Validate meet_type_id exists
    const { data: meetType, error: meetTypeError } = await supabaseAdmin
      .from('meet_types')
      .select('id')
      .eq('id', meet_type_id)
      .single();

    if (meetTypeError || !meetType) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid meet_type_id' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD' 
      });
    }
    if (!dateRegex.test(end_date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD' 
      });
    }

    // Validate end_date >= start_date
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (endDateObj < startDateObj) {
      return res.status(400).json({ 
        success: false,
        error: 'end_date must be greater than or equal to start_date' 
      });
    }

    // Validate level
    if (!['REGIONALE', 'NAZIONALE', 'INTERNAZIONALE'].includes(level)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid level. Must be REGIONALE, NAZIONALE or INTERNAZIONALE' 
      });
    }

    // Validate score_type
    if (!['IPF', 'RIS'].includes(score_type)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid score_type. Must be IPF or RIS' 
      });
    }

    // Generate unique meet_code
    // Format: FEDERATION_CODE-YYYY-NN
    // Example: SLI-2025-01
    const federationCode = federation.code || 'XXX';
    const year = start_date.split('-')[0];
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const meet_code = `${federationCode}-${year}-${randomNum}`;

    // Insert meet
    const { data: newMeet, error: insertError } = await supabaseAdmin
      .from('meets')
      .insert({
        federation_id,
        meet_code,
        name,
        start_date,
        end_date,
        level,
        regulation_code,
        meet_type_id,
        score_type
      })
      .select(`
        id,
        federation_id,
        meet_code,
        name,
        start_date,
        level,
        regulation_code,
        meet_type_id,
        score_type
      `)
      .single();

    if (insertError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create meet' 
      });
    }

    // Add status field
    const startDate = new Date(newMeet.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';
    
    if (startDate > today) {
      status = 'SETUP';
    } else if (startDate.toDateString() === today.toDateString()) {
      status = 'IN_PROGRESS';
    } else {
      status = 'COMPLETED';
    }

    return res.status(201).json({
      success: true,
      meet: {
        ...newMeet,
        status
      },
      message: 'Meet created successfully'
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * ============================================
 * UPDATE MEET
 * ============================================
 * 
 * Updates a meet's information (except meet_type_id which cannot be changed)
 * PATCH /api/meets/:meetId
 */
export async function updateMeet(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    const { meetId } = req.params;
    const { name, start_date, end_date, level, regulation_code, score_type } = req.body;

    // Validate required fields
    if (!name || !start_date || !end_date || !level || !regulation_code || !score_type) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD' 
      });
    }
    if (!dateRegex.test(end_date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD' 
      });
    }

    // Validate end_date >= start_date
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (endDateObj < startDateObj) {
      return res.status(400).json({ 
        success: false,
        error: 'end_date must be greater than or equal to start_date' 
      });
    }

    // Validate level
    if (!['REGIONALE', 'NAZIONALE', 'INTERNAZIONALE'].includes(level)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid level. Must be REGIONALE, NAZIONALE or INTERNAZIONALE' 
      });
    }

    // Validate score_type
    if (!['IPF', 'RIS'].includes(score_type)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid score_type. Must be IPF or RIS' 
      });
    }

    // Check if meet exists
    const { data: existingMeet, error: fetchError } = await supabaseAdmin
      .from('meets')
      .select('id, federation_id')
      .eq('id', meetId)
      .single();

    if (fetchError || !existingMeet) {
      return res.status(404).json({ 
        success: false,
        error: 'Meet not found' 
      });
    }

    // Verify user has access to this meet
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_uid', authUser.auth_uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const { data: userFederations, error: ufError } = await supabaseAdmin
      .from('user_federations')
      .select('federation_id')
      .eq('user_id', user.id);

    if (ufError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch user federations' 
      });
    }

    const federationIds = userFederations?.map(uf => uf.federation_id) || [];
    
    if (!federationIds.includes(existingMeet.federation_id)) {
      return res.status(403).json({ 
        success: false,
        error: 'You do not have permission to update this meet' 
      });
    }

    // Update meet (excluding meet_type_id)
    const { data: updatedMeet, error: updateError } = await supabaseAdmin
      .from('meets')
      .update({
        name,
        start_date,
        end_date,
        level,
        regulation_code,
        score_type
      })
      .eq('id', meetId)
      .select(`
        id,
        federation_id,
        meet_code,
        name,
        start_date,
        level,
        regulation_code,
        meet_type_id,
        score_type
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update meet' 
      });
    }

    return res.json({
      success: true,
      meet: updatedMeet,
      message: 'Meet updated successfully'
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}
