/**
 * TIMER DISPLAY COMPONENT
 * Visual countdown timer for HEAD judge only
 * 
 * Features:
 * - 60 second countdown (default)
 * - Start/Stop/Reset controls
 * - Visual warning when time is low
 */

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimerDisplayProps {
  defaultSeconds?: number;
  onTimeExpired?: () => void;
}

export default function TimerDisplay({ 
  defaultSeconds = 60,
  onTimeExpired 
}: TimerDisplayProps) {
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

  const handleStart = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
      setHasExpired(false);
    }
  }, [seconds]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(defaultSeconds);
    setHasExpired(false);
  }, [defaultSeconds]);

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
      {/* Timer Label */}
      <div className="text-center mb-2">
        <span className="text-xs uppercase tracking-wider text-dark-text-secondary font-medium">
          Timer
        </span>
      </div>

      {/* Timer Display */}
      <div className={`text-5xl font-mono font-bold text-center mb-4 ${getTimerColor()}`}>
        {formatTime(seconds)}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
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
            title="Pausa"
          >
            <Pause className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={handleReset}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-dark-bg border border-dark-border text-dark-text-secondary hover:bg-dark-bg-secondary hover:text-dark-text transition-all"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Expired Message */}
      {hasExpired && (
        <div className="mt-3 text-center">
          <span className="text-red-400 text-sm font-medium animate-pulse">
            ⏰ Tempo scaduto!
          </span>
        </div>
      )}
    </div>
  );
}
