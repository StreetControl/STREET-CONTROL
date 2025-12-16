/**
 * JUDGE PAGE
 * Main voting page for judges (HEAD, LEFT, RIGHT)
 * 
 * Features:
 * - Dropdowns: Flight, Group, Lift
 * - Current athlete info (synced with director via Supabase Realtime)
 * - Voting buttons: 1 green (VALID) + 3 red (INVALID)
 * - Timer display (HEAD judge only)
 * - Mobile-first responsive design
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDirectorState, getGroupAthletes } from '../../services/api';
import { submitJudgeVote } from '../../services/api';
import { supabase } from '../../services/supabase';
import { ChevronLeft, Gavel, RefreshCw } from 'lucide-react';
import { TimerDisplay, AthleteInfoCard, VotingButtons } from '../../components/judge';

// Types
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

export default function JudgePage() {
  const { meetId } = useParams<{ meetId: string }>();
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  // State
  const [meetName, setMeetName] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentState, setCurrentState] = useState<CurrentState | null>(null);
  const [currentAthlete, setCurrentAthlete] = useState<Athlete | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAthletes, setLoadingAthletes] = useState<boolean>(false);
  const [voting, setVoting] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [lastVote, setLastVote] = useState<boolean | null>(null);
  const [voteResult, setVoteResult] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  // Is this judge a HEAD judge?
  const isHeadJudge = activeRole?.judge_position === 'HEAD';
  const judgePosition = activeRole?.judge_position || 'LEFT';

  // Get current lift name
  const currentLiftName = lifts.find(l => l.id === selectedLiftId)?.name || '';

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
        setError(response.error || 'Errore nel caricamento');
      }
    } catch (err: any) {
      console.error('Error loading state:', err);
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
      setCurrentAthlete(null);
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
        setCurrentState(response.currentState || null);
        
        // Find current athlete
        if (response.currentState?.current_weight_in_info_id) {
          const athlete = response.athletes.find(
            (a: Athlete) => a.weight_in_info_id === response.currentState.current_weight_in_info_id
          );
          setCurrentAthlete(athlete || null);
        } else {
          setCurrentAthlete(null);
        }

        // Reset vote state for new athlete
        setHasVoted(false);
        setLastVote(null);
        setVoteResult(null);
      } else {
        setError(response.error || 'Errore nel caricamento atleti');
      }
    } catch (err: any) {
      console.error('Error loading athletes:', err);
      setError('Errore di connessione');
    } finally {
      setLoadingAthletes(false);
    }
  };

  // Subscribe to current_state changes (real-time sync with director)
  useEffect(() => {
    if (!selectedGroupId || !selectedLiftId) return;

    const channel = supabase
      .channel(`current_state_${selectedGroupId}_${selectedLiftId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'current_state',
          filter: `group_id=eq.${selectedGroupId}`
        },
        (payload) => {
          console.log('[JudgePage] current_state updated:', payload.new);
          
          // Only update if it's for our lift
          if (payload.new.lift_id === selectedLiftId) {
            setCurrentState({
              current_round: payload.new.current_attempt_no,
              current_weight_in_info_id: payload.new.current_weight_in_info_id,
              completed: payload.new.completed
            });

            // Find new current athlete
            const newCurrentAthlete = athletes.find(
              a => a.weight_in_info_id === payload.new.current_weight_in_info_id
            );
            setCurrentAthlete(newCurrentAthlete || null);

            // Reset vote state for new athlete
            setHasVoted(false);
            setLastVote(null);
            setVoteResult(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, selectedLiftId, athletes]);

  // Handlers
  const handleFlightChange = (flightId: number) => {
    setSelectedFlightId(flightId);
    
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

  // Handle vote submission
  const handleVote = useCallback(async (isValid: boolean) => {
    if (!currentAthlete || !selectedGroupId || !selectedLiftId || hasVoted) return;

    // Get current attempt ID
    const currentRound = currentState?.current_round || 1;
    const attemptKey = `attempt${currentRound}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = currentAthlete[attemptKey];

    if (!attempt) {
      setError('Nessun tentativo attivo per questo atleta');
      return;
    }

    try {
      setVoting(true);
      setError('');

      const response = await submitJudgeVote({
        attemptId: attempt.id,
        judgePosition: judgePosition as 'HEAD' | 'LEFT' | 'RIGHT',
        vote: isValid,
        groupId: selectedGroupId,
        liftId: selectedLiftId
      });

      if (response.success) {
        setHasVoted(true);
        setLastVote(isValid);

        if (response.finalResult) {
          setVoteResult(response.finalResult);
        }
      } else {
        setError(response.error || 'Errore nel voto');
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.response?.data?.error || 'Errore di connessione');
    } finally {
      setVoting(false);
    }
  }, [currentAthlete, selectedGroupId, selectedLiftId, currentState, judgePosition, hasVoted]);

  // Timer expired handler (auto-vote INVALID)
  const handleTimerExpired = useCallback(() => {
    if (!hasVoted && currentAthlete) {
      handleVote(false);
    }
  }, [hasVoted, currentAthlete, handleVote]);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);
  const availableGroups = selectedFlight?.groups || [];

  // Get current attempt info
  const currentRound = currentState?.current_round || 1;
  const currentAttemptKey = `attempt${currentRound}` as 'attempt1' | 'attempt2' | 'attempt3';
  const currentAttempt = currentAthlete?.[currentAttemptKey];

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
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
              <Gavel className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-dark-text">
                GIUDICE {isHeadJudge ? '(HEAD)' : `(${judgePosition})`}
              </h1>
              <p className="text-xs text-primary truncate max-w-[150px]">{meetName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/meets')}
              className="p-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text-secondary hover:text-dark-text"
              title="Torna alla lista"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Dropdowns */}
        <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Flight */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Flight</label>
              <select
                value={selectedFlightId || ''}
                onChange={(e) => handleFlightChange(parseInt(e.target.value))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary"
              >
                {flights.map(flight => (
                  <option key={flight.id} value={flight.id}>{flight.name}</option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Gruppo</label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => handleGroupChange(parseInt(e.target.value))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary"
              >
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            {/* Lift */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Alzata</label>
              <select
                value={selectedLiftId || ''}
                onChange={(e) => handleLiftChange(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary"
              >
                {lifts.map(lift => (
                  <option key={lift.id} value={lift.id}>{lift.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={loadAthletes}
            disabled={loadingAthletes}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text-secondary hover:text-dark-text text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAthletes ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>

        {/* Timer - HEAD Judge Only */}
        {isHeadJudge && (
          <TimerDisplay 
            defaultSeconds={60}
            onTimeExpired={handleTimerExpired}
          />
        )}

        {/* Athlete Info */}
        {loadingAthletes ? (
          <AthleteInfoCard
            firstName=""
            lastName=""
            weightCategory=""
            liftName=""
            attemptNumber={1}
            weightKg={null}
            isLoading={true}
          />
        ) : currentAthlete ? (
          <AthleteInfoCard
            firstName={currentAthlete.first_name}
            lastName={currentAthlete.last_name}
            weightCategory={currentAthlete.weight_category}
            liftName={currentLiftName}
            attemptNumber={currentRound}
            weightKg={currentAttempt?.weight_kg || null}
          />
        ) : currentState?.completed ? (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 text-center">
            <p className="text-green-400 font-medium">✓ Gruppo completato!</p>
            <p className="text-dark-text-secondary text-sm mt-1">Seleziona un altro gruppo o alzata.</p>
          </div>
        ) : (
          <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-6 text-center">
            <p className="text-dark-text-secondary">Nessun atleta in pedana</p>
            <p className="text-xs text-dark-text-secondary mt-1">In attesa che il regista avanzi...</p>
          </div>
        )}

        {/* Vote Result Banner */}
        {voteResult && (
          <div className={`
            rounded-xl p-4 text-center font-bold text-xl
            ${voteResult === 'VALID' 
              ? 'bg-green-500/20 border-2 border-green-500 text-green-400' 
              : 'bg-red-500/20 border-2 border-red-500 text-red-400'}
          `}>
            {voteResult === 'VALID' ? '✓ PROVA VALIDA' : '✗ PROVA NON VALIDA'}
          </div>
        )}

        {/* Voting Buttons */}
        {currentAthlete && !currentState?.completed && (
          <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-6">
            <VotingButtons
              onVote={handleVote}
              disabled={voting || !currentAttempt}
              hasVoted={hasVoted}
              lastVote={lastVote}
            />
          </div>
        )}
      </main>
    </div>
  );
}
