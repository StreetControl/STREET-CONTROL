/**
 * 👥 SELECT ROLE PAGE
 * Layout esatto del mockup fornito dall'utente
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Users, Gavel, ArrowRight } from 'lucide-react';

const SelectRolePage = () => {
  const navigate = useNavigate();
  const { user, selectRole, loading, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');

  // Role configuration con ordine di visualizzazione
  const roleConfig = {
    'ORGANIZER': {
      title: 'PRE-GARA',
      subtitle: 'Configura atleti e parametri',
      icon: Users,
      color: 'from-green-500/20 to-green-600/20',
      borderColor: 'border-green-500/30',
      iconColor: 'text-green-400',
      order: 1
    },
    'DIRECTOR': {
      title: 'REGISTA',
      subtitle: 'Gestisci il flusso della gara',
      icon: Settings,
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      order: 2
    },
    'REFEREE': {
      title: 'GIUDICE',
      subtitle: user?.judge_position ? `Posizione: ${user.judge_position}` : 'Valuta le alzate',
      icon: Gavel,
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      order: 3
    }
  };

  // Ordina i ruoli disponibili
  const sortedRoles = user.available_roles?.sort((a, b) => {
    return roleConfig[a.role]?.order - roleConfig[b.role]?.order;
  }) || [];

  const handleRoleSelect = async (role) => {
    setError('');
    setSelectedRole(role.role);

    const result = await selectRole(role.id);

    if (result.success) {
      // Navigate based on selected role
      switch(role.role) {
        case 'DIRECTOR':
          navigate('/director');
          break;
        case 'ORGANIZER':
          navigate('/organizer');
          break;
        case 'REFEREE':
          navigate('/referee');
          break;
        default:
          navigate('/');
      }
    } else {
      setError(result.message);
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
            Benvenuto, <span className="text-primary">{user.organization_name || 'Organizzazione'}</span>
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

        {/* Role Cards Grid */}
        <div className={`grid grid-cols-1 gap-6 mb-8 ${
          sortedRoles.length === 1 
            ? 'md:grid-cols-1 max-w-md mx-auto' 
            : 'md:grid-cols-3'
        }`}>
          {sortedRoles.map((role) => {
            const config = roleConfig[role.role];
            if (!config) return null;

            const Icon = config.icon;
            const isSelected = selectedRole === role.role;
            const isLoading = loading && isSelected;

            return (
              <button
                key={role.id}
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
