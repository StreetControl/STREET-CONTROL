/**
 * AUTH CONTEXT - GLOBAL AUTHENTICATION MANAGEMENT
 * 
 * Features:
 * - login(email, password) → Login + save token
 * - selectRole(role) → Select operational role (validates with backend)
 * - logout() → Complete logout 
 * 
 * Backend API:
 * - GET /api/auth/user-info → Get user info + available roles
 * - POST /api/auth/verify-role → Validate and select role
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import api, { setApiToken } from '../services/api';
import type {
  User,
  ActiveRole,
  AuthContextValue,
  AuthResult,
  UserRole,
  UserInfoResponse,
  VerifyRoleResponse,
} from '../types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<ActiveRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // RESTORE SESSION ON MOUNT + LISTEN TO AUTH CHANGES
  useEffect(() => {
    // 1. Restore session on mount
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Get current session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error || !currentSession) {
          console.log('No active session to restore');
          return;
        }
        
        // Set session and token
        setSession(currentSession);
        const token = currentSession.access_token;
        setApiToken(token);
        
        // Fetch user data from backend
        try {
          await fetchUserInfo();
        } catch (err) {
          console.error('Failed to fetch user info during restore:', err);
          // Clear invalid session
          await supabase.auth.signOut();
        }
        
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();

    // 2. Listen to auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      // Update API client with new token (or null if logged out)
      const token = session?.access_token || null;
      setApiToken(token);
      
      // If user logged out from another tab, clear state
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveRole(null);
      }
    });

    // 3. Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * LOGIN
   * Login with Supabase → Get JWT token
   */
  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message || 'Credenziali non valide');
      }

      if (!data.session) {
        throw new Error('Sessione non creata');
      }

      // Set token immediately for API calls (don't wait for onAuthStateChange)
      const token = data.session.access_token;
      setApiToken(token);

      // Fetch user info (now API has the token)
      const userData = await fetchUserInfo();
      console.log('User logged in:', userData);
      
      return {
        success: true,
        message: 'Login effettuato con successo'
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante il login';
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * SELECT ROLE
   * Choose role from available_roles
   * 
   * @param role - Role string ('DIRECTOR' | 'ORGANIZER' | 'REFEREE')
   */
  const selectRole = async (role: UserRole): Promise<AuthResult> => {
    try {
      setError(null);
      setLoading(true);

      // Validate role with backend
      const response = await api.post<VerifyRoleResponse>('/auth/verify-role', { role });

      if (response.data.success === true) {
        // Backend validated the role
        const selectedRole = response.data.active_role;

        if (selectedRole) {
          // Update active role
          setActiveRole(selectedRole);

          const updatedUser: User = {
            ...user!,
          };
          setUser(updatedUser);

          return {
            success: true,
            message: 'Ruolo selezionato con successo'
          };
        } else {
          throw new Error('Active role not returned from server');
        }
      } else {
        throw new Error(response.data.message || 'Role selection failed');
      }
    } catch (err) {
      const errorMessage = 
        (err as any).response?.data?.message || 
        (err instanceof Error ? err.message : 'Error selecting role');
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOGOUT
   * Note: Backend doesn't need logout call (stateless JWT)
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      // 1. Logout from Supabase (invalidates JWT token)
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Supabase logout error:', signOutError);
      }

      // 2. Clear state
      setUser(null);
      setActiveRole(null);
      setError(null);
      setSession(null);
      
      // 3. Clear token from API client
      setApiToken(null);

    } catch (err) {
      console.error('Logout error:', err);

      // Force clear even if logout fails
      setUser(null);
      setActiveRole(null);
      setError(null);
      setSession(null);
      setApiToken(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * FETCH USER INFO
   * Get user data and available roles from backend after login
   * @returns userData - User data from backend
   */
  const fetchUserInfo = async (): Promise<User> => {
    try {
      const response = await api.get<UserInfoResponse>('/auth/user-info');

      if (response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        
        // Return userData so caller can use it immediately (state update is async)
        return userData;

      } else {
        throw new Error('Unable to retrieve user data');
      }
    } catch (backendError) {
      throw new Error('Server communication error');
    }
  };

  /**
   * HELPER: Check if user is authenticated
   */
  const isAuthenticated = !!user;

  /**
   * HELPER: Check if user has active role selected
   */
  const hasActiveRole = !!activeRole;

  /**
   * HELPER: Check if user has specific role available
   * @param role - Role to check ('DIRECTOR' | 'ORGANIZER' | 'REFEREE')
   */
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.available_roles?.some(r => r.role === role) || false;
  };

  /**
   * HELPER: Check if active role matches
   * @param role - Role to check
   */
  const isActiveRole = (role: UserRole): boolean => {
    return activeRole?.role === role;
  };

  const value: AuthContextValue = {
    // State
    user,
    activeRole,
    loading,
    error,
    session,
    isAuthenticated,
    hasActiveRole,

    // Actions
    login,
    selectRole,
    logout,

    // Helpers
    hasRole,
    isActiveRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
