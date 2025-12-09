/**
 * PRE-MEET TAB - Pre-Gara Setup (Tab 4.4)
 * Weigh-in and opener declaration for athletes
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeighInAthletes, updateWeighIn } from '../../services/api';
import AthleteWeighInRow from './AthleteWeighInRow';
import type { WeighInFlight, WeighInGroup, WeighInAthlete } from '../../types';

interface PreMeetTabProps {
  meetId?: string;
}

export default function PreMeetTab({ meetId }: PreMeetTabProps) {
  const [flights, setFlights] = useState<WeighInFlight[]>([]);
  const [lifts, setLifts] = useState<string[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load flights and athletes on mount
  useEffect(() => {
    if (meetId) {
      loadWeighInData();
    }
  }, [meetId]);

  const loadWeighInData = async () => {
    if (!meetId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getWeighInAthletes(parseInt(meetId));
      if (response.success) {
        setFlights(response.flights);
        setLifts(response.lifts);
        // Auto-select first flight if available
        if (response.flights.length > 0 && !selectedFlightId) {
          setSelectedFlightId(response.flights[0].id);
        }
      } else {
        setError(response.message || 'Errore nel caricamento dei dati');
      }
    } catch (err: any) {
      console.error('Error loading weigh-in data:', err);
      setError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected flight
  const selectedFlight = useMemo(() => {
    return flights.find(f => f.id === selectedFlightId) || null;
  }, [flights, selectedFlightId]);

  // Filter athletes by search query (search across ALL flights and groups)
  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // If no search query, show only selected flight's groups
    if (!query) {
      return selectedFlight ? selectedFlight.groups : [];
    }

    // Search across ALL flights and groups
    const allMatchingGroups: WeighInGroup[] = [];

    flights.forEach(flight => {
      flight.groups.forEach(group => {
        const matchingAthletes = group.athletes.filter(athlete => {
          const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
          const reverseName = `${athlete.last_name} ${athlete.first_name}`.toLowerCase();
          return athlete.first_name.toLowerCase().includes(query) ||
                 athlete.last_name.toLowerCase().includes(query) ||
                 fullName.includes(query) ||
                 reverseName.includes(query);
        });

        if (matchingAthletes.length > 0) {
          allMatchingGroups.push({
            ...group,
            athletes: matchingAthletes
          });
        }
      });
    });

    return allMatchingGroups;
  }, [flights, selectedFlight, searchQuery]);

  const toggleGroup = (groupId: number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSaveAthlete = async (
    nominationId: number,
    data: {
      bodyweight_kg: number | null;
      rack_height: number;
      belt_height: number;
      out_of_weight: number;
      notes: string;
      openers: Record<string, number | null>;
    }
  ) => {
    try {
      const response = await updateWeighIn(nominationId, data);
      if (response.success) {
        // Update local state instead of reloading everything
        setFlights(prevFlights => 
          prevFlights.map(flight => ({
            ...flight,
            groups: flight.groups.map(group => ({
              ...group,
              athletes: group.athletes.map(athlete => 
                athlete.nomination_id === nominationId
                  ? {
                      ...athlete,
                      bodyweight_kg: data.bodyweight_kg,
                      rack_height: data.rack_height,
                      belt_height: data.belt_height,
                      out_of_weight: data.out_of_weight,
                      notes: data.notes,
                      openers: data.openers
                    }
                  : athlete
              )
            }))
          }))
        );
      } else {
        throw new Error(response.message || 'Errore durante il salvataggio');
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Errore durante il salvataggio');
    }
  };

  if (!meetId) {
    return (
      <div className="card p-8">
        <p className="text-dark-text-secondary text-center">
          Seleziona una gara per continuare
        </p>
      </div>
    );
  }

  return (
    <div className="card p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark-text mb-2">
          Pesatura e Prime Chiamate
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Flight Selector + Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Flight Dropdown */}
        <div>
          <label className="label mb-2">
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-semibold mr-2">SELEZIONA UN FLIGHT</span>
          </label>
          <select
            value={selectedFlightId || ''}
            onChange={(e) => setSelectedFlightId(e.target.value ? parseInt(e.target.value) : null)}
            className={`input-field ${isLoading || flights.length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'} enabled:opacity-100 enabled:cursor-pointer enabled:pointer-events-auto`}
            disabled={isLoading || flights.length === 0}
          >
            <option value="">
              {isLoading ? 'Caricamento...' : flights.length === 0 ? 'Nessun flight disponibile' : 'Seleziona...'}
            </option>
            {flights.map((flight) => (
              <option key={flight.id} value={flight.id}>
                {flight.name} - Giorno {flight.day_number} {flight.start_time && `(${flight.start_time})`}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div>
          <label className="label mb-2">
            Cerca Atleta (in tutti i flight)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nome o cognome..."
              className="input-field pl-10"
              disabled={flights.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-dark-text-secondary">Caricamento dati...</p>
          </div>
        </div>
      )}

      {/* No Flight Selected */}
      {!isLoading && !selectedFlightId && !searchQuery && (
        <div className="text-center py-12">
          <p className="text-dark-text-secondary">
            Seleziona un flight per visualizzare gli atleti
          </p>
        </div>
      )}

      {/* Athletes Table (grouped by Group) */}
      {!isLoading && (selectedFlightId || searchQuery) && filteredGroups.length > 0 && (
        <div className="space-y-6">
          {filteredGroups.map((group: WeighInGroup) => {
            const isCollapsed = collapsedGroups.has(group.id);
            const athleteCount = group.athletes.length;

            return (
              <div key={group.id} className="bg-dark-bg-secondary border border-dark-border rounded-lg overflow-hidden">
                {/* Group Header (Collapsible) */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-dark-bg hover:from-purple-900/30 transition-colors border-l-4 border-purple-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-purple-600/30 text-purple-400 rounded text-xs font-bold uppercase">GROUP</span>
                    <h3 className="text-lg font-semibold text-dark-text">
                      {group.name}
                    </h3>
                    <span className="text-sm text-dark-text-secondary">
                      ({athleteCount} atleti)
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-purple-400" />
                  )}
                </button>

                {/* Group Table (if not collapsed) */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-bg border-b border-dark-border">
                        <tr>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Cognome
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Sesso
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider border-r-2 border-dark-border">
                            Cat.Peso
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            BW (kg)
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Out
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Rack
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                            Belt
                          </th>
                          {/* Dynamic columns for lifts */}
                          {lifts.map((liftId) => (
                            <th key={liftId} className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                              {liftId} (kg)
                            </th>
                          ))}
                          <th className="px-3 py-3 text-center text-xs font-semibold text-dark-text-secondary uppercase tracking-wider sticky right-0 bg-dark-bg">
                            Azioni
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {group.athletes.map((athlete: WeighInAthlete) => (
                          <AthleteWeighInRow
                            key={athlete.nomination_id}
                            athlete={athlete}
                            lifts={lifts}
                            onSave={handleSaveAthlete}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {!isLoading && (selectedFlightId || searchQuery) && filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-dark-text-secondary">
            {searchQuery ? 'Nessun atleta trovato con questo nome' : 'Nessun atleta in questo flight'}
          </p>
        </div>
      )}
    </div>
  );
}
