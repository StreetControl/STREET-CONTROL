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
  AdvanceAthleteRequest,
  AdvanceAthleteResponse,
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
} from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// ============================================
// DIRECTOR API
// ============================================

/**
 * Advance to next athlete (NEXT button)
 */
export async function advanceToNextAthlete(data: AdvanceAthleteRequest): Promise<AdvanceAthleteResponse> {
  const response = await api.post<AdvanceAthleteResponse>('/director/next', data);
  return response.data;
}

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
 * Add athlete
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
// EXPORT DEFAULT
// ============================================

export default api;
