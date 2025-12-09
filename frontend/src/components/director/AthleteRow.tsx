/**
 * ATHLETE ROW
 * Displays a single athlete with attempts, handles weight input and status toggle
 */

import { useState, useRef } from 'react';
import { updateAttemptDirector, createNextAttempt } from '../../services/api';
import { RefreshCw } from 'lucide-react';

interface Attempt {
  id: number;
  weight_kg: number;
  status: string;
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
  attempt1: Attempt | null;
  attempt2: Attempt | null;
  attempt3: Attempt | null;
}

interface AthleteRowProps {
  athlete: Athlete;
  isCurrentAthlete: boolean;
  selectedLiftId: string;
  onAttemptUpdate: (attemptNo?: number, weightInInfoId?: number, newWeight?: number) => void;
}

export default function AthleteRow({
  athlete,
  isCurrentAthlete,
  selectedLiftId,
  onAttemptUpdate
}: AthleteRowProps) {
  const [togglingAttempt, setTogglingAttempt] = useState<number | null>(null);
  
  // Local state for input values - allows immediate UI feedback
  const [localWeights, setLocalWeights] = useState<Record<number, string>>({});
  
  // Track which attempts are currently being processed to prevent double-firing
  const processingRef = useRef<Set<number>>(new Set());

  // Get cell background color based on attempt status (softened colors)
  const getCellColor = (attempt: Attempt | null): string => {
    if (!attempt) return 'bg-dark-bg-secondary';
    if (attempt.status === 'VALID') return 'bg-green-700/80';
    if (attempt.status === 'INVALID') return 'bg-red-700/80';
    return 'bg-dark-bg-secondary';
  };

  // Get the previous attempt info (weight and status) for validation
  const getPreviousAttemptInfo = (attemptNo: number): { weight: number | null; status: string | null } => {
    if (attemptNo === 1) return { weight: null, status: null }; // No previous attempt for first
    const prevAttemptKey = `attempt${attemptNo - 1}` as 'attempt1' | 'attempt2' | 'attempt3';
    const prevAttempt = athlete[prevAttemptKey];
    return {
      weight: prevAttempt?.weight_kg ?? null,
      status: prevAttempt?.status ?? null
    };
  };

  // Handle weight entry (create attempt if not exists, update if exists)
  const handleWeightEntry = async (attemptNo: number, weightStr: string) => {
    // Prevent double-firing (can happen when input is destroyed during re-render)
    if (processingRef.current.has(attemptNo)) {
      return;
    }
    
    const weight = parseFloat(weightStr.replace(',', '.')); // Support both . and , as decimal separator
    
    if (isNaN(weight) || weight < 0) {
      return; // Silent fail for invalid input
    }

    // Validation: weight must be > previous if VALID, >= if INVALID
    const prevInfo = getPreviousAttemptInfo(attemptNo);
    if (prevInfo.weight !== null) {
      if (prevInfo.status === 'VALID') {
        // Previous was VALID: new weight must be strictly greater
        if (weight <= prevInfo.weight) {
          alert(`Il peso deve essere > ${prevInfo.weight} kg (la prova precedente era VALIDA)`);
          return;
        }
      } else {
        // Previous was INVALID: new weight must be >= (can repeat same weight)
        if (weight < prevInfo.weight) {
          alert(`Il peso deve essere >= ${prevInfo.weight} kg (peso della prova precedente)`);
          return;
        }
      }
    }

    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const existingAttempt = athlete[attemptKey];
    
    // Save weight_in_info_id before async call (closure might be stale after await)
    const athleteWeightInInfoId = athlete.weight_in_info_id;

    // Check if weight actually changed - skip API call if same
    const currentWeight = existingAttempt?.weight_kg;
    const weightChanged = currentWeight !== weight;

    // Mark as processing to prevent double-firing
    processingRef.current.add(attemptNo);

    // FIRST: Trigger optimistic update and reordering IMMEDIATELY (before API call)
    // This ensures the UI updates instantly
    onAttemptUpdate(attemptNo, athleteWeightInInfoId, weight);

    // THEN: Persist to backend (in background)
    if (weightChanged) {
      try {
        // Check if attempt exists with a REAL ID (not optimistic -1)
        const hasRealAttempt = existingAttempt && existingAttempt.id > 0;
        
        if (!hasRealAttempt) {
          // Create new attempt (or re-create if we only have optimistic one)
          const response = await createNextAttempt({
            weight_kg: weight,
            lift_id: selectedLiftId,
            weight_in_info_id: athleteWeightInInfoId,
            attempt_no: attemptNo
          });
          // After creating, do a quiet refresh to sync the real ID from backend
          // This is a background refresh that applies hybrid sorting
          if (response.success) {
            // Small delay to let the DB commit, then refresh
            setTimeout(() => {
              onAttemptUpdate();
            }, 200);
          }
        } else if (existingAttempt.status === 'PENDING') {
          // Update existing PENDING attempt weight only
          await updateAttemptDirector(existingAttempt.id, { weight_kg: weight });
        }
      } catch (error: any) {
        console.error('Error saving weight:', error);
        // On error, refresh from backend to get correct state
        onAttemptUpdate();
      }
    }
    
    // Clear processing flag after a short delay (allow re-render to complete)
    setTimeout(() => {
      processingRef.current.delete(attemptNo);
    }, 100);
  };

  // Toggle VALID ↔ INVALID for already judged attempts (doesn't affect cursor)
  const handleToggleStatus = async (attemptNo: number) => {
    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = athlete[attemptKey];
    
    if (!attempt || attempt.status === 'PENDING') return;

    const newStatus = attempt.status === 'VALID' ? 'INVALID' : 'VALID';

    try {
      setTogglingAttempt(attemptNo);
      await updateAttemptDirector(attempt.id, { status: newStatus });
      // Don't trigger full reload, just local update
      onAttemptUpdate();
    } catch (error: any) {
      console.error('Error toggling status:', error);
    } finally {
      setTogglingAttempt(null);
    }
  };

  // Check if previous attempt is completed (for enabling next attempt input)
  const isPreviousAttemptCompleted = (attemptNo: number): boolean => {
    if (attemptNo === 1) return true; // First attempt is always available
    
    const prevAttemptKey = `attempt${attemptNo - 1}` as 'attempt1' | 'attempt2' | 'attempt3';
    const prevAttempt = athlete[prevAttemptKey];
    
    // Previous attempt must exist and be judged (not PENDING)
    return prevAttempt !== null && prevAttempt.status !== 'PENDING';
  };

  // Render a single attempt cell
  const renderAttemptCell = (attemptNo: number) => {
    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = athlete[attemptKey];
    const bgColor = getCellColor(attempt);
    const isToggling = togglingAttempt === attemptNo;

    // If attempt exists and has been judged (VALID or INVALID)
    if (attempt && attempt.status && attempt.status !== 'PENDING') {
      return (
        <td className={`px-4 py-3 text-center font-bold text-white ${bgColor} relative group`}>
          <div className="flex items-center justify-center gap-2">
            <span>{attempt.weight_kg} kg</span>
            {/* Toggle button - appears on hover or during toggle */}
            <button
              onClick={() => handleToggleStatus(attemptNo)}
              disabled={isToggling}
              className={`
                p-1 rounded transition-all
                ${isToggling 
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
                }
                hover:bg-white/20
              `}
              title={`Cambia in ${attempt.status === 'VALID' ? 'NON VALIDA' : 'VALIDA'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isToggling ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </td>
      );
    }

    // If attempt exists but is PENDING, show editable weight
    if (attempt && attempt.status === 'PENDING') {
      // Use local state if available, otherwise use attempt weight from props
      const displayValue = localWeights[attemptNo] !== undefined 
        ? localWeights[attemptNo] 
        : (attempt.weight_kg !== null && attempt.weight_kg !== undefined ? String(attempt.weight_kg) : '');
      
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => {
              // Update local state immediately for responsive UI
              setLocalWeights(prev => ({ ...prev, [attemptNo]: e.target.value }));
            }}
            onBlur={(e) => {
              const val = e.target.value.replace(',', '.');
              const newWeight = parseFloat(val);
              // Call handleWeightEntry if valid weight
              if (!isNaN(newWeight) && newWeight >= 0) {
                handleWeightEntry(attemptNo, e.target.value);
              }
              // Clear local state after blur - let parent's state take over
              setLocalWeights(prev => {
                const next = { ...prev };
                delete next[attemptNo];
                return next;
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="w-20 px-2 py-1 text-center bg-dark-bg border border-dark-border rounded text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-dark-accent"
          />
        </td>
      );
    }

    // No attempt yet - show input field if previous attempt is completed
    if (isPreviousAttemptCompleted(attemptNo)) {
      // Use local state if available
      const displayValue = localWeights[attemptNo] !== undefined ? localWeights[attemptNo] : '';
      
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="--"
            value={displayValue}
            onChange={(e) => {
              setLocalWeights(prev => ({ ...prev, [attemptNo]: e.target.value }));
            }}
            onBlur={(e) => {
              if (e.target.value) {
                handleWeightEntry(attemptNo, e.target.value);
              }
              // Clear local state after blur
              setLocalWeights(prev => {
                const next = { ...prev };
                delete next[attemptNo];
                return next;
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="w-20 px-2 py-1 text-center bg-dark-bg border border-dark-border rounded text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-dark-accent"
          />
        </td>
      );
    }

    // Future attempt - show placeholder (previous not completed)
    return (
      <td className={`px-4 py-3 text-center text-dark-text-secondary ${bgColor}`}>
        --
      </td>
    );
  };

  return (
    <tr
      className="border-b border-dark-border hover:bg-dark-bg-tertiary transition-colors"
    >
      {/* NOME */}
      <td className={`px-3 py-3 text-dark-text-primary font-medium w-32 ${
        isCurrentAthlete ? 'bg-cyan-600/40 border-l-4 border-cyan-500' : ''
      }`}>
        {athlete.first_name.toUpperCase()}
      </td>

      {/* COGNOME */}
      <td className={`px-3 py-3 text-dark-text-primary font-medium w-32 ${
        isCurrentAthlete ? 'bg-cyan-600/40' : ''
      }`}>
        {athlete.last_name.toUpperCase()}
      </td>

      {/* CAT. PESO */}
      <td className={`px-3 py-3 text-dark-text-primary w-24 ${
        isCurrentAthlete ? 'bg-cyan-600/40' : ''
      }`}>
        {athlete.weight_category}
      </td>

      {/* BW */}
      <td className={`px-3 py-3 text-center text-dark-text-primary w-24 ${
        isCurrentAthlete ? 'bg-cyan-600/40' : ''
      }`}>
        {athlete.bodyweight_kg} kg
      </td>

      {/* PROVA 1 */}
      {renderAttemptCell(1)}

      {/* PROVA 2 */}
      {renderAttemptCell(2)}

      {/* PROVA 3 */}
      {renderAttemptCell(3)}
    </tr>
  );
}
