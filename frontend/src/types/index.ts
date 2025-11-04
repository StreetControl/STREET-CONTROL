/**
 * TYPE EXPORTS - Central export point for all types
 */

// Auth Types
export type {
  UserRole,
  JudgePosition,
  AvailableRole,
  User,
  ActiveRole,
  AuthContextState,
  AuthContextMethods,
  AuthContextValue,
  AuthResult,
  LoginCredentials,
  UserInfoResponse,
  VerifyRoleRequest,
  VerifyRoleResponse,
} from './auth.types';

// API Types
export type {
  ApiResponse,
  ApiError,
  SubmitVoteRequest,
  SubmitVoteResponse,
  AdvanceAthleteRequest,
  AdvanceAthleteResponse,
  OverrideAttemptRequest,
  OverrideAttemptResponse,
  UpdateWeightRequest,
  UpdateWeightResponse,
  Meet,
  CreateMeetRequest,
  CreateMeetResponse,
  GetMeetResponse,
  GetMeetsResponse,
  Sex,
  Athlete,
  AddAthleteRequest,
  AddAthleteResponse,
  UpdateAthleteWeightRequest,
  UpdateAthleteWeightResponse,
  GetAthletesResponse,
  Lift,
  Attempt,
} from './api.types';

// Common Types
export type {
  RoleConfigItem,
  RoleConfigMap,
  LoginFormData,
  ProtectedRouteProps,
  ErrorBoundaryProps,
  ErrorBoundaryState,
  Nullable,
  Optional,
  LoadingState,
  PaginationParams,
  PaginatedResponse,
} from './common.types';
