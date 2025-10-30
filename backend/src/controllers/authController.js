/**
 * AUTH CONTROLLER
 */

import { supabaseAdmin } from '../services/supabase.js'

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
    const validRoles = ['DIRECTOR', 'ORGANIZER', 'REFEREE', 'ADMIN', 'SUPER_ADMIN']
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role' 
      })
    }

    // Query user from DB
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

    // Define role permissions matrix
    const rolePermissions = {
      'DIRECTOR': ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'],
      'ORGANIZER': ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
      'REFEREE': ['REFEREE', 'ADMIN', 'SUPER_ADMIN'],
      'ADMIN': ['ADMIN', 'SUPER_ADMIN'],
      'SUPER_ADMIN': ['SUPER_ADMIN']
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
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
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
 * GET AVAILABLE ROLES
 * ============================================
 * 
 * Returns user info + available_roles
 */
export async function getAvailableRoles(req, res) {
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

    // Helper: handles organization name display
    const getDisplayName = (name) => {
      if (!name) return 'Organization';
      if (name.toUpperCase().includes('SLI')) {
        return 'STREET LIFTING ITALIA';
      } 
      return name.toUpperCase();
    };

    // Define role permissions matrix (same as verifyRole)
    const rolePermissions = {
      'DIRECTOR': ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'],
      'ORGANIZER': ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
      'REFEREE': ['REFEREE', 'ADMIN', 'SUPER_ADMIN'],
      'ADMIN': ['ADMIN', 'SUPER_ADMIN'],
      'SUPER_ADMIN': ['SUPER_ADMIN']
    };

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
        name: user.name,
        role: user.role,
        available_roles: availableRoles,
        organization_name: getDisplayName(user.name)
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
  getAvailableRoles
}
