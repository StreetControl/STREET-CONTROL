/**
 * 🌐 BACKEND API CLIENT
 * 
 * Client HTTP configurato per comunicare con il backend Express.
 * Usa Axios con interceptors per gestire autenticazione e errori.
 * 
 * ESEMPIO USO:
 * 
 * import api from '@/services/api'
 * 
 * // Chiamate autenticate (token automatico)
 * const response = await api.post('/auth/login', { email, password })
 * const data = await api.get('/meets')
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api'

// Crea istanza Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 📤 REQUEST INTERCEPTOR - Aggiungi token a ogni richiesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 📥 RESPONSE INTERCEPTOR - Gestisci errori globali
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Token scaduto o invalido
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Redirect to login (solo se non siamo già lì)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Server error
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Helper per fetch con error handling (LEGACY - deprecato)
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
// EXPORT DEFAULT - Axios instance
// ============================================

export default api;
