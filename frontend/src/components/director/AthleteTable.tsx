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
  attempt1: Attempt | null;
  attempt2: Attempt | null;
  attempt3: Attempt | null;
  current_attempt_no: number;
}

interface AthleteTableProps {
  athletes: Athlete[];
  currentAthleteIndex: number;
  selectedLiftId: string;
  onAttemptUpdate: () => void;
}

export default function AthleteTable({
  athletes,
  currentAthleteIndex,
  selectedLiftId,
  onAttemptUpdate
}: AthleteTableProps) {
  return (
    <div className="card overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-dark-border">
                <th className="px-3 py-3 text-left text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-32">
                  NOME
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-32">
                  COGNOME
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-24">
                  CAT. PESO
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-24">
                  BW
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-dark-text-secondary uppercase tracking-wider border-l-2 border-dark-border w-40">
                  PROVA 1
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-40">
                  PROVA 2
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-dark-text-secondary uppercase tracking-wider w-40">
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
