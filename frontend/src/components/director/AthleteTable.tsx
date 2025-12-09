/**
 * ATHLETE TABLE
 * Displays athletes with their attempts
 */

import AthleteRow from './AthleteRow.tsx';

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

interface AthleteTableProps {
  athletes: Athlete[];
  currentAthleteIndex: number;
  currentRound: number;
  selectedLiftId: string;
  onAttemptUpdate: (attemptNo?: number, weightInInfoId?: number, newWeight?: number) => void;
}

export default function AthleteTable({
  athletes,
  currentAthleteIndex,
  currentRound,
  selectedLiftId,
  onAttemptUpdate
}: AthleteTableProps) {
  return (
    <div className="card overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-purple-500/30 bg-gradient-to-r from-purple-900/30 to-purple-800/20">
                <th className="px-3 py-3 text-left text-xs font-bold text-purple-300 uppercase tracking-wider w-32">
                  NOME
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-purple-300 uppercase tracking-wider w-32">
                  COGNOME
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-purple-300 uppercase tracking-wider w-24">
                  CAT. PESO
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-purple-300 uppercase tracking-wider w-24">
                  BW
                </th>
                <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-l-2 border-purple-500/30 w-40 ${currentRound === 1 ? 'text-cyan-400 border-t-4 border-t-cyan-500' : 'text-purple-300'}`}>
                  PROVA 1
                </th>
                <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-40 ${currentRound === 2 ? 'text-cyan-400 border-t-4 border-t-cyan-500' : 'text-purple-300'}`}>
                  PROVA 2
                </th>
                <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-40 ${currentRound === 3 ? 'text-cyan-400 border-t-4 border-t-cyan-500' : 'text-purple-300'}`}>
                  PROVA 3
                </th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete, index) => (
                <AthleteRow
                  key={athlete.nomination_id}
                  athlete={athlete}
                  isCurrentAthlete={index === currentAthleteIndex}
                  selectedLiftId={selectedLiftId}
                  onAttemptUpdate={onAttemptUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
