/**
 * TIMER DISPLAY COMPONENT
 * Visual countdown timer for HEAD judge only
 * 
 * Features:
 * - 60 second countdown (default)
 * - Start/Stop/Reset controls
 * - X button to invalidate attempt (fuori tempo)
 * - Auto-reset when shouldReset prop changes to true
 * - Broadcasts timer start to display screens
 */

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';

interface TimerDisplayProps {
  defaultSeconds?: number;
  onTimeExpired?: () => void;
  onInvalidate?: () => void;  // Called when X button is pressed
  onTimerStart?: (seconds: number) => void;  // Called when timer is started (for broadcast)
  shouldReset?: boolean;  // When true, reset timer
}

export interface TimerDisplayRef {
  reset: () => void;
  stop: () => void;
}

const TimerDisplay = forwardRef<TimerDisplayRef, TimerDisplayProps>(({
  defaultSeconds = 60,
  onTimeExpired,
  onInvalidate,
  onTimerStart,
  shouldReset = false
}, ref) => {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setHasExpired(true);
            onTimeExpired?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds, onTimeExpired]);

  // Watch for shouldReset prop changes
  useEffect(() => {
    if (shouldReset) {
      setIsRunning(false);
      setSeconds(defaultSeconds);
      setHasExpired(false);
    }
  }, [shouldReset, defaultSeconds]);

  const handleStart = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
      setHasExpired(false);
      // Broadcast timer start
      onTimerStart?.(seconds);
    }
  }, [seconds, onTimerStart]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(defaultSeconds);
    setHasExpired(false);
  }, [defaultSeconds]);

  const handleInvalidate = useCallback(() => {
    setIsRunning(false);
    setHasExpired(true);
    onInvalidate?.();
  }, [onInvalidate]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    reset: handleReset,
    stop: handleStop
  }), [handleReset, handleStop]);

  // Format MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Determine timer color based on remaining time
  const getTimerColor = (): string => {
    if (hasExpired || seconds === 0) return 'text-red-500';
    if (seconds <= 10) return 'text-red-400 animate-pulse';
    if (seconds <= 20) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBgColor = (): string => {
    if (hasExpired || seconds === 0) return 'bg-red-500/20 border-red-500/50';
    if (seconds <= 10) return 'bg-red-500/10 border-red-500/30';
    if (seconds <= 20) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-dark-bg-secondary border-dark-border';
  };

  return (
    <div className={`rounded-xl p-4 border-2 ${getBgColor()} transition-all duration-300`}>
      {/* Timer Display + Controls Row */}
      <div className="flex items-center justify-center gap-4">
        {/* X Button (Invalidate) */}
        <button
          onClick={handleInvalidate}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/50 text-red-400 hover:bg-red-500/40 hover:border-red-500 transition-all"
          title="Fuori tempo - Non valida"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Timer Display */}
        <div className={`text-5xl font-mono font-bold ${getTimerColor()}`}>
          {formatTime(seconds)}
        </div>

        {/* Start/Stop Button */}
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={seconds === 0}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Avvia"
          >
            <Play className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all"
            title="Stoppa"
          >
            <Pause className="w-5 h-5" />
          </button>
        )}

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-dark-bg border border-dark-border text-dark-text-secondary hover:bg-dark-bg-secondary hover:text-dark-text transition-all"
          title="Riavvia"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Legend for X button */}
      <div className="mt-3 text-center">
        <p className="text-xs text-dark-text-secondary">
          <span className="text-red-400 font-medium">✕</span> = Tempo scaduto, prova non valida
        </p>
      </div>

      {/* Expired Message */}
      {hasExpired && (
        <div className="mt-2 text-center">
          <span className="text-red-400 text-sm font-medium animate-pulse">
            ⏰ Tempo scaduto!
          </span>
        </div>
      )}
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay;
