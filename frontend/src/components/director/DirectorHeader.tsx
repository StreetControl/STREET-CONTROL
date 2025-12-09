/**
 * DIRECTOR HEADER
 * Dropdown controls for flight, group, and lift selection
 */

import { ChevronDown } from 'lucide-react';

interface Flight {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
}

interface Lift {
  id: string;
  name: string;
}

interface DirectorHeaderProps {
  flights: Flight[];
  selectedFlightId: number | null;
  availableGroups: Group[];
  selectedGroupId: number | null;
  lifts: Lift[];
  selectedLiftId: string | null;
  onFlightChange: (flightId: number) => void;
  onGroupChange: (groupId: number) => void;
  onLiftChange: (liftId: string) => void;
  onMarkValid: () => void;
  onMarkInvalid: () => void;
  updating: boolean;
  hasCurrentAthlete: boolean;
  isGroupCompleted: boolean;
}

export default function DirectorHeader({
  flights,
  selectedFlightId,
  availableGroups,
  selectedGroupId,
  lifts,
  selectedLiftId,
  onFlightChange,
  onGroupChange,
  onLiftChange,
  onMarkValid,
  onMarkInvalid,
  updating,
  hasCurrentAthlete,
  isGroupCompleted
}: DirectorHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Flight Selector */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-dark-text-secondary mb-1">
          FLIGHT
        </label>
        <div className="relative">
          <select
            value={selectedFlightId || ''}
            onChange={(e) => onFlightChange(parseInt(e.target.value))}
            className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-2.5 rounded-lg appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Seleziona Flight</option>
            {flights.map((flight) => (
              <option key={flight.id} value={flight.id}>
                {flight.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Group Selector */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-dark-text-secondary mb-1">
          GRUPPO
        </label>
        <div className="relative">
          <select
            value={selectedGroupId || ''}
            onChange={(e) => onGroupChange(parseInt(e.target.value))}
            disabled={!selectedFlightId || availableGroups.length === 0}
            className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-2.5 rounded-lg appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Seleziona Gruppo</option>
            {availableGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Lift Selector */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-dark-text-secondary mb-1">
          ALZATA
        </label>
        <div className="relative">
          <select
            value={selectedLiftId || ''}
            onChange={(e) => onLiftChange(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-2.5 rounded-lg appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Seleziona Alzata</option>
            {lifts.map((lift) => (
              <option key={lift.id} value={lift.id}>
                {lift.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 ml-auto">
        <button
          onClick={onMarkInvalid}
          disabled={updating || !hasCurrentAthlete || isGroupCompleted}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg border-2 border-red-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          NON VALIDA
        </button>
        <button
          onClick={onMarkValid}
          disabled={updating || !hasCurrentAthlete || isGroupCompleted}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg border-2 border-green-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          VALIDA
        </button>
      </div>
    </div>
  );
}
