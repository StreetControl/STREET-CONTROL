/**
 * AUTH CONTROLLER
 */

import { supabaseAdmin } from '../services/supabase.js'
import { rolePermissions, validRoles } from '../config/roleData.js'
import { getDisplayName } from '../utils/utils.js'

/**
 * ============================================
 * Verify ROLE
 * ============================================
 * 
 * Validates if user can assume requested role
 * Returns true/false based on DB permissions
 */
export async function verifyRole(req, res) {
  try {
    const { role } = req.body
    const authUser = req.user // From middleware

    // Validate role format
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role' 
      })
    }

    // Query user from DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_uid', authUser.id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      })
    }

    // Check if user's DB role allows requested role
    const canAssumeRole = rolePermissions[role]?.includes(user.role) || false

    if (!canAssumeRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      })
    }

    res.json({
      success: true,
      active_role: role,
    })

  } catch (error) {
    console.error('Select role error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    })
  }
}

/**
 * ============================================
 * GET USER INFO
 * ============================================
 * 
 * Returns user info + available_roles
 */
export async function getUserInfos(req, res) {
  try {
    const authUser = req.user // Already verified by middleware

    // Query user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, role')
      .eq('auth_uid', authUser.id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      })
    }

    // Extract judge-specific role if user is a judge
    let judgeRole = null; // Default value for non-judges
    console.log('User role:', user.role);
    if (user.role === 'REFEREE') {
      const { data: judgeData, error: judgeError } = await supabaseAdmin
      .from('judges')
      .select('role')
      .eq('user_id', user.id)
      .single()

      console.log('Judge data:', judgeData);
      console.log('Judge error:', judgeError);

      if (!judgeError && judgeData) {
        judgeRole = judgeData.role
      }
    }

    // Determine available roles based on user's DB role
    const availableRoles = [];
    const rolesList = [
      { id: 1, role: 'DIRECTOR', name: 'Regista' },
      { id: 2, role: 'ORGANIZER', name: 'Pre-Gara' },
      { id: 3, role: 'REFEREE', name: 'Giudice' }
    ];

    // Check which roles the user can assume
    rolesList.forEach(roleItem => {
      if (rolePermissions[roleItem.role]?.includes(user.role)) {
        availableRoles.push(roleItem);
      }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: getDisplayName(user.name),
        role: user.role,
        available_roles: availableRoles,
        judge_position: judgeRole || null
      }
    })

  } catch (error) {
    console.error('Get available roles error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    })
  }
}

export default {
  verifyRole,
  getUserInfos
}
