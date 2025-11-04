/**
 * REFEREE PAGE 
 */

import { useAuth } from '../../contexts/AuthContext';
import { Gavel, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RefereePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBackToRoles = () => {
    navigate('/select-role');
  };

  // Get judge position if available
  const judgePosition = user?.judge_position || 'N/A';

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
              <Gavel className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text">GIUDICE</h1>
              <p className="text-sm text-dark-text-secondary">
                {user?.name} • Posizione: {judgePosition}
              </p>
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-2xl mb-6">
            <Gavel className="w-12 h-12 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-dark-text mb-4">
            Pannello Giudice
          </h2>
          <div className="mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold">
              {judgePosition}
            </span>
          </div>
          <p className="text-dark-text-secondary mb-8 max-w-2xl mx-auto">
            Questa sezione sarà utilizzata per valutare le performance degli atleti durante la competizione.
            Il sistema fornirà un interfaccia dedicata per esprimere i giudizi in tempo reale.
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

export default RefereePage;
