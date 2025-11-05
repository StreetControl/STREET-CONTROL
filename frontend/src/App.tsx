/**
 * STREET CONTROL - APP ROUTING
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SelectRolePage from './pages/auth/SelectRolePage';

// Main Pages
import MeetListPage from './pages/MeetListPage';
import MeetSettingsPage from './pages/organizer/MeetSettingsPage';

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
              <Navigate to="/select-role" replace />
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

        {/* MEETS Routes - All roles access this */}
        <Route 
          path="/meets" 
          element={
            <ProtectedRoute requireActiveRole>
              <MeetListPage />
            </ProtectedRoute>
          } 
        />

        {/* MEET SETTINGS Route - Only ORGANIZER can create/configure meets */}
        <Route 
          path="/meets/new" 
          element={
            <ProtectedRoute requireActiveRole>
              <MeetSettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* MEET SETTINGS Route with ID - Edit existing meet */}
        <Route 
          path="/meets/:meetId/settings" 
          element={
            <ProtectedRoute requireActiveRole>
              <MeetSettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              hasActiveRole ? (
                // All roles redirect to meets list
                <Navigate to="/meets" replace />
              ) : (
                <Navigate to="/select-role" replace />
              )
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
