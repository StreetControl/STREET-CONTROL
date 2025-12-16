/**
 * VOTE RESULT DISPLAY PAGE
 * 
 * Display page showing:
 * - 3 equal-sized judge circles (LEFT, HEAD, RIGHT)
 * - 1 small dot under each circle (vote reason color)
 * - Timer synchronized with HEAD judge
 * - Current athlete info
 * 
 * Colors:
 * - Empty: dark gray
 * - Valid: white
 * - Invalid: red (main circle), specific color for small dot:
 *   - ROM: red
 *   - Discesa: blue  
 *   - Altro: yellow
 * 
 * URL: /display/:meetId/votes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
import { ChevronDown, ChevronUp, Timer, Wifi, WifiOff } from 'lucide-react';

// Types
interface Flight {
  id: number;
  name: string;
  groups: Group[];
}

interface Group {
  id: number;
  name: string;
}

interface Lift {
  id: string;
  name: string;
}

interface AthleteInfo {
  firstName: string;
  lastName: string;
  sex: string;
  weightCategory: string;
  bodyweightKg: number;
}

interface AttemptInfo {
  id: number;
  weightKg: number;
  attemptNo: number;
  status: 'PENDING' | 'VALID' | 'INVALID';
}

interface LiftInfo {
  id: string;
  name: string;
}

interface CurrentDisplay {
  athlete: AthleteInfo;
  attempt: AttemptInfo | null;
  lift: LiftInfo;
  currentRound: number;
  groupId: number;
}

// Single judge vote state
interface JudgeVote {
  hasVoted: boolean;
  isValid: boolean | null;  // null = not voted, true = valid, false = invalid
  reason: 'ROM' | 'DISCESA' | 'ALTRO' | 'FORCE' | null;  // FORCE = HEAD judge X button
}

// Standard lifts
const LIFTS: Lift[] = [
  { id: 'MU', name: 'Muscle-Up' },
  { id: 'PU', name: 'Pull-Up' },
  { id: 'DIP', name: 'Dip' },
  { id: 'SQ', name: 'Squat' },
];

export default function VoteResultDisplay() {
  const { meetId } = useParams<{ meetId: string }>();

  // Selector state
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  const [showSelectors, setShowSelectors] = useState(false);

  // Display state
  const [currentDisplay, setCurrentDisplay] = useState<CurrentDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Individual judge votes (each updates independently)
  const [leftVote, setLeftVote] = useState<JudgeVote>({ hasVoted: false, isValid: null, reason: null });
  const [headVote, setHeadVote] = useState<JudgeVote>({ hasVoted: false, isValid: null, reason: null });
  const [rightVote, setRightVote] = useState<JudgeVote>({ hasVoted: false, isValid: null, reason: null });

  // Timer state (always visible, synced with HEAD judge)
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load meet structure (flights/groups)
  useEffect(() => {
    if (!meetId) return;

    const loadMeetStructure = async () => {
      try {
        const response = await api.get(`/director/meets/${meetId}/state`);
        if (response.data.success) {
          setFlights(response.data.flights || []);
          
          // Auto-select first flight/group/lift
          if (response.data.flights?.length > 0) {
            const firstFlight = response.data.flights[0];
            setSelectedFlightId(firstFlight.id);
            
            if (firstFlight.groups?.length > 0) {
              setSelectedGroupId(firstFlight.groups[0].id);
            }
          }
          setSelectedLiftId(LIFTS[0].id);
        }
      } catch (err) {
        console.error('Error loading meet structure:', err);
        setError('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };

    loadMeetStructure();
  }, [meetId]);

  // Fetch current athlete
  const fetchCurrentAthlete = useCallback(async () => {
    if (!meetId || !selectedGroupId || !selectedLiftId) return;

    try {
      const response = await api.get(`/displays/${meetId}/current-attempt`, {
        params: { groupId: selectedGroupId, liftId: selectedLiftId }
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setCurrentDisplay({
          athlete: {
            firstName: data.athlete.firstName,
            lastName: data.athlete.lastName,
            sex: data.athlete.sex,
            weightCategory: data.athlete.weightCategory,
            bodyweightKg: data.athlete.bodyweightKg
          },
          attempt: data.attempt ? {
            id: data.attempt.id,
            weightKg: data.attempt.weightKg,
            attemptNo: data.attempt.attemptNo,
            status: data.attempt.status
          } : null,
          lift: {
            id: data.lift.id,
            name: data.lift.name
          },
          currentRound: data.currentRound,
          groupId: selectedGroupId
        });

        // Reset votes for new athlete
        resetVotes();
        setError(null);
      } else {
        setCurrentDisplay(null);
      }
    } catch (err) {
      console.error('Error fetching current athlete:', err);
    }
  }, [meetId, selectedGroupId, selectedLiftId]);

  // Reset all votes
  const resetVotes = () => {
    setLeftVote({ hasVoted: false, isValid: null, reason: null });
    setHeadVote({ hasVoted: false, isValid: null, reason: null });
    setRightVote({ hasVoted: false, isValid: null, reason: null });
    setTimerSeconds(60);
    setTimerRunning(false);
  };

  // Load athlete when group/lift changes
  useEffect(() => {
    if (selectedGroupId && selectedLiftId) {
      fetchCurrentAthlete();
    }
  }, [selectedGroupId, selectedLiftId, fetchCurrentAthlete]);

  // Timer countdown
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev > 0) return prev - 1;
          setTimerRunning(false);
          return 0;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, timerSeconds]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    if (!meetId || !selectedGroupId || !selectedLiftId) return;

    // Subscribe to BROADCAST for individual vote updates
    const channelName = `display_votes_${meetId}`;
    const broadcastChannel = supabase.channel(channelName);

    broadcastChannel
      .on('broadcast', { event: 'judge_vote' }, (payload: any) => {
        console.log('🗳️ Vote received:', payload);
        const { judgePosition, vote, reason } = payload.payload;
        
        // Update the specific judge who just voted
        if (judgePosition === 'LEFT') {
          setLeftVote({
            hasVoted: true,
            isValid: vote,
            reason: vote ? null : (reason || 'ROM')
          });
        }
        if (judgePosition === 'HEAD') {
          setHeadVote({
            hasVoted: true,
            isValid: vote,
            reason: vote ? null : (reason || 'ROM')
          });
        }
        if (judgePosition === 'RIGHT') {
          setRightVote({
            hasVoted: true,
            isValid: vote, 
            reason: vote ? null : (reason || 'ROM')
          });
        }
      })
      .on('broadcast', { event: 'final_result' }, (payload: any) => {
        console.log('✅ Final result:', payload);
        // Final result doesn't need to update votes - they're already updated
        // Just stop the timer and schedule reload
        setTimerRunning(false);

        // Reload after 3 seconds
        setTimeout(() => fetchCurrentAthlete(), 3000);
      })
      .on('broadcast', { event: 'force_invalid' }, () => {
        console.log('❌ Force invalid - all circles red');
        // HEAD judge X button - ALL circles become red
        const forceInvalidVote = { hasVoted: true, isValid: false, reason: 'FORCE' as const };
        setLeftVote(forceInvalidVote);
        setHeadVote(forceInvalidVote);
        setRightVote(forceInvalidVote);
        setTimerRunning(false);

        // Reload after 3 seconds
        setTimeout(() => fetchCurrentAthlete(), 3000);
      })
      .on('broadcast', { event: 'director_vote' }, (payload: any) => {
        console.log('👨‍💼 Director vote:', payload);
        const { status } = payload.payload;
        
        // Director voted - ALL circles same color
        if (status === 'VALID') {
          const validVote = { hasVoted: true, isValid: true, reason: null };
          setLeftVote(validVote);
          setHeadVote(validVote);
          setRightVote(validVote);
        } else {
          // INVALID - all red
          const invalidVote = { hasVoted: true, isValid: false, reason: 'FORCE' as const };
          setLeftVote(invalidVote);
          setHeadVote(invalidVote);
          setRightVote(invalidVote);
        }
        setTimerRunning(false);

        // Reload after 3 seconds to get next athlete
        setTimeout(() => fetchCurrentAthlete(), 3000);
      })
      .on('broadcast', { event: 'timer_started' }, (payload: any) => {
        console.log('⏱️ Timer started:', payload);
        const { seconds } = payload.payload;
        setTimerSeconds(seconds || 60);
        setTimerRunning(true);
      })
      .on('broadcast', { event: 'timer_stopped' }, () => {
        setTimerRunning(false);
      })
      .on('broadcast', { event: 'timer_reset' }, () => {
        setTimerSeconds(60);
        setTimerRunning(false);
      })
      .subscribe((status: string) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });

    // Subscribe to current_state changes
    const stateChannel = supabase
      .channel(`display_state_${selectedGroupId}_${selectedLiftId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_state',
          filter: `group_id=eq.${selectedGroupId}`
        },
        () => {
          setTimeout(() => fetchCurrentAthlete(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(stateChannel);
    };
  }, [meetId, selectedGroupId, selectedLiftId, fetchCurrentAthlete]);

  // Format timer
  const formatTimer = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Get main circle color
  const getCircleColor = (vote: JudgeVote) => {
    if (!vote.hasVoted) return 'bg-dark-bg-tertiary'; // Empty gray
    if (vote.isValid) return 'bg-white'; // Valid = white
    return 'bg-red-500'; // Invalid = red
  };

  // Get small dot color (specific reason)
  const getDotColor = (vote: JudgeVote) => {
    if (!vote.hasVoted) return 'bg-dark-bg-tertiary border-dark-border'; // Empty
    if (vote.isValid) return 'bg-white border-white/50'; // Valid = white
    
    // Invalid - show reason color
    switch (vote.reason) {
      case 'ROM': return 'bg-red-500 border-red-400';
      case 'DISCESA': return 'bg-blue-500 border-blue-400';
      case 'ALTRO': return 'bg-yellow-500 border-yellow-400';
      case 'FORCE': return 'bg-red-500 border-red-400'; // HEAD judge X = all red
      default: return 'bg-red-500 border-red-400';
    }
  };

  // Render single judge circle with dot
  const renderJudgeCircle = (position: 'LEFT' | 'HEAD' | 'RIGHT', vote: JudgeVote) => (
    <div className="flex flex-col items-center">
      {/* Position Label */}
      <p className="text-xs text-dark-text-secondary mb-2 uppercase tracking-wider font-medium">
        {position}
      </p>
      
      {/* Main Circle - All same size */}
      <div className={`
        w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32
        rounded-full
        ${getCircleColor(vote)}
        transition-all duration-300
        ${vote.hasVoted && vote.isValid ? 'shadow-lg shadow-white/30' : ''}
        ${vote.hasVoted && !vote.isValid ? 'shadow-lg shadow-red-500/30' : ''}
      `} />
      
      {/* Single Small Dot */}
      <div className={`
        w-3 h-3 rounded-full mt-3
        ${getDotColor(vote)}
        border
        transition-all duration-300
      `} />
    </div>
  );

  // Get available groups for selected flight
  const availableGroups = flights.find(f => f.id === selectedFlightId)?.groups || [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-dark-text text-lg font-medium">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl font-bold mb-2">Errore</p>
          <p className="text-dark-text">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Collapsible Selectors - Compact */}
      <div className="bg-dark-bg-secondary border-b border-dark-border">
        <button
          onClick={() => setShowSelectors(!showSelectors)}
          className="w-full px-4 py-2 flex items-center justify-between text-dark-text-secondary hover:text-dark-text transition-colors"
        >
          <span className="text-xs font-medium">Selezione Flight / Gruppo / Alzata</span>
          {showSelectors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showSelectors && (
          <div className="px-4 pb-3 grid grid-cols-3 gap-3">
            {/* Flight */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase">Flight</label>
              <select
                value={selectedFlightId || ''}
                onChange={(e) => {
                  const flightId = parseInt(e.target.value);
                  setSelectedFlightId(flightId);
                  const flight = flights.find(f => f.id === flightId);
                  if (flight?.groups?.length) {
                    setSelectedGroupId(flight.groups[0].id);
                  }
                }}
                className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm text-dark-text"
              >
                {flights.map(flight => (
                  <option key={flight.id} value={flight.id}>{flight.name}</option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase">Gruppo</label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm text-dark-text"
              >
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            {/* Lift */}
            <div>
              <label className="block text-xs text-dark-text-secondary mb-1 uppercase">Alzata</label>
              <select
                value={selectedLiftId || ''}
                onChange={(e) => setSelectedLiftId(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm text-dark-text"
              >
                {LIFTS.map(lift => (
                  <option key={lift.id} value={lift.id}>{lift.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Compact */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* Timer - Always visible, compact */}
        <div className={`mb-6 px-6 py-3 rounded-xl border ${
          timerSeconds <= 10
            ? 'bg-red-500/10 border-red-500/30'
            : timerSeconds <= 20
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-dark-bg-secondary border-dark-border'
        }`}>
          <div className="flex items-center gap-3">
            <Timer className={`w-5 h-5 ${
              timerSeconds <= 10 ? 'text-red-400' : 
              timerSeconds <= 20 ? 'text-yellow-400' : 'text-green-400'
            }`} />
            <span className={`text-4xl font-mono font-bold ${
              timerSeconds <= 10 ? 'text-red-400' : 
              timerSeconds <= 20 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>

        {/* Judge Circles - Equal size, compact spacing */}
        <div className="flex items-start justify-center gap-8 sm:gap-12 lg:gap-16 mb-8">
          {renderJudgeCircle('LEFT', leftVote)}
          {renderJudgeCircle('HEAD', headVote)}
          {renderJudgeCircle('RIGHT', rightVote)}
        </div>

        {/* Athlete Info - Compact */}
        {currentDisplay ? (
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-dark-text mb-2 tracking-tight">
              {currentDisplay.athlete.firstName.toUpperCase()} {currentDisplay.athlete.lastName.toUpperCase()}
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm mb-3">
              <span className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-primary font-bold">
                {currentDisplay.athlete.weightCategory}
              </span>
              <span className="text-dark-text-secondary">•</span>
              <span className="text-dark-text-secondary font-medium">{currentDisplay.lift.name}</span>
              <span className="text-dark-text-secondary">•</span>
              <span className="text-yellow-400 font-bold">TENTATIVO {currentDisplay.attempt?.attemptNo || 1}</span>
            </div>
            {/* Weight */}
            <div className="text-6xl font-black text-dark-text">
              {currentDisplay.attempt?.weightKg ?? 0}
              <span className="text-2xl text-dark-text-secondary ml-2">KG</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-dark-text-secondary text-xl font-bold">NESSUN ATLETA</p>
            <p className="text-dark-text-muted text-sm">In attesa...</p>
          </div>
        )}
      </div>

      {/* Footer - Connection status */}
      <footer className="flex items-center justify-center gap-2 py-3 border-t border-dark-border">
        {connectionStatus === 'connected' ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-yellow-500 animate-pulse" />
        )}
        <span className="text-dark-text-muted text-xs">
          {connectionStatus === 'connected' ? 'Connesso - aggiornamenti in tempo reale' : 'Connessione...'}
        </span>
      </footer>
    </div>
  );
}
