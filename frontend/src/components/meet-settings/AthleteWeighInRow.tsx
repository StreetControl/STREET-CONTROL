/**
 * ATHLETE WEIGH-IN ROW
 * Single row component for athlete weigh-in data entry
 */

import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import type { WeighInAthlete } from '../../types';

interface AthleteWeighInRowProps {
  athlete: WeighInAthlete;
  lifts: string[]; // ['MU', 'PU', 'DIP', 'SQ']
  onSave: (nominationId: number, data: {
    bodyweight_kg: number | null;
    rack_height: number;
    belt_height: number;
    out_of_weight: number;
    notes: string;
    openers: Record<string, number | null>;
  }) => Promise<void>;
}

export default function AthleteWeighInRow({ athlete, lifts, onSave }: AthleteWeighInRowProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [bodyweight, setBodyweight] = useState<string>(athlete.bodyweight_kg?.toString() || '');
  const [rackHeight, setRackHeight] = useState<string>(athlete.rack_height?.toString() || '0');
  const [beltHeight, setBeltHeight] = useState<string>(athlete.belt_height?.toString() || '0');
  const [outOfWeight, setOutOfWeight] = useState<boolean>(athlete.out_of_weight === 1);
  const [notes] = useState<string>(athlete.notes || '');
  
  // Openers state (one for each lift)
  const [openers, setOpeners] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    lifts.forEach(liftId => {
      initial[liftId] = athlete.openers[liftId]?.toString() || '';
    });
    return initial;
  });

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      // Convert openers string values to numbers or null
      const openersData: Record<string, number | null> = {};
      Object.keys(openers).forEach(liftId => {
        const val = openers[liftId].trim();
        openersData[liftId] = val === '' ? null : parseFloat(val);
      });

      await onSave(athlete.nomination_id, {
        bodyweight_kg: bodyweight.trim() === '' ? null : parseFloat(bodyweight),
        rack_height: parseInt(rackHeight) || 0,
        belt_height: parseInt(beltHeight) || 0,
        out_of_weight: outOfWeight ? 1 : 0,
        notes: notes.trim(),
        openers: openersData
      });
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenerChange = (liftId: string, value: string) => {
    setOpeners(prev => ({
      ...prev,
      [liftId]: value
    }));
  };

  const isDataEntered = bodyweight.trim() !== '' || Object.values(openers).some(v => v.trim() !== '');
  const hasUnsavedChanges = 
    bodyweight !== (athlete.bodyweight_kg?.toString() || '') ||
    rackHeight !== (athlete.rack_height?.toString() || '0') ||
    beltHeight !== (athlete.belt_height?.toString() || '0') ||
    outOfWeight !== (athlete.out_of_weight === 1) ||
    notes !== (athlete.notes || '') ||
    Object.keys(openers).some(liftId => openers[liftId] !== (athlete.openers[liftId]?.toString() || ''));

  return (
    <tr className="hover:bg-dark-bg/30 transition-colors">
      {/* Nome */}
      <td className="px-3 py-3 text-sm text-dark-text text-center whitespace-nowrap">
        {athlete.first_name}
      </td>

      {/* Cognome */}
      <td className="px-3 py-3 text-sm text-dark-text text-center whitespace-nowrap">
        {athlete.last_name}
      </td>

      {/* Sesso */}
      <td className="px-3 py-3 text-center">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          athlete.sex === 'F' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {athlete.sex}
        </span>
      </td>

      {/* Categoria Peso (read-only) */}
      <td className="px-3 py-3 text-sm text-dark-text-secondary text-center border-r-2 border-dark-border/50">
        {athlete.weight_category}
      </td>

      {/* BODYWEIGHT */}
      <td className="px-3 py-3">
        <input
          type="number"
          step="0.1"
          value={bodyweight}
          onChange={(e) => setBodyweight(e.target.value)}
          placeholder="kg"
          className="w-20 px-2 py-1 text-sm bg-dark-bg border border-dark-border rounded text-dark-text focus:border-primary focus:outline-none"
        />
      </td>

      {/* OUT OF WEIGHT */}
      <td className="px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={outOfWeight}
          onChange={(e) => setOutOfWeight(e.target.checked)}
          className="w-5 h-5 rounded border-dark-border bg-dark-bg text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
        />
      </td>

      {/* RACK */}
      <td className="px-3 py-3">
        <input
          type="number"
          value={rackHeight}
          onChange={(e) => setRackHeight(e.target.value)}
          placeholder="0"
          className="w-16 px-2 py-1 text-sm bg-dark-bg border border-dark-border rounded text-dark-text focus:border-primary focus:outline-none"
        />
      </td>

      {/* BELT */}
      <td className="px-3 py-3">
        <input
          type="number"
          value={beltHeight}
          onChange={(e) => setBeltHeight(e.target.value)}
          placeholder="0"
          className="w-16 px-2 py-1 text-sm bg-dark-bg border border-dark-border rounded text-dark-text focus:border-primary focus:outline-none"
        />
      </td>

      {/* OPENERS (dynamic columns based on lifts) */}
      {lifts.map((liftId) => (
        <td key={liftId} className="px-3 py-3">
          <input
            type="number"
            step="0.5"
            value={openers[liftId] || ''}
            onChange={(e) => handleOpenerChange(liftId, e.target.value)}
            placeholder="kg"
            className="w-20 px-2 py-1 text-sm bg-dark-bg border border-dark-border rounded text-dark-text focus:border-primary focus:outline-none"
          />
        </td>
      ))}

      {/* SAVE BUTTON */}
      <td className="px-3 py-2 sticky right-0 bg-dark-bg-secondary align-middle">
        <div className="flex flex-col items-center justify-center gap-1">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDataEntered}
            className={`
              px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap
              ${isSaving || !isDataEntered
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark text-white'
              }
            `}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvataggio...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salva</span>
              </>
            )}
          </button>

          {/* Status indicators below button */}
          {error && (
            <div className="flex items-center gap-1 text-red-400 text-[10px]">
              <AlertCircle className="w-3 h-3" />
              <span>Errore</span>
            </div>
          )}
          
          {hasUnsavedChanges && !error && (
            <span className="text-[10px] text-yellow-400 whitespace-nowrap">
              Non salvato
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
