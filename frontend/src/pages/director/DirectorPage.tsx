/**
 * DIRECTOR PAGE
 * Main competition management page for Director role
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDirectorState, getGroupAthletes, updateAttemptDirector, advanceAthlete } from '../../services/api';
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
  notes?: string;
  attempt1: { id: number; weight_kg: number; status: string } | null;
  attempt2: { id: number; weight_kg: number; status: string } | null;
  attempt3: { id: number; weight_kg: number; status: string } | null;
}

interface CurrentState {
  current_round: number;
  current_weight_in_info_id: number | null;
  completed: boolean;
}

export default function DirectorPage() {
  const { meetId } = useParams<{ meetId: string }>();
  const navigate = useNavigate();
  useAuth(); // Auth guard

  const [meetName, setMeetName] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentState, setCurrentState] = useState<CurrentState | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAthletes, setLoadingAthletes] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Determine current athlete index from currentState
  const currentAthleteIndex = currentState?.current_weight_in_info_id
    ? athletes.findIndex(a => a.weight_in_info_id === currentState.current_weight_in_info_id)
    : 0;

  // Check if the group is completed
  const isGroupCompleted = currentState?.completed === true;

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
      setCurrentState(null);
    }
  }, [selectedGroupId, selectedLiftId]);

  const loadAthletes = async () => {
    if (!selectedGroupId || !selectedLiftId) return;

    try {
      setLoadingAthletes(true);
      setError('');

      const response = await getGroupAthletes(selectedGroupId, selectedLiftId);

      if (response.success) {
        const currentRoundNo = response.currentState?.current_round || 1;
        // Apply hybrid sorting after loading
        const sortedAthletes = sortAthletesHybrid(response.athletes, currentRoundNo);
        setAthletes(sortedAthletes);
        setCurrentState(response.currentState || null);
      } else {
        setError(response.error || 'Errore nel caricamento degli atleti');
        setAthletes([]);
        setCurrentState(null);
      }
    } catch (err: any) {
      console.error('Error loading athletes:', err);
      setError('Errore di connessione al server');
      setAthletes([]);
      setCurrentState(null);
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

  /**
   * Sort athletes with hybrid logic:
   * - Athletes who COMPLETED current round: sorted by NEXT attempt weight
   * - Athletes who have NOT completed current round: sorted by CURRENT attempt weight
   * 
   * @param athleteList - List of athletes
   * @param currentRoundNo - The current round number (1, 2, or 3)
   */
  const sortAthletesHybrid = useCallback((athleteList: Athlete[], currentRoundNo: number): Athlete[] => {
    return [...athleteList].sort((a, b) => {
      const currentAttemptKey = `attempt${currentRoundNo}` as 'attempt1' | 'attempt2' | 'attempt3';
      const nextAttemptKey = `attempt${currentRoundNo + 1}` as 'attempt1' | 'attempt2' | 'attempt3';
      
      const currentAttemptA = a[currentAttemptKey];
      const currentAttemptB = b[currentAttemptKey];
      
      // Check if athletes have completed current round (status is VALID or INVALID)
      const aCompletedCurrent = currentAttemptA && currentAttemptA.status !== 'PENDING';
      const bCompletedCurrent = currentAttemptB && currentAttemptB.status !== 'PENDING';
      
      // Case 1: Both completed current round → sort by NEXT attempt weight
      if (aCompletedCurrent && bCompletedCurrent) {
        const nextAttemptA = a[nextAttemptKey];
        const nextAttemptB = b[nextAttemptKey];
        const weightA = nextAttemptA?.weight_kg;
        const weightB = nextAttemptB?.weight_kg;
        
        // Check if weights are actually set (not null/undefined)
        const aHasWeight = weightA !== null && weightA !== undefined;
        const bHasWeight = weightB !== null && weightB !== undefined;
        
        // Both have next attempt weights - sort by weight
        if (aHasWeight && bHasWeight) {
          if (weightA !== weightB) return weightA - weightB;
          return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
        }
        // Only A has weight → A comes first
        if (aHasWeight && !bHasWeight) return -1;
        // Only B has weight → B comes first
        if (!aHasWeight && bHasWeight) return 1;
        // Neither has next weight - DO NOT REORDER, keep original position
        return 0;
      }
      
      // Case 2: A completed, B hasn't → A comes FIRST (already done)
      if (aCompletedCurrent && !bCompletedCurrent) return -1;
      
      // Case 3: B completed, A hasn't → B comes FIRST
      if (!aCompletedCurrent && bCompletedCurrent) return 1;
      
      // Case 4: Neither completed → sort by CURRENT attempt weight
      const weightA = currentAttemptA?.weight_kg;
      const weightB = currentAttemptB?.weight_kg;
      
      if (weightA !== null && weightA !== undefined && weightB !== null && weightB !== undefined) {
        if (weightA !== weightB) return weightA - weightB;
        return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
      }
      if (weightA !== null && weightA !== undefined) return -1;
      if (weightB !== null && weightB !== undefined) return 1;
      return (b.bodyweight_kg || 0) - (a.bodyweight_kg || 0);
    });
  }, []);

  /**
   * Load athletes without showing loading spinner (background refresh)
   */
  const loadAthletesQuiet = useCallback(async () => {
    if (!selectedGroupId || !selectedLiftId) return;

    try {
      const response = await getGroupAthletes(selectedGroupId, selectedLiftId);
      if (response.success) {
        const currentRoundNo = response.currentState?.current_round || 1;
        // Apply hybrid sorting after loading
        const sortedAthletes = sortAthletesHybrid(response.athletes, currentRoundNo);
        setAthletes(sortedAthletes);
        setCurrentState(response.currentState || null);
      }
    } catch (err: any) {
      console.error('Error loading athletes:', err);
    }
  }, [selectedGroupId, selectedLiftId, sortAthletesHybrid]);

  /**
   * Handle attempt updates - optimized to avoid full page reload
   * @param attemptNo - If provided, triggers reordering for that attempt's weights
   * @param weightInInfoId - The athlete's weight_in_info_id whose weight changed
   * @param newWeight - The new weight value
   */
  const handleAttemptUpdate = useCallback((attemptNo?: number, weightInInfoId?: number, newWeight?: number) => {
    // If attemptNo is provided, it means a weight was entered for that attempt
    // We need to do optimistic update and re-sort
    if (attemptNo && weightInInfoId !== undefined && newWeight !== undefined) {
      const currentRoundNo = currentState?.current_round || 1;
      
      setAthletes(prev => {
        // First, optimistically update the athlete's attempt weight
        const updated = prev.map(athlete => {
          if (athlete.weight_in_info_id === weightInInfoId) {
            const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
            const existingAttempt = athlete[attemptKey];
            return {
              ...athlete,
              [attemptKey]: existingAttempt 
                ? { ...existingAttempt, weight_kg: newWeight }
                : { id: -1, weight_kg: newWeight, status: 'PENDING' } // temp id
            };
          }
          return athlete;
        });
        
        // Use hybrid sorting based on current round
        // This will sort athletes who completed current round by their NEXT attempt weight
        // and athletes who haven't completed by their CURRENT attempt weight
        return sortAthletesHybrid(updated, currentRoundNo);
      });
      // DON'T reload from backend - it would overwrite our local sort
      return;
    }
    
    // For other updates (like toggling status without attemptNo), 
    // just reload fresh data in background
    loadAthletesQuiet();
  }, [currentState?.current_round, sortAthletesHybrid, loadAthletesQuiet]);

  // Advance to next athlete after judgment
  const advanceToNextAthlete = async () => {
    if (!selectedGroupId || !selectedLiftId) return;
    
    try {
      const response = await advanceAthlete(selectedGroupId, selectedLiftId);
      if (response.success) {
        setCurrentState(response.currentState);
        // Background refresh to get updated data
        loadAthletesQuiet();
      }
    } catch (error: any) {
      console.error('Error advancing athlete:', error);
    }
  };

  // Mark current attempt as VALID
  const handleMarkValid = async () => {
    if (currentAthleteIndex < 0 || currentAthleteIndex >= athletes.length || updating) return;
    const currentAthlete = athletes[currentAthleteIndex];
    if (!currentAthlete) return;

    // Get current round from state
    const currentRound = currentState?.current_round || 1;
    const attemptKey = `attempt${currentRound}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = currentAthlete[attemptKey];

    if (!attempt || attempt.weight_kg === null || attempt.weight_kg === undefined) {
      alert('Impossibile validare: peso non inserito');
      return;
    }

    try {
      setUpdating(true);
      await updateAttemptDirector(attempt.id, { status: 'VALID' });
      await advanceToNextAthlete();
    } catch (error: any) {
      console.error('Error marking valid:', error);
      alert('Errore durante l\'aggiornamento');
    } finally {
      setUpdating(false);
    }
  };

  // Mark current attempt as INVALID
  const handleMarkInvalid = async () => {
    if (currentAthleteIndex < 0 || currentAthleteIndex >= athletes.length || updating) return;
    const currentAthlete = athletes[currentAthleteIndex];
    if (!currentAthlete) return;

    // Get current round from state
    const currentRound = currentState?.current_round || 1;
    const attemptKey = `attempt${currentRound}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = currentAthlete[attemptKey];

    if (!attempt || attempt.weight_kg === null || attempt.weight_kg === undefined) {
      alert('Impossibile invalidare: peso non inserito');
      return;
    }

    try {
      setUpdating(true);
      await updateAttemptDirector(attempt.id, { status: 'INVALID' });
      await advanceToNextAthlete();
    } catch (error: any) {
      console.error('Error marking invalid:', error);
      alert('Errore durante l\'aggiornamento');
    } finally {
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
            hasCurrentAthlete={athletes.length > 0 && currentAthleteIndex < athletes.length && !currentState?.completed}
            isGroupCompleted={isGroupCompleted}
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
            currentAthleteIndex={currentAthleteIndex >= 0 ? currentAthleteIndex : 0}
            currentRound={currentState?.current_round || 1}
            selectedLiftId={selectedLiftId!}
            onAttemptUpdate={handleAttemptUpdate}
          />
        )}
      </main>
    </div>
  );
}
