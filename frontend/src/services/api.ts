/**
 * BACKEND API CLIENT
 * 
 * HTTP client configured to communicate with Express backend.
 * Uses Axios with interceptors for authentication and error handling.
 * 
 * USAGE EXAMPLE:
 * 
 * import api from '@/services/api'
 * 
 * // Authenticated calls (token automatic)
 * const response = await api.post('/auth/verify-role', { role: 'DIRECTOR' })
 * const data = await api.get('/meets')
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type {
  SubmitVoteRequest,
  SubmitVoteResponse,
  OverrideAttemptRequest,
  OverrideAttemptResponse,
  UpdateWeightRequest,
  UpdateWeightResponse,
  CreateMeetRequest,
  CreateMeetResponse,
  GetMeetResponse,
  GetMeetsResponse,
  AddAthleteRequest,
  AddAthleteResponse,
  UpdateAthleteWeightRequest,
  UpdateAthleteWeightResponse,
  GetAthletesResponse,
  BulkCreateAthletesRequest,
  BulkCreateAthletesResponse,
  CreateDivisionResponse,
  GetDivisionResponse,
  SaveDivisionRequest,
  SaveDivisionResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

// Create Axios instance with extended timeout for bulk operations
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds (2 minutes) for bulk imports and heavy operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store token in memory (set by AuthContext)
let currentToken: string | null = null;

/**
 * Set the authentication token (called by AuthContext)
 * @param token - JWT token or null to clear
 */
export function setApiToken(token: string | null): void {
  currentToken = token;
}

