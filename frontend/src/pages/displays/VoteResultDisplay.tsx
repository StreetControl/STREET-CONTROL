/**
 * VOTE RESULT DISPLAY PAGE
 * 
 * Display page showing:
 * - Current athlete info
 * - 3 judge vote circles (real-time updates via Supabase Broadcast)
 * - Timer synchronized with judge page
 * 
 * REALTIME: Uses Supabase Realtime Broadcast for instant vote updates.
 * Server broadcasts when a judge votes - no DB storage for intermediate votes.
 * 
 * URL: /display/:meetId/votes
 * Requires: Authenticated user
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import api from '../../services/api';

// Types
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

interface JudgeVotes {
    HEAD: boolean | null;
    LEFT: boolean | null;
    RIGHT: boolean | null;
}

export default function VoteResultDisplay() {
    const { meetId } = useParams<{ meetId: string }>();

    const [currentDisplay, setCurrentDisplay] = useState<CurrentDisplay | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    // Judge votes (received via broadcast - NOT from DB)
    const [judgeVotes, setJudgeVotes] = useState<JudgeVotes>({ HEAD: null, LEFT: null, RIGHT: null });
    const [finalResult, setFinalResult] = useState<'VALID' | 'INVALID' | null>(null);
    const [showResult, setShowResult] = useState(false);

    // Timer state
    const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to fetch current athlete from backend API
    const fetchActiveAthlete = useCallback(async () => {
        if (!meetId) return;

        try {
            const response = await api.get(`/displays/${meetId}/active-athlete`);

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
                    groupId: data.groupId
                });

                // Reset votes when new athlete is loaded
                setJudgeVotes({ HEAD: null, LEFT: null, RIGHT: null });
                setFinalResult(null);
                setShowResult(false);
                setTimerSeconds(null);
                setTimerRunning(false);
            } else {
                setCurrentDisplay(null);
            }

            setError(null);
        } catch (err: any) {
            console.error('Error fetching active athlete:', err);
            if (err.response?.status === 401) {
                setError('Sessione scaduta. Effettua nuovamente il login.');
            }
        } finally {
            setLoading(false);
        }
    }, [meetId]);

    // Timer countdown effect
    useEffect(() => {
        if (timerRunning && timerSeconds !== null && timerSeconds > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerSeconds(prev => {
                    if (prev !== null && prev > 0) {
                        return prev - 1;
                    }
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

    // Setup Supabase Realtime subscriptions
    useEffect(() => {
        if (!meetId) return;

        let broadcastChannel: any = null;
        let currentStateChannel: any = null;

        const setupSubscriptions = async () => {
            // Initial data fetch
            await fetchActiveAthlete();

            // Subscribe to BROADCAST for vote updates (no DB storage)
            const channelName = `display_votes_${meetId}`;
            broadcastChannel = supabase.channel(channelName);

            broadcastChannel
                .on('broadcast', { event: 'judge_vote' }, (payload: any) => {
                    console.log('🗳️ Received vote broadcast:', payload);
                    const { votes } = payload.payload;
                    setJudgeVotes({
                        HEAD: votes.HEAD,
                        LEFT: votes.LEFT,
                        RIGHT: votes.RIGHT
                    });
                })
                .on('broadcast', { event: 'final_result' }, (payload: any) => {
                    console.log('✅ Received final result:', payload);
                    const { result, votes } = payload.payload;
                    setJudgeVotes({
                        HEAD: votes.HEAD,
                        LEFT: votes.LEFT,
                        RIGHT: votes.RIGHT
                    });
                    setFinalResult(result);
                    setShowResult(true);
                    setTimerRunning(false);

                    // After showing result for 3 seconds, refetch athlete (which will be the next one)
                    setTimeout(() => {
                        fetchActiveAthlete();
                    }, 3000);
                })
                .on('broadcast', { event: 'timer_started' }, (payload: any) => {
                    console.log('⏱️ Timer started:', payload);
                    const { seconds } = payload.payload;
                    setTimerSeconds(seconds);
                    setTimerRunning(true);
                })
                .subscribe((status: string) => {
                    console.log('Broadcast subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        setConnectionStatus('connected');
                    }
                });

            // Subscribe to current_state changes (when director advances athlete)
            currentStateChannel = supabase
                .channel(`display_current_state_${meetId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'current_state'
                    },
                    (payload) => {
                        console.log('🔄 current_state changed:', payload);
                        fetchActiveAthlete();
                    }
                )
                .subscribe();
        };

        setupSubscriptions();

        // Cleanup subscriptions on unmount
        return () => {
            if (broadcastChannel) {
                supabase.removeChannel(broadcastChannel);
            }
            if (currentStateChannel) {
                supabase.removeChannel(currentStateChannel);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [meetId, fetchActiveAthlete]);

    // Get vote circle color
    const getVoteColor = (vote: boolean | null, isFinal: boolean) => {
        if (vote === null) {
            return 'bg-dark-bg-tertiary border-dark-border';
        }
        if (vote === true) {
            return isFinal
                ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50'
                : 'bg-green-500/80 border-green-400/80 animate-pulse';
        }
        return isFinal
            ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50'
            : 'bg-red-500/80 border-red-400/80 animate-pulse';
    };

    // Get lift display name in Italian
    const getLiftDisplayName = (liftId: string): string => {
        const liftNames: Record<string, string> = {
            'MU': 'MUSCLE UP',
            'PU': 'PULL UP',
            'DIP': 'DIP',
            'SQ': 'SQUAT',
            'MP': 'MILITARY PRESS'
        };
        return liftNames[liftId] || liftId;
    };

    // Format timer
    const formatTimer = (secs: number): string => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    // Render loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
                    <p className="text-dark-text text-2xl font-bold">Caricamento...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 text-2xl font-bold mb-4">Errore</p>
                    <p className="text-dark-text text-lg">{error}</p>
                    <button
                        onClick={fetchActiveAthlete}
                        className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    // Render waiting state when no athlete
    if (!currentDisplay) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center p-8">
                <div className="text-center">
                    {/* Empty judge circles */}
                    <div className="flex justify-center items-end gap-8 mb-12">
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-dark-bg-tertiary border-4 border-dark-border flex items-center justify-center">
                                <span className="text-dark-text-muted text-xl font-bold">L</span>
                            </div>
                            <span className="text-dark-text-secondary text-sm font-medium mt-2">LEFT</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 rounded-full bg-dark-bg-tertiary border-4 border-dark-border flex items-center justify-center">
                                <span className="text-dark-text-muted text-2xl font-bold">H</span>
                            </div>
                            <span className="text-dark-text-secondary text-sm font-medium mt-2">HEAD</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-dark-bg-tertiary border-4 border-dark-border flex items-center justify-center">
                                <span className="text-dark-text-muted text-xl font-bold">R</span>
                            </div>
                            <span className="text-dark-text-secondary text-sm font-medium mt-2">RIGHT</span>
                        </div>
                    </div>

                    <p className="text-dark-text-secondary text-2xl font-bold mb-4">IN ATTESA DELL'ATLETA</p>
                    <p className="text-dark-text-muted text-base">
                        La schermata si aggiornerà automaticamente
                    </p>

                    {/* Connection status */}
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-dark-text-muted text-sm">
                            {connectionStatus === 'connected' ? 'Connesso' : connectionStatus === 'connecting' ? 'Connessione...' : 'Disconnesso'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Render with current athlete
    const { athlete, attempt, lift } = currentDisplay;

    return (
        <div className="min-h-screen bg-dark-bg flex flex-col p-6">
            {/* Header with athlete info */}
            <header className="text-center mb-8">
                <h1 className="text-5xl font-black text-dark-text mb-3 tracking-tight">
                    {athlete.firstName.toUpperCase()} {athlete.lastName.toUpperCase()}
                </h1>
                <div className="flex items-center justify-center gap-4 text-lg">
                    <span className="px-4 py-1 bg-primary/20 border border-primary/40 rounded-full text-primary font-bold">
                        {athlete.weightCategory}
                    </span>
                    <span className="text-dark-text-secondary">•</span>
                    <span className="text-dark-text-secondary font-medium">{getLiftDisplayName(lift.id)}</span>
                    <span className="text-dark-text-secondary">•</span>
                    <span className="text-yellow-400 font-bold">TENTATIVO {attempt?.attemptNo || 1}</span>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center">
                {/* Weight display */}
                <div className="mb-12">
                    <div className="text-8xl font-black text-dark-text">
                        {attempt?.weightKg || '-'}{' '}
                        <span className="text-4xl text-dark-text-secondary">KG</span>
                    </div>
                </div>

                {/* Timer */}
                {timerSeconds !== null && (
                    <div className={`mb-12 px-8 py-4 rounded-xl border-2 ${timerSeconds <= 10
                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : timerSeconds <= 20
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                : 'bg-dark-bg-secondary border-dark-border text-green-400'
                        }`}>
                        <div className="text-5xl font-mono font-bold">
                            {formatTimer(timerSeconds)}
                        </div>
                    </div>
                )}

                {/* Judge vote circles */}
                <div className="flex items-end justify-center gap-10">
                    {/* Left Judge */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${getVoteColor(judgeVotes.LEFT, showResult)}`}
                        >
                            {judgeVotes.LEFT === true && <span className="text-white text-4xl">✓</span>}
                            {judgeVotes.LEFT === false && <span className="text-white text-4xl">✗</span>}
                        </div>
                        <span className="text-dark-text-secondary text-lg font-bold mt-3">LEFT</span>
                    </div>

                    {/* Head Judge (bigger) */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${getVoteColor(judgeVotes.HEAD, showResult)}`}
                        >
                            {judgeVotes.HEAD === true && <span className="text-white text-6xl">✓</span>}
                            {judgeVotes.HEAD === false && <span className="text-white text-6xl">✗</span>}
                        </div>
                        <span className="text-dark-text-secondary text-lg font-bold mt-3">HEAD</span>
                    </div>

                    {/* Right Judge */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${getVoteColor(judgeVotes.RIGHT, showResult)}`}
                        >
                            {judgeVotes.RIGHT === true && <span className="text-white text-4xl">✓</span>}
                            {judgeVotes.RIGHT === false && <span className="text-white text-4xl">✗</span>}
                        </div>
                        <span className="text-dark-text-secondary text-lg font-bold mt-3">RIGHT</span>
                    </div>
                </div>

                {/* Final result banner */}
                {showResult && finalResult && (
                    <div className={`mt-12 px-12 py-6 rounded-2xl ${finalResult === 'VALID'
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-red-500/20 border-2 border-red-500'
                        }`}>
                        <span className={`text-4xl font-black ${finalResult === 'VALID' ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {finalResult === 'VALID' ? '✓ ALZATA VALIDA' : '✗ ALZATA NON VALIDA'}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer with connection status */}
            <footer className="flex items-center justify-center gap-2 py-4">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className="text-dark-text-muted text-xs">
                    {connectionStatus === 'connected' ? 'Connesso - aggiornamenti in tempo reale' : 'Connessione in corso...'}
                </span>
            </footer>
        </div>
    );
}
