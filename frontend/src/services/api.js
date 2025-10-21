/**
 * 🌐 BACKEND API CLIENT
 * 
 * Funzioni per chiamare il backend Express.
 * Usa questo per operazioni che richiedono logica server-side.
 * 
 * ESEMPIO USO:
 * 
 * import { submitVote, advanceToNextAthlete } from '@/services/api'
 * 
 * await submitVote({ attempt_id: 42, judge_id: 1, vote: 'VALID' })
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

/**
 * Helper per fetch con error handling
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error)
    throw error
  }
}

// ============================================
// VOTES API
// ============================================

/**
 * Invia voto giudice (gestisce logica 2/3)
 */
export async function submitVote({ attempt_id, judge_id, vote }) {
  return apiRequest('/api/votes', {
    method: 'POST',
    body: JSON.stringify({ attempt_id, judge_id, vote })
  })
}

// ============================================
// DIRECTOR API (Regista)
// ============================================

/**
 * Avanza al prossimo atleta (pulsante NEXT)
 */
export async function advanceToNextAthlete({ meet_id }) {
  return apiRequest('/api/director/next', {
    method: 'POST',
    body: JSON.stringify({ meet_id })
  })
}

/**
 * Modifica esito alzata (VAR)
 */
export async function overrideAttemptResult({ attempt_id, new_result, reason }) {
  return apiRequest('/api/director/override', {
    method: 'POST',
    body: JSON.stringify({ attempt_id, new_result, reason })
  })
}

/**
 * Aggiorna peso dichiarato
 */
export async function updateDeclaredWeight({ attempt_id, weight }) {
  return apiRequest('/api/director/update-weight', {
    method: 'PATCH',
    body: JSON.stringify({ attempt_id, weight })
  })
}

// ============================================
// MEETS API
// ============================================

/**
 * Crea nuova gara
 */
export async function createMeet(meetData) {
  return apiRequest('/api/meets', {
    method: 'POST',
    body: JSON.stringify(meetData)
  })
}

/**
 * Ottieni dettagli gara
 */
export async function getMeet(meetId) {
  return apiRequest(`/api/meets/${meetId}`)
}

// ============================================
// ATHLETES API
// ============================================

/**
 * Aggiungi atleta
 */
export async function addAthlete(athleteData) {
  return apiRequest('/api/athletes', {
    method: 'POST',
    body: JSON.stringify(athleteData)
  })
}

/**
 * Aggiorna peso corporeo (pesatura)
 */
export async function updateAthleteWeight({ athlete_id, body_weight }) {
  return apiRequest(`/api/athletes/${athlete_id}/weight`, {
    method: 'PATCH',
    body: JSON.stringify({ body_weight })
  })
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  submitVote,
  advanceToNextAthlete,
  overrideAttemptResult,
  updateDeclaredWeight,
  createMeet,
  getMeet,
  addAthlete,
  updateAthleteWeight
}
