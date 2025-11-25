/**
 * DIRECTOR PAGE
 * Main competition management page for Director role
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDirectorState, getGroupAthletes, updateAttemptDirector } from '../../services/api';
import { ChevronLeft } from 'lucide-react';
import { DirectorHeader, AthleteTable } from '../../components/director';

interface Flight {
  id: number;
  name: string;
  day_number: number;
  start_time: string;
  groups: Group[];
}

interface Group {
  id: number;
  name: string;
  ord: number;
}

interface Lift {
  id: string;
  name: string;
  sequence: number;
}

interface Athlete {
  nomination_id: number;
  weight_in_info_id: number;
  athlete_id: number;
  first_name: string;
  last_name: string;
  sex: string;
  weight_category: string;
  bodyweight_kg: number;
  attempt1: { id: number; weight_kg: number; status: string } | null;
  attempt2: { id: number; weight_kg: number; status: string } | null;
  attempt3: { id: number; weight_kg: number; status: string } | null;
  current_attempt_no: number;
}

export default function DirectorPage() {
  const { meetId } = useParams<{ meetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetName, setMeetName] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState<number>(0);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAthletes, setLoadingAthletes] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load initial state
  useEffect(() => {
    if (!meetId) return;
    loadDirectorState();
  }, [meetId]);

  const loadDirectorState = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await getDirectorState(parseInt(meetId!));
      
      if (response.success) {
        setMeetName(response.meet.name);
        setFlights(response.flights);
        setLifts(response.lifts);

        // Auto-select first flight, first group, first lift
        if (response.flights.length > 0) {
          const firstFlight = response.flights[0];
          setSelectedFlightId(firstFlight.id);

          if (firstFlight.groups.length > 0) {
            setSelectedGroupId(firstFlight.groups[0].id);
          }
        }

        if (response.lifts.length > 0) {
          setSelectedLiftId(response.lifts[0].id);
        }
      } else {
        setError(response.error || 'Errore nel caricamento dello stato');
      }
    } catch (err: any) {
      console.error('Error loading director state:', err);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  // Load athletes when group or lift changes
  useEffect(() => {
    if (selectedGroupId && selectedLiftId) {
      loadAthletes();
    } else {
      setAthletes([]);
      setCurrentAthleteIndex(0);
    }
  }, [selectedGroupId, selectedLiftId]);

  const loadAthletes = async () => {
    if (!selectedGroupId || !selectedLiftId) return;

    try {
      setLoadingAthletes(true);
      setError('');

      const response = await getGroupAthletes(selectedGroupId, selectedLiftId);

      if (response.success) {
        setAthletes(response.athletes);
        setCurrentAthleteIndex(0); // Reset to first athlete
      } else {
        setError(response.error || 'Errore nel caricamento degli atleti');
        setAthletes([]);
      }
    } catch (err: any) {
      console.error('Error loading athletes:', err);
      setError('Errore di connessione al server');
      setAthletes([]);
    } finally {
      setLoadingAthletes(false);
    }
  };

  // Handlers
  const handleFlightChange = (flightId: number) => {
    setSelectedFlightId(flightId);
    
    // Reset group selection and auto-select first group
    const flight = flights.find(f => f.id === flightId);
    if (flight && flight.groups.length > 0) {
      setSelectedGroupId(flight.groups[0].id);
    } else {
      setSelectedGroupId(null);
    }
  };

  const handleGroupChange = (groupId: number) => {
    setSelectedGroupId(groupId);
  };

  const handleLiftChange = (liftId: string) => {
    setSelectedLiftId(liftId);
  };

  const handleAttemptUpdate = useCallback(() => {
    // Reload athletes after any attempt update
    loadAthletes();
  }, [selectedGroupId, selectedLiftId]);

  const handleAdvanceAthlete = useCallback(() => {
    // Move to next athlete (used after marking valid/invalid)
    if (currentAthleteIndex < athletes.length - 1) {
      setCurrentAthleteIndex(prev => prev + 1);
    }
  }, [currentAthleteIndex, athletes.length]);

  // Mark current attempt as VALID
  const handleMarkValid = async () => {
    const currentAthlete = athletes[currentAthleteIndex];
    if (!currentAthlete || updating) return;

    const attemptKey = `attempt${currentAthlete.current_attempt_no}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = currentAthlete[attemptKey];

    if (!attempt || !attempt.weight_kg) {
      alert('Impossibile validare: peso non inserito');
      return;
    }

    try {
      setUpdating(true);
      await updateAttemptDirector(attempt.id, { status: 'VALID' });
      handleAttemptUpdate();
      setTimeout(() => {
        handleAdvanceAthlete();
        setUpdating(false);
      }, 300);
    } catch (error: any) {
      console.error('Error marking valid:', error);
      alert('Errore durante l\'aggiornamento');
      setUpdating(false);
    }
  };

  // Mark current attempt as INVALID
  const handleMarkInvalid = async () => {
    const currentAthlete = athletes[currentAthleteIndex];
    if (!currentAthlete || updating) return;

    const attemptKey = `attempt${currentAthlete.current_attempt_no}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = currentAthlete[attemptKey];

    if (!attempt || !attempt.weight_kg) {
      alert('Impossibile invalidare: peso non inserito');
      return;
    }

    try {
      setUpdating(true);
      await updateAttemptDirector(attempt.id, { status: 'INVALID' });
      handleAttemptUpdate();
      setTimeout(() => {
        handleAdvanceAthlete();
        setUpdating(false);
      }, 300);
    } catch (error: any) {
      console.error('Error marking invalid:', error);
      alert('Errore durante l\'aggiornamento');
      setUpdating(false);
    }
  };

  const selectedFlight = flights.find(f => f.id === selectedFlightId);
  const availableGroups = selectedFlight?.groups || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Top Bar - Meet Info */}
      <div className="fixed top-0 left-0 right-0 bg-dark-bg-secondary border-b border-dark-border z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-dark-text">PAGINA REGISTA</h1>
              <p className="text-sm text-primary">{meetName}</p>
            </div>
            <button
              onClick={() => navigate('/meets')}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Torna alla lista
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar - Dropdowns and Action Buttons */}
      <div className="fixed top-[80px] left-0 right-0 bg-dark-bg border-b-2 border-dark-border shadow-lg z-40">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DirectorHeader
            flights={flights}
            selectedFlightId={selectedFlightId}
            availableGroups={availableGroups}
            selectedGroupId={selectedGroupId}
            lifts={lifts}
            selectedLiftId={selectedLiftId}
            onFlightChange={handleFlightChange}
            onGroupChange={handleGroupChange}
            onLiftChange={handleLiftChange}
            onMarkValid={handleMarkValid}
            onMarkInvalid={handleMarkInvalid}
            updating={updating}
            hasCurrentAthlete={athletes.length > 0 && currentAthleteIndex < athletes.length}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-[180px] pb-12">
        {error && (
          <div className="error-message mb-6">
            {error}
          </div>
        )}

        {loadingAthletes ? (
          <div className="card p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-dark-text-secondary">Caricamento atleti...</p>
          </div>
        ) : athletes.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-dark-text-secondary">
              {!selectedGroupId || !selectedLiftId 
                ? 'Seleziona flight, gruppo e alzata per visualizzare gli atleti'
                : 'Nessun atleta trovato in questo gruppo per questa alzata'}
            </p>
          </div>
        ) : (
          <AthleteTable
            athletes={athletes}
            currentAthleteIndex={currentAthleteIndex}
            selectedLiftId={selectedLiftId!}
            onAttemptUpdate={handleAttemptUpdate}
          />
        )}
      </main>
    </div>
  );
}
