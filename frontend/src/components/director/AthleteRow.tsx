/**
 * ATHLETE ROW
 * Displays a single athlete with attempts, handles weight input and status display
 */

import { useState } from 'react';
import { updateAttemptDirector, createNextAttempt } from '../../services/api';

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
  attempt1: Attempt | null;
  attempt2: Attempt | null;
  attempt3: Attempt | null;
  current_attempt_no: number;
}

interface AthleteRowProps {
  athlete: Athlete;
  isCurrentAthlete: boolean;
  selectedLiftId: string;
  onAttemptUpdate: () => void;
}

export default function AthleteRow({
  athlete,
  isCurrentAthlete,
  selectedLiftId,
  onAttemptUpdate
}: AthleteRowProps) {
  const [editingWeight, setEditingWeight] = useState<string>('');

  // Get cell background color based on attempt status
  const getCellColor = (attempt: Attempt | null): string => {
    if (!attempt) return 'bg-dark-bg-secondary';
    if (attempt.status === 'VALID') return 'bg-green-600';
    if (attempt.status === 'INVALID') return 'bg-red-600';
    return 'bg-dark-bg-secondary';
  };

  // Handle weight entry (create attempt if not exists, update if exists without status)
  const handleWeightEntry = async (attemptNo: number, weightStr: string) => {
    const weight = parseFloat(weightStr);
    
    if (isNaN(weight) || weight <= 0) {
      alert('Inserisci un peso valido');
      return;
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
      } else if (!existingAttempt.status) {
        // Update existing attempt without status
        await updateAttemptDirector(existingAttempt.id, { weight_kg: weight });
      } else {
        // Attempt already has status, cannot modify
        alert('Impossibile modificare: tentativo già valutato');
        return;
      }

      // Clear input and reload data
      setEditingWeight('');
      onAttemptUpdate();

    } catch (error: any) {
      console.error('Error saving weight:', error);
      alert('Errore durante il salvataggio del peso');
    }
  };

  // Render a single attempt cell
  const renderAttemptCell = (attemptNo: number) => {
    const attemptKey = `attempt${attemptNo}` as 'attempt1' | 'attempt2' | 'attempt3';
    const attempt = athlete[attemptKey];
    const bgColor = getCellColor(attempt);

    // If attempt exists and has status, show weight with color
    if (attempt && attempt.status) {
      return (
        <td className={`px-4 py-3 text-center font-bold text-white ${bgColor}`}>
          {attempt.weight_kg} kg
        </td>
      );
    }

    // If attempt exists but no status, show editable weight
    if (attempt && !attempt.status) {
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="number"
            step="0.5"
            defaultValue={attempt.weight_kg}
            onBlur={(e) => {
              if (e.target.value && parseFloat(e.target.value) !== attempt.weight_kg) {
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

    // No attempt yet - show input field if it's the current attempt
    if (attemptNo === athlete.current_attempt_no) {
      return (
        <td className={`px-4 py-3 text-center ${bgColor}`}>
          <input
            type="number"
            step="0.5"
            placeholder="--"
            value={editingWeight}
            onChange={(e) => setEditingWeight(e.target.value)}
            onBlur={() => {
              if (editingWeight) {
                handleWeightEntry(attemptNo, editingWeight);
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

    // Future attempt - show placeholder
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
