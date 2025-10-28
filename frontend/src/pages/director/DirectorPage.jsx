/**
 * 🎬 DIRECTOR PAGE (REGISTA)
 * Placeholder - Coming soon
 */

import { useAuth } from '../../contexts/AuthContext';
import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DirectorPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBackToRoles = () => {
    navigate('/select-role');
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text">REGISTA</h1>
              <p className="text-sm text-dark-text-secondary">{user?.organization_name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleBackToRoles} className="btn-secondary">
              Cambia Ruolo
            </button>
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-6">
            <Settings className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-dark-text mb-4">
            Pannello Regista
          </h2>
          <p className="text-dark-text-secondary mb-8 max-w-2xl mx-auto">
            Questa sezione sarà utilizzata per gestire il flusso della gara in tempo reale:
            coordinamento dei voli, progressione degli atleti e controllo generale della competizione.
          </p>
          <div className="inline-flex items-center gap-2 text-primary">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">In sviluppo</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DirectorPage;
