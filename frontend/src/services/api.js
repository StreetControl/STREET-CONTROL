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

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api'

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Store token in memory (set by AuthContext)
let currentToken = null

/**
 * Set the authentication token (called by AuthContext)
 * @param {string|null} token - JWT token or null to clear
 */
export function setApiToken(token) {
  currentToken = token
}

// REQUEST INTERCEPTOR - Add token to every request
api.interceptors.request.use(
  (config) => {
    // Use in-memory token (fallback to localStorage for backwards compatibility)
    const token = currentToken || localStorage.getItem('authToken')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// RESPONSE INTERCEPTOR - Handle global errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Token expired or invalid
    if (error.response?.status === 401) {
      
      // Redirect to login (only if not already there)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    
    // Server error
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response)
    }
    
    return Promise.reject(error)
  }
)

// ============================================
// VOTES API
// ============================================

/**
 * Submit judge vote (handles 2/3 logic)
 */
export async function submitVote({ attempt_id, judge_id, vote }) {
  const response = await api.post('/votes', { attempt_id, judge_id, vote })
  return response.data
}

// ============================================
// DIRECTOR API
// ============================================

/**
 * Advance to next athlete (NEXT button)
 */
export async function advanceToNextAthlete({ meet_id }) {
  const response = await api.post('/director/next', { meet_id })
  return response.data
}

/**
 * Override lift result (VAR)
 */
export async function overrideAttemptResult({ attempt_id, new_result, reason }) {
  const response = await api.post('/director/override', { 
    attempt_id, 
    new_result, 
    reason 
  })
  return response.data
}

/**
 * Update declared weight
 */
export async function updateDeclaredWeight({ attempt_id, weight }) {
  const response = await api.patch('/director/update-weight', { 
    attempt_id, 
    weight 
  })
  return response.data
}

// ============================================
// MEETS API
// ============================================

/**
 * Create new meet
 */
export async function createMeet(meetData) {
  const response = await api.post('/meets', meetData)
  return response.data
}

/**
 * Get meet details
 */
export async function getMeet(meetId) {
  const response = await api.get(`/meets/${meetId}`)
  return response.data
}

/**
 * Get all meets
 */
export async function getMeets() {
  const response = await api.get('/meets')
  return response.data
}

// ============================================
// ATHLETES API
// ============================================

/**
 * Add athlete
 */
export async function addAthlete(athleteData) {
  const response = await api.post('/athletes', athleteData)
  return response.data
}

/**
 * Update athlete body weight (weigh-in)
 */
export async function updateAthleteWeight({ athlete_id, body_weight }) {
  const response = await api.patch(`/athletes/${athlete_id}/weight`, { 
    body_weight 
  })
  return response.data
}

/**
 * Get athletes list
 */
export async function getAthletes() {
  const response = await api.get('/athletes')
  return response.data
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default api