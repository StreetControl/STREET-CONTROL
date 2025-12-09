/**
 * ATHLETE ROW
 * Displays a single athlete with attempts, handles weight input and status display
 * 
 * Updated:
 * - Softened red/green colors (bg-green-700/80, bg-red-700/80)
 * - Small toggle button in judged cells to flip VALID↔INVALID (doesn't move cursor)
 * - Can always enter weight for next attempt after current one is judged
 * - Cursor movement is independent from editing judged cells
 */

import { useState } from 'react';
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
  currentRound: number;
  selectedLiftId: string;
  onAttemptUpdate: () => void;
}

export default function AthleteRow({
  athlete,
  isCurrentAthlete,
  currentRound,
  selectedLiftId,
  onAttemptUpdate
}: AthleteRowProps) {
  const [togglingAttempt, setTogglingAttempt] = useState<number | null>(null);

  // Get cell background color based on attempt status (softened colors)
  const getCellColor = (attempt: Attempt | null): string => {
    if (!attempt) return 'bg-dark-bg-secondary';
    if (attempt.status === 'VALID') return 'bg-green-700/80';
    if (attempt.status === 'INVALID') return 'bg-red-700/80';
    return 'bg-dark-bg-secondary';
  };

  // Handle weight entry (create attempt if not exists, update if exists)
  const handleWeightEntry = async (attemptNo: number, weightStr: string) => {
    const weight = parseFloat(weightStr);
    
    if (isNaN(weight) || weight < 0) {
      return; // Silent fail for invalid input
    }

    try {
      const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
      const existingAttempt = athlete[attemptKey];

      if (!existingAttempt) {
        // Create new attempt
        await createNextAttempt({
          weight_kg: weight,
          lift_id: selectedLiftId,
          weight_in_info_id: athlete.weight_in_info_id,
          attempt_no: attemptNo
        });
      } else if (existingAttempt.status === 'PENDING') {
        // Update existing PENDING attempt weight only
        await updateAttemptDirector(existingAttempt.id, { weight_kg: weight });
      }
      // If attempt is already judged (VALID/INVALID), don't allow weight change via input

      onAttemptUpdate();
    } catch (error: any) {
      console.error('Error saving weight:', error);
    }
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
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="number"
            step="0.5"
            defaultValue={attempt.weight_kg || ''}
            onBlur={(e) => {
              const newWeight = parseFloat(e.target.value);
              if (!isNaN(newWeight) && newWeight !== attempt.weight_kg) {
                handleWeightEntry(attemptNo, e.target.value);
              }
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
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="number"
            step="0.5"
            placeholder="--"
            onBlur={(e) => {
              if (e.target.value) {
                handleWeightEntry(attemptNo, e.target.value);
              }
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
