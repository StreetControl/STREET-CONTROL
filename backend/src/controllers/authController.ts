/**
 * AUTH CONTROLLER
 */

import { Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import { rolePermissions, validRoles } from '../config/roleData.js';
import { getDisplayName } from '../utils/utils.js';
import type { 
  AuthRequest, 
  UserRole, 
  JudgePosition, 
  VerifyRoleRequest,
  AvailableRole,
  UserInfo
} from '../types';

/**
 * ============================================
 * Verify ROLE
 * ============================================
 * 
 * Validates if user can assume requested role
 * Returns true/false based on DB permissions
 */
export async function verifyRole(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { role } = req.body as VerifyRoleRequest;
    const authUser = req.user; // From middleware

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Validate role format
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role' 
      });
    }

    // Query user from DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_uid', authUser.auth_uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Check if user's DB role allows requested role
    const canAssumeRole = rolePermissions[role]?.includes(user.role as UserRole) || false;

    if (!canAssumeRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Non hai i permessi per assumere questo ruolo'
      });
    }

    // If role is REFEREE, get judge info
    let judgeInfo: { judge_id?: number; judge_position?: JudgePosition } = {};
    
    if (role === 'REFEREE') {
      const { data: judgeData, error: judgeError } = await supabaseAdmin
        .from('judges')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (!judgeError && judgeData) {
        judgeInfo = {
          judge_id: judgeData.id,
          judge_position: judgeData.role as JudgePosition
        };
      }
    }

    return res.json({
      success: true,
      message: 'Ruolo verificato con successo',
      active_role: {
        role,
        ...judgeInfo
      }
    });

  } catch (error) {
    console.error('Select role error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * ============================================
 * GET USER INFO
 * ============================================
 * 
 * Returns user info + available_roles
 */
export async function getUserInfos(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const authUser = req.user; // Already verified by middleware

    if (!authUser) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Query user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, role')
      .eq('auth_uid', authUser.auth_uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Extract judge-specific role if user is a judge
    let judgePosition: JudgePosition | null = null;
    let judgeId: number | null = null;
    
    console.log('User role:', user.role);
    
    if (user.role === 'REFEREE') {
      const { data: judgeData, error: judgeError } = await supabaseAdmin
        .from('judges')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      console.log('Judge data:', judgeData);
      console.log('Judge error:', judgeError);

      if (!judgeError && judgeData) {
        judgePosition = judgeData.role as JudgePosition;
        judgeId = judgeData.id;
      }
    }

    // Determine available roles based on user's DB role
    const availableRoles: AvailableRole[] = [];
    const rolesList: Array<{ role: UserRole; name: string }> = [
      { role: 'DIRECTOR', name: 'Regista' },
      { role: 'ORGANIZER', name: 'Pre-Gara' },
      { role: 'REFEREE', name: 'Giudice' }
    ];

    // Check which roles the user can assume
    rolesList.forEach(roleItem => {
      if (rolePermissions[roleItem.role]?.includes(user.role as UserRole)) {
        const availableRole: AvailableRole = {
          role: roleItem.role
        };
        
        // Add judge-specific info if role is REFEREE
        if (roleItem.role === 'REFEREE' && judgePosition) {
          availableRole.judge_id = judgeId || undefined;
          availableRole.judge_position = judgePosition;
        }
        
        availableRoles.push(availableRole);
      }
    });

    const userInfo: UserInfo = {
      id: user.id,
      auth_uid: authUser.auth_uid,
      name: getDisplayName(user.name),
      email: authUser.email,
      role: user.role as UserRole,
      available_roles: availableRoles,
      judge_position: judgePosition || undefined
    };

    return res.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('Get available roles error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

export default {
  verifyRole,
  getUserInfos
};
