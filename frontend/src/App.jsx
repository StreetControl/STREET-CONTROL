/**
 * 🗺️ STREET CONTROL - APP ROUTING
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SelectRolePage from './pages/auth/SelectRolePage';

// Role-specific Pages (placeholders for now)
import DirectorPage from './pages/director/DirectorPage';
import OrganizerPage from './pages/organizer/OrganizerPage';
import RefereePage from './pages/judge/RefereePage';

function App() {
  const { isAuthenticated, hasActiveRole } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              hasActiveRole ? <Navigate to="/" replace /> : <Navigate to="/select-role" replace />
            ) : (
              <LoginPage />
            )
          } 
        />

        {/* Role Selection (requires auth but no active role) */}
        <Route 
          path="/select-role" 
          element={
            <ProtectedRoute>
              <SelectRolePage />
            </ProtectedRoute>
          } 
        />

        {/* DIRECTOR Routes */}
        <Route 
          path="/director/*" 
          element={
            <ProtectedRoute requireRole="DIRECTOR" requireActiveRole>
              <DirectorPage />
            </ProtectedRoute>
          } 
        />

        {/* ORGANIZER Routes */}
        <Route 
          path="/organizer/*" 
          element={
            <ProtectedRoute requireRole="ORGANIZER" requireActiveRole>
              <OrganizerPage />
            </ProtectedRoute>
          } 
        />

        {/* REFEREE Routes */}
        <Route 
          path="/referee/*" 
          element={
            <ProtectedRoute requireRole="REFEREE" requireActiveRole>
              <RefereePage />
            </ProtectedRoute>
          } 
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              hasActiveRole ? <Navigate to="/select-role" replace /> : <Navigate to="/select-role" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* 404 - Catch all */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
