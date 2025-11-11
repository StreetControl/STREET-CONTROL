/**
 * SELECT ROLE PAGE
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { roleConfig } from '../../utils/config';
import type { UserRole, AvailableRole } from '../../types';

const SelectRolePage = () => {
  const navigate = useNavigate();
  const { user, activeRole, hasActiveRole, selectRole, loading, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string>('');

  // Redirect if user already has an active role
  useEffect(() => {
    if (!loading && hasActiveRole && activeRole) {
      navigate('/meets', { replace: true });
    }
  }, [hasActiveRole, activeRole, loading, navigate]);

  // Get role configuration
  const roles = roleConfig(user);

  // Sort available roles
  const sortedRoles = user?.available_roles?.sort((a, b) => {
    const orderA = roles[a.role]?.order ?? 999;
    const orderB = roles[b.role]?.order ?? 999;
    return orderA - orderB;
  }) || [];

  const handleRoleSelect = async (role: AvailableRole) => {
    setError('');
    setSelectedRole(role.role);
    
    // Pass role string (not ID) to backend
    const result = await selectRole(role.role);

    if (result.success) {
      // All roles navigate to meets list
      navigate('/meets');
    } else {
      setError(result.message || 'Errore nella selezione del ruolo');
      setSelectedRole(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-dark-text">
            Benvenuto, <span className="text-primary">{user.name}</span>
          </h1>
          <p className="text-dark-text-secondary text-lg">
            Seleziona il tuo ruolo per accedere alla piattaforma
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message max-w-2xl mx-auto mb-8">
            {error}
          </div>
        )}

        {/* No Roles Available */}
        {sortedRoles.length === 0 && (
          <div className="max-w-2xl mx-auto mb-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-center">
              ⚠️ Nessun ruolo disponibile per questo utente. Contatta l&apos;amministratore.
            </p>
            <p className="text-dark-text-secondary text-sm text-center mt-2">
              User role: {user?.role || 'N/A'}
            </p>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className={`grid grid-cols-1 gap-6 mb-8 ${
          sortedRoles.length === 1 
            ? 'md:grid-cols-1 max-w-md mx-auto' 
            : 'md:grid-cols-3'
        }`}>
          {sortedRoles.map((role) => {
            const config = roles[role.role];
            if (!config) return null;

            const Icon = config.icon;
            const isSelected = selectedRole === role.role;
            const isLoading = loading && isSelected;

            return (
              <button
                key={role.role}
                onClick={() => handleRoleSelect(role)}
                disabled={loading}
                className={`
                  relative p-8 rounded-xl border-2 transition-all duration-300
                  ${isSelected 
                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-dark-bg-secondary border-dark-border hover:border-primary/50 hover:bg-dark-bg-tertiary hover:scale-102'
                  }
                  ${loading && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group
                `}
              >
                {/* Icon Circle */}
                <div className={`
                  inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6
                  bg-gradient-to-br ${config.color}
                  border ${config.borderColor}
                  transition-transform duration-300
                  ${isSelected ? 'scale-110' : 'group-hover:scale-110'}
                `}>
                  <Icon className={`w-8 h-8 ${config.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-dark-text mb-2">
                  {config.title}
                </h3>

                {/* Subtitle */}
                <p className="text-primary text-sm font-medium mb-6">
                  {config.subtitle}
                </p>

                {/* Arrow Icon */}
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <span className="inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className={`
                      w-6 h-6 transition-all duration-300
                      ${isSelected ? 'text-primary translate-x-2' : 'text-dark-text-muted group-hover:text-primary group-hover:translate-x-2'}
                    `} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="btn-secondary"
          >
            Torna al login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectRolePage;
