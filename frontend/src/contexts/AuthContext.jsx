/**
 * 🔐 AUTH CONTEXT - GESTIONE AUTENTICAZIONE GLOBALE
 * 
 * Funzionalità:
 * - loginOrganization(email, password)
 * - selectRole(roleId)
 * - logout()
 * - Auto-restore session from localStorage
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔄 RESTORE SESSION ON MOUNT
  useEffect(() => {
    restoreSession();
  }, []);

  /**
   * Restore session from localStorage
   */
  const restoreSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await api.get('/auth/verify');
      
      if (response.data.success) {
        setUser(response.data.user);
        setActiveRole(response.data.user.active_role || null);
      } else {
        // Token invalid, clear localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('Session restore failed:', err);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔑 LOGIN ORGANIZATION
   * Step 1: Email + Password → Get available roles
   */
  const loginOrganization = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { user, token } = response.data;
        
        // Save token and user data
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setUser(user);
        
        return {
          success: true,
          user: user,
          requiresRoleSelection: user.available_roles && user.available_roles.length > 1
        };
      } else {
        throw new Error(response.data.message || 'Login fallito');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Errore durante il login';
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
   * 👤 SELECT ROLE
   * Step 2: Choose role from available_roles
   */
  const selectRole = async (roleId) => {
    try {
      setError(null);
      setLoading(true);

      const response = await api.post('/auth/select-role', {
        role_id: roleId
      });

      if (response.data.success) {
        const updatedUser = response.data.user;
        
        // Update user and active role
        setUser(updatedUser);
        setActiveRole(updatedUser.active_role);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return {
          success: true,
          user: updatedUser
        };
      } else {
        throw new Error(response.data.message || 'Selezione ruolo fallita');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Errore durante la selezione del ruolo';
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
   * 🚪 LOGOUT
   */
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call backend logout endpoint
      await api.post('/auth/logout');
      
      // Logout from Supabase
      await supabase.auth.signOut();
      
      // Clear state and localStorage
      setUser(null);
      setActiveRole(null);
      setError(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      
      // Force clear even if API call fails
      setUser(null);
      setActiveRole(null);
      setError(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔍 HELPER: Check if user is authenticated
   */
  const isAuthenticated = !!user;

  /**
   * 🔍 HELPER: Check if user has active role selected
   */
  const hasActiveRole = !!activeRole;

  /**
   * 🔍 HELPER: Check if user has specific role
   */
  const hasRole = (role) => {
    if (!user) return false;
    return user.available_roles?.some(r => r.role === role);
  };

  /**
   * 🔍 HELPER: Check if active role matches
   */
  const isActiveRole = (role) => {
    return activeRole?.role === role;
  };

  const value = {
    // State
    user,
    activeRole,
    loading,
    error,
    isAuthenticated,
    hasActiveRole,
    
    // Actions
    loginOrganization,
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