// REQUEST INTERCEPTOR - Add token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Use in-memory token (fallback to localStorage for backwards compatibility)
    const token = currentToken || localStorage.getItem('authToken');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR - Handle global errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Token expired or invalid
    if (error.response?.status === 401) {
      // Redirect to login (only if not already there)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Server error
    if (error.response?.status && error.response.status >= 500) {
      console.error('Server error:', error.response);
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// VOTES API
// ============================================

/**
 * Submit judge vote (handles 2/3 logic)
 */
export async function submitVote(data: SubmitVoteRequest): Promise<SubmitVoteResponse> {
  const response = await api.post<SubmitVoteResponse>('/votes', data);
  return response.data;
}

/**
 * Submit judge vote (new interface for JudgePage)
 */
export async function submitJudgeVote(data: {
  attemptId: number;
  judgePosition: 'HEAD' | 'LEFT' | 'RIGHT';
  vote: boolean;
  groupId: number;
  liftId: string;
}): Promise<{ 
  success: boolean; 
  votesReceived: number; 
  totalExpected: number;
  finalResult: string | null;
  message?: string;
  error?: string;
}> {
  const response = await api.post('/votes', data);
  return response.data;
}

// ============================================
// DIRECTOR API
// ============================================

/**
 * Override lift result (VAR)
 */
export async function overrideAttemptResult(data: OverrideAttemptRequest): Promise<OverrideAttemptResponse> {
  const response = await api.post<OverrideAttemptResponse>('/director/override', data);
  return response.data;
}

/**
 * Update declared weight
 */
export async function updateDeclaredWeight(data: UpdateWeightRequest): Promise<UpdateWeightResponse> {
  const response = await api.patch<UpdateWeightResponse>('/director/update-weight', data);
  return response.data;
}

// ============================================
// MEETS API
// ============================================

/**
 * Create new meet
 */
export async function createMeet(meetData: CreateMeetRequest): Promise<CreateMeetResponse> {
  const response = await api.post<CreateMeetResponse>('/meets', meetData);
  return response.data;
}

/**
 * Update existing meet (all fields except meet_type_id)
 */
export async function updateMeet(meetId: number, meetData: Omit<CreateMeetRequest, 'meet_type_id'>): Promise<CreateMeetResponse> {
  const response = await api.patch<CreateMeetResponse>(`/meets/${meetId}`, meetData);
  return response.data;
}

/**
 * Get meet details
 */
export async function getMeet(meetId: number): Promise<GetMeetResponse> {
  const response = await api.get<GetMeetResponse>(`/meets/${meetId}`);
  return response.data;
}

/**
 * Get all meets
 */
export async function getMeets(): Promise<GetMeetsResponse> {
  const response = await api.get<GetMeetsResponse>('/meets');
  return response.data;
}

// ============================================
// ATHLETES API
// ============================================

/**
 * Get athletes for a specific meet
 */
export async function getMeetAthletes(meetId: number): Promise<GetAthletesResponse> {
  const response = await api.get<GetAthletesResponse>(`/meets/${meetId}/athletes`);
  return response.data;
}

/**
 * Add single athlete to meet
 */
export async function addAthleteToMeet(meetId: number, athleteData: {
  cf: string;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F';
  birthDate: string;
}): Promise<AddAthleteResponse> {
  const response = await api.post<AddAthleteResponse>(`/meets/${meetId}/athletes`, athleteData);
  return response.data;
}

/**
 * Bulk import athletes from CSV
 */
export async function bulkImportAthletes(
  meetId: number, 
  data: BulkCreateAthletesRequest
): Promise<BulkCreateAthletesResponse> {
  const response = await api.post<BulkCreateAthletesResponse>(
    `/meets/${meetId}/athletes/bulk`, 
    data
  );
  return response.data;
}

/**
 * Update athlete information
 */
export async function updateAthlete(athleteId: number, athleteData: {
  firstName?: string;
  lastName?: string;
  sex?: 'M' | 'F';
  birthDate?: string;
}): Promise<{ success: boolean; message?: string }> {
  const response = await api.patch(`/athletes/${athleteId}`, athleteData);
  return response.data;
}

/**
 * Delete athlete from meet
 */
export async function deleteAthleteFromMeet(meetId: number, athleteId: number): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete(`/meets/${meetId}/athletes/${athleteId}`);
  return response.data;
}

/**
 * Add athlete (legacy - kept for backwards compatibility)
 */
export async function addAthlete(athleteData: AddAthleteRequest): Promise<AddAthleteResponse> {
  const response = await api.post<AddAthleteResponse>('/athletes', athleteData);
  return response.data;
}

/**
 * Update athlete body weight (weigh-in)
 */
export async function updateAthleteWeight(data: UpdateAthleteWeightRequest): Promise<UpdateAthleteWeightResponse> {
  const response = await api.patch<UpdateAthleteWeightResponse>(
    `/athletes/${data.athlete_id}/weight`, 
    { body_weight: data.body_weight }
  );
  return response.data;
}

/**
 * Get athletes list
 */
export async function getAthletes(): Promise<GetAthletesResponse> {
  const response = await api.get<GetAthletesResponse>('/athletes');
  return response.data;
}

// ============================================
// DIVISION API
// ============================================

/**
 * Create automatic division (flights, groups, nominations)
 */
export async function createDivision(meetId: number): Promise<CreateDivisionResponse> {
  const response = await api.post<CreateDivisionResponse>(`/meets/${meetId}/division/create`);
  return response.data;
}

/**
 * Get current division structure
 */
export async function getDivision(meetId: number): Promise<GetDivisionResponse> {
  const response = await api.get<GetDivisionResponse>(`/meets/${meetId}/division`);
  return response.data;
}

/**
 * Update flights structure (name, day, time, groups)
 */
export async function updateFlightsStructure(meetId: number, flights: any[]): Promise<any> {
  const response = await api.put(`/meets/${meetId}/division/flights`, { flights });
  return response.data;
}

/**
 * Save modified division structure (after drag & drop)
 */
export async function saveDivision(meetId: number, data: SaveDivisionRequest): Promise<SaveDivisionResponse> {
  const response = await api.post<SaveDivisionResponse>(`/meets/${meetId}/division/save`, data);
  return response.data;
}

export async function updateWeightCategory(meetId: number, formId: number, weightCatId: number): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/meets/${meetId}/division/weight-category`, {
    formId,
    weightCatId
  });
  return response.data;
}

// ============================================
// WEIGH-IN API
// ============================================

/**
 * Get all athletes with weigh-in data for a meet (organized by flights/groups)
 */
export async function getWeighInAthletes(meetId: number): Promise<import('../types').GetWeighInResponse> {
  const response = await api.get<import('../types').GetWeighInResponse>(`/meets/${meetId}/weigh-in`);
  return response.data;
}

/**
 * Update weigh-in data and openers for a specific athlete
 */
export async function updateWeighIn(
  nominationId: number, 
  data: import('../types').UpdateWeighInRequest
): Promise<import('../types').UpdateWeighInResponse> {
  const response = await api.patch<import('../types').UpdateWeighInResponse>(`/weigh-in/${nominationId}`, data);
  return response.data;
}

// ============================================
// DIRECTOR API
// ============================================

/**
 * Get complete director state (flights, groups, lifts)
 */
export async function getDirectorState(meetId: number): Promise<any> {
  const response = await api.get(`/director/meets/${meetId}/state`);
  return response.data;
}

/**
 * Get athletes in a group with their attempts for a specific lift
 */
export async function getGroupAthletes(groupId: number, liftId: string): Promise<any> {
  const response = await api.get(`/director/groups/${groupId}/athletes`, {
    params: { liftId }
  });
  return response.data;
}

/**
 * Update attempt weight or status
 */
export async function updateAttemptDirector(attemptId: number, data: {
  weight_kg?: number;
  status?: 'PENDING' | 'VALID' | 'INVALID';
}): Promise<any> {
  const response = await api.patch(`/director/attempts/${attemptId}`, data);
  return response.data;
}

/**
 * Create next attempt (2 or 3)
 */
export async function createNextAttempt(data: {
  weight_kg?: number;
  lift_id: string;
  weight_in_info_id: number;
  attempt_no: number;
}): Promise<any> {
  const response = await api.post('/director/attempts', data);
  return response.data;
}

/**
 * OPTIMIZED: Judge attempt AND advance to next athlete in ONE call
 * This reduces latency by combining 2 API calls into 1
 */
export async function judgeAndAdvance(data: {
  attemptId: number;
  status: 'VALID' | 'INVALID';
  groupId: number;
  liftId: string;
}): Promise<any> {
  const response = await api.post('/director/judge-advance', data);
  return response.data;
}

/**
 * Advance to next athlete after judgment
 * Returns updated currentState with next athlete info
 */
export async function advanceAthlete(groupId: number, liftId: string): Promise<any> {
  const response = await api.post('/director/advance', { groupId, liftId });
  return response.data;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default api;
