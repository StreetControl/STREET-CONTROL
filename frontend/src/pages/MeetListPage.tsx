/**
 * MEET LIST PAGE (Pagina 3)
 * 
 * Shows list of past and active meets
 * "Create New Meet" button visible ONLY for ORGANIZER role
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMeets } from '../services/api';
import { Calendar, LogOut, Plus, Flag, ChevronRight } from 'lucide-react';
import type { Meet } from '../types';

const MeetListPage = () => {
  const navigate = useNavigate();
  const { user, activeRole, logout, clearActiveRole } = useAuth();
  
  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Separate meets by status and sort by date (ascending - earliest first)
  const pastMeets = meets
    .filter(m => m.status === 'COMPLETED')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  
  const activeMeets = meets
    .filter(m => m.status === 'IN_PROGRESS' || m.status === 'SETUP')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  // Check if user is Organizer
  const isOrganizer = activeRole?.role === 'ORGANIZER';

  useEffect(() => {
    fetchMeets();
  }, []);

  const fetchMeets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getMeets();
      
      if (response.success && response.meets) {
        setMeets(response.meets);
      } else {
        setError(response.message || 'Errore nel caricamento delle gare');
      }
    } catch (err) {
      console.error('Error fetching meets:', err);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const handleMeetClick = (meetId: number) => {
    // DIRECTOR navigates to director page, others to settings
    if (activeRole?.role === 'DIRECTOR') {
      navigate(`/meets/${meetId}/director`);
    } else {
      navigate(`/meets/${meetId}/settings`);
    }
  };

  const handleCreateMeet = () => {
    navigate('/meets/new');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBackToRoles = () => {
    // Clear active role before navigating to select-role page
    clearActiveRole();
    navigate('/select-role');
  };

  // Format date to Italian format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 bg-dark-bg-secondary border-b border-dark-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text">STREET CONTROL</h1>
              <p className="text-sm text-dark-text-secondary">{user?.name}</p>
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

      {/* Main Content - with top padding to account for fixed header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        {/* Error Message */}
        {error && (
          <div className="error-message mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-dark-text-secondary">Caricamento gare...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Create New Meet Button - ONLY for ORGANIZER */}
            {isOrganizer && (
              <section className="mb-8">
                <button
                  onClick={handleCreateMeet}
                  className="w-full card p-8 hover:bg-primary/5 border-2 border-primary/30 hover:border-primary transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-primary">
                        CREA UNA NUOVA GARA
                      </h3>
                    </div>
                  </div>
                </button>
              </section>
            )}

            {/* Two Column Layout: Past Meets (left 2/5) and Active Meets (right 3/5) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Past Meets Section - Left Column (2/5) */}
              <section className="flex flex-col lg:col-span-2 lg:pr-4 lg:border-r lg:border-dark-border">
                <h2 className="text-2xl font-bold text-primary mb-6 underline decoration-2 underline-offset-4">
                  GARE PASSATE
                </h2>
                
                {/* Container with fixed min-height */}
                <div className="card p-6 flex-1 min-h-[400px]">
                  {pastMeets.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-dark-text-secondary">Nessuna gara passata</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastMeets.map((meet) => (
                        <button
                          key={meet.id}
                          onClick={() => handleMeetClick(meet.id)}
                          className="w-full bg-dark-bg-tertiary hover:bg-dark-bg border border-dark-border hover:border-primary rounded-lg p-6 transition-colors group text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-dark-text group-hover:text-primary transition-colors">
                                {meet.name}
                              </h3>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-dark-text-secondary flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(meet.start_date)}
                                </span>
                                <span className="text-sm text-dark-text-muted">
                                  {meet.level}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-primary group-hover:brightness-125 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Active Meets Section - Right Column (3/5) */}
              <section className="flex flex-col lg:col-span-3 lg:pl-4 mt-8 lg:mt-0">
                <h2 className="text-2xl font-bold text-primary mb-6 underline decoration-2 underline-offset-4">
                  GARE ATTIVE
                </h2>
                
                {/* Container with fixed min-height */}
                <div className="card p-6 flex-1 min-h-[400px]">
                  {activeMeets.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-dark-text-secondary">Nessuna gara attiva</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeMeets.map((meet) => (
                        <button
                          key={meet.id}
                          onClick={() => handleMeetClick(meet.id)}
                          className="w-full bg-dark-bg-tertiary hover:bg-dark-bg border border-dark-border hover:border-primary rounded-lg p-6 transition-colors group text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-dark-text group-hover:text-primary transition-colors">
                                  {meet.name}
                                </h3>
                                {meet.status === 'IN_PROGRESS' && (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
                                    <Flag className="w-3 h-3" />
                                    "attiva è"
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-dark-text-secondary flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(meet.start_date)}
                                </span>
                                <span className="text-sm text-dark-text-muted">
                                  {meet.level}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-primary group-hover:brightness-125 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MeetListPage;
