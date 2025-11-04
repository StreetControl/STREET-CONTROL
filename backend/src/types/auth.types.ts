/**
 * AUTH TYPES - Backend Authentication Types
 */

import { Request } from 'express';

// User Roles
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'DIRECTOR';

// Judge Positions
export type JudgePosition = 'HEAD' | 'LEFT' | 'RIGHT';

// User from database
export interface User {
  id: number;
  auth_uid: string;
  name: string;
  role: UserRole;
  created_at: Date;
}

// Judge from database
export interface Judge {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  role: JudgePosition;
}

// Available Role (computed from user's role and judge data)
export interface AvailableRole {
  role: UserRole;
  judge_id?: number;
  judge_position?: JudgePosition;
}

// Active Role (selected by user)
export interface ActiveRole {
  role: UserRole;
  judge_id?: number;
  judge_position?: JudgePosition;
}

// JWT Payload
export interface JWTPayload {
  user_id: number;
  auth_uid: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Extended Request with authenticated user
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Login Response
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserInfo;
  message?: string;
}

// User Info Response (with available roles)
export interface UserInfo {
  id: number;
  auth_uid: string;
  name: string;
  email: string;
  role: UserRole;
  available_roles: AvailableRole[];
  judge_position?: JudgePosition;
}

// Verify Role Request
export interface VerifyRoleRequest {
  role: UserRole;
}

// Verify Role Response
export interface VerifyRoleResponse {
  success: boolean;
  message: string;
  active_role?: ActiveRole;
}
