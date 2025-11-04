/**
 * COMMON TYPES - Shared Types and Utilities
 */

import { UserRole } from './auth.types';
import { LucideIcon } from 'lucide-react';

// ============================================
// ROLE CONFIGURATION
// ============================================

export interface RoleConfigItem {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  iconColor: string;
  order: number;
}

export type RoleConfigMap = {
  [K in UserRole]?: RoleConfigItem;
};

// ============================================
// FORM TYPES
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole | null;
  requireActiveRole?: boolean;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================
// UTILITY TYPES
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Loading State
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
