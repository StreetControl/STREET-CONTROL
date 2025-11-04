/**
 * TYPE EXPORTS - Central export point for all backend types
 */

// Auth Types
export type {
  UserRole,
  JudgePosition,
  User,
  Judge,
  AvailableRole,
  ActiveRole,
  JWTPayload,
  AuthRequest,
  LoginResponse,
  UserInfo,
  VerifyRoleRequest,
  VerifyRoleResponse,
} from './auth.types';

// Database Types
export type {
  Sex,
  MeetStatus,
  AttemptResult,
  Lift,
  MeetType,
  MeetTypeLift,
  WeightCategory,
  AgeCategory,
  Team,
  Athlete,
  Meet,
  MeetAthlete,
  Attempt,
  Vote,
  QueryResult,
} from './database.types';

// Express Types
export type {
  ApiResponse,
  ErrorResponse,
  AsyncRequestHandler,
  RequestHandler,
  PaginationParams,
  QueryFilters,
} from './express.types';
