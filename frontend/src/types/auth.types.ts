/**
 * AUTH TYPES - Authentication and User Management
 */

import { Session as SupabaseSession } from '@supabase/supabase-js';

// User Roles
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'DIRECTOR';

// Judge Positions
export type JudgePosition = 'HEAD' | 'LEFT' | 'RIGHT';

// Available Role (from backend user-info)
export interface AvailableRole {
  role: UserRole;
  judge_id?: number;
  judge_position?: JudgePosition;
}

// User Info (extended from backend)
export interface User {
  id: number;
  auth_uid: string;
  name: string;
  role: UserRole;
  email: string;
  available_roles: AvailableRole[];
  judge_position?: JudgePosition;
}

// Active Role (selected by user)
export interface ActiveRole {
  role: UserRole;
  judge_id?: number;
  judge_position?: JudgePosition;
}

// Auth Context State
export interface AuthContextState {
  user: User | null;
  activeRole: ActiveRole | null;
  session: SupabaseSession | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasActiveRole: boolean;
}

// Auth Context Methods
export interface AuthContextMethods {
  login: (email: string, password: string) => Promise<AuthResult>;
  selectRole: (role: UserRole) => Promise<AuthResult>;
  logout: () => Promise<void>;
  clearActiveRole: () => void;
  hasRole: (role: UserRole) => boolean;
  isActiveRole: (role: UserRole) => boolean;
}

// Auth Context Value (combines state + methods)
export interface AuthContextValue extends AuthContextState, AuthContextMethods {}

// Auth Result (for login/selectRole operations)
export interface AuthResult {
  success: boolean;
  message?: string;
}

// Login Credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Backend Auth Responses
export interface UserInfoResponse {
  user: User;
}

export interface VerifyRoleRequest {
  role: UserRole;
}

export interface VerifyRoleResponse {
  success: boolean;
  message: string;
  active_role?: ActiveRole;
}
