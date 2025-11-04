/**
 * PROTECTED ROUTE COMPONENT
 * Protects routes that require authentication and/or specific role
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ProtectedRouteProps } from '../types';

const ProtectedRoute = ({ 
  children, 
  requireRole = null, 
  requireActiveRole = false 
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasActiveRole, hasRole, isActiveRole, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if active role is required but not set
  if (requireActiveRole && !hasActiveRole) {
    return <Navigate to="/select-role" replace />;
  }

  // Check if specific role is required
  if (requireRole) {
    // If requireActiveRole is true, check active role
    if (requireActiveRole) {
      if (!isActiveRole(requireRole)) {
        return <Navigate to="/select-role" replace />;
      }
    } 
    // Otherwise, check if user has the role available
    else {
      if (!hasRole(requireRole)) {
        return <Navigate to="/select-role" replace />;
      }
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute;
