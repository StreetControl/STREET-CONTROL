/**
 * EXPRESS TYPES - Express-specific types and middleware
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.types';

// Standard API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}

// Middleware types
export type AsyncRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export type RequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => void | Response;

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Query filters
export interface QueryFilters {
  [key: string]: any;
}
