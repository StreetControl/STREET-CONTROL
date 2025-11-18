/**
 * API TYPES - Backend API Request/Response Types
 */

// ============================================
// GENERIC API TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: any;
}

// ============================================
// VOTES API
// ============================================

export interface SubmitVoteRequest {
  attempt_id: number;
  judge_id: number;
  vote: boolean;
}

export interface SubmitVoteResponse {
  success: boolean;
  attempt_result?: 'VALID' | 'INVALID' | 'PENDING';
  message?: string;
}

// ============================================
// DIRECTOR API
// ============================================

export interface AdvanceAthleteRequest {
  meet_id: number;
}

export interface AdvanceAthleteResponse {
  success: boolean;
  next_athlete?: Athlete;
  message?: string;
}

export interface OverrideAttemptRequest {
  attempt_id: number;
  new_result: 'VALID' | 'INVALID';
  reason: string;
}

export interface OverrideAttemptResponse {
  success: boolean;
  message?: string;
}

export interface UpdateWeightRequest {
  attempt_id: number;
  weight: number;
}

export interface UpdateWeightResponse {
  success: boolean;
  message?: string;
}

// ============================================
// MEETS API
// ============================================

export type MeetStatus = 'SETUP' | 'WEIGH_IN' | 'IN_PROGRESS' | 'COMPLETED';

export interface Meet {
  id: number;
  federation_id: number;
  meet_code: string;
  name: string;
  start_date: string; // DATE format YYYY-MM-DD
  end_date: string; // DATE format YYYY-MM-DD
  level: 'REGIONALE' | 'NAZIONALE' | 'INTERNAZIONALE';
  regulation_code: string;
  meet_type_id: string;
  score_type: string; // 'IPF' | 'RIS'
  status: MeetStatus;
  created_at?: string;
}

export interface CreateMeetRequest {
  name: string;
  meet_type_id: string;
  start_date: string; // DATE format YYYY-MM-DD
  end_date: string; // DATE format YYYY-MM-DD
  level: 'REGIONALE' | 'NAZIONALE' | 'INTERNAZIONALE';
  regulation_code: string;
  score_type: string; // 'IPF' | 'RIS'
}

export interface CreateMeetResponse {
  success: boolean;
  meet?: Meet;
  message?: string;
}

export interface GetMeetResponse {
  success: boolean;
  meet?: Meet;
  message?: string;
}

export interface GetMeetsResponse {
  success: boolean;
  meets?: Meet[];
  message?: string;
}

// ============================================
// ATHLETES API
// ============================================

export type Sex = 'M' | 'F';

export interface Athlete {
  id: number;
  cf: string;
  first_name: string;
  last_name: string;
  sex: Sex;
  birth_date: string;
  team_id?: number;
  body_weight?: number;
  created_at: string;
}

export interface AddAthleteRequest {
  cf: string;
  first_name: string;
  last_name: string;
  sex: Sex;
  birth_date: string;
  team_id?: number;
}

export interface AddAthleteResponse {
  success: boolean;
  athlete?: Athlete;
  message?: string;
}

export interface UpdateAthleteWeightRequest {
  athlete_id: number;
  body_weight: number;
}

export interface UpdateAthleteWeightResponse {
  success: boolean;
  message?: string;
}

export interface GetAthletesResponse {
  success: boolean;
  athletes?: Athlete[];
  message?: string;
}

export interface BulkCreateAthletesRequest {
  athletes: {
    cf: string;
    firstName: string;
    lastName: string;
    sex: Sex;
    birthDate: string;
    weightCategory?: string;
    team?: string;
    maxSq?: number;
    maxPu?: number;
    maxDip?: number;
    maxMp?: number;
    maxMu?: number;
  }[];
}

export interface BulkCreateAthletesResponse {
  success: boolean;
  message?: string;
  results?: {
    success: number;
    failed: number;
    errors: string[];
  };
}

// ============================================
// DIVISION API (Flights & Groups)
// ============================================

export interface DivisionAthlete {
  form_id: number;
  athlete_id: number;
  first_name: string;
  last_name: string;
  sex: Sex;
  birth_date?: string;
  team_name?: string;
  weight_category: string;
  flight_id?: number;
  flight_name?: string;
  group_id?: number;
  group_name?: string;
}

export interface DivisionGroup {
  id: number;
  flight_id: number;
  name: string;
  ord: number;
  athletes: DivisionAthlete[];
}

export interface DivisionFlight {
  id: number;
  meet_id: number;
  name: string;
  day_number: number;
  start_time: string;
  groups: DivisionGroup[];
}

export interface CreateDivisionResponse {
  success: boolean;
  division?: {
    flights: number;
    groups: number;
    athletes: number;
  };
  message?: string;
}

export interface GetDivisionResponse {
  success: boolean;
  flights?: DivisionFlight[];
  message?: string;
}

export interface SaveDivisionRequest {
  assignments: {
    form_id: number;
    group_id: number;
    flight_id: number;
  }[];
  flights?: DivisionFlight[];
}

export interface SaveDivisionResponse {
  success: boolean;
  message?: string;
  updated?: number;
}

// ============================================
// LIFTS & ATTEMPTS
// ============================================

export interface Lift {
  id: string; // 'SQ', 'PU', 'DIP'
  name: string;
}

export interface Attempt {
  id: number;
  athlete_id: number;
  lift_id: string;
  attempt_number: 1 | 2 | 3;
  declared_weight?: number;
  result?: 'VALID' | 'INVALID' | 'PENDING';
  override_reason?: string;
  created_at: string;
}
