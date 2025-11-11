/**
 * GROUP DIVISION TAB - Divisione Gruppi
 * 
 * Automatic division of athletes into flights and groups
 * Features:
 * - Automatic creation based on weight categories and totals
 * - Drag & drop to modify assignments
 * - Export to Excel (nomination)
 */

import { useState, useEffect } from 'react';
import { createDivision, getDivision, saveDivision } from '../../services/api';
import { supabase } from '../../services/supabase';
import type { DivisionFlight, DivisionAthlete } from '../../types';
import { Users, Download, Save, ChevronRight } from 'lucide-react';

interface GroupDivisionTabProps {
  meetId?: string;
}

// Extended athlete with form_lifts for total calculation
interface AthleteWithLifts extends DivisionAthlete {
  lifts: { lift_id: string; declared_max_kg: number }[];
}

export default function GroupDivisionTab({ meetId }: GroupDivisionTabProps) {
  const [flights, setFlights] = useState<DivisionFlight[]>([]);
  const [athletesWithLifts, setAthletesWithLifts] = useState<AthleteWithLifts[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [divisionExists, setDivisionExists] = useState(false);

  // Load existing division on mount
  useEffect(() => {
    if (meetId) {
      loadDivision();
    }
  }, [meetId]);

  const loadDivision = async () => {
    if (!meetId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getDivision(parseInt(meetId));
      
      if (response.success && response.flights && response.flights.length > 0) {
        setFlights(response.flights);
        setDivisionExists(true);
        
        // Load lifts for total calculation
        await loadAthletesWithLifts(response.flights);
      } else {
        setDivisionExists(false);
      }
    } catch (err: any) {
      console.error('Error loading division:', err);
      setDivisionExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAthletesWithLifts = async (flightsData: DivisionFlight[]) => {
    // Extract all form_ids from all groups
    const formIds: number[] = [];
    flightsData.forEach(flight => {
      flight.groups.forEach(group => {
        group.athletes?.forEach(athlete => {
          if (athlete.form_id) {
            formIds.push(athlete.form_id);
          }
        });
      });
    });

    if (formIds.length === 0) return;

    // Load form_lifts for these athletes
    const { data: lifts, error: liftsError } = await supabase
      .from('form_lifts')
      .select('form_id, lift_id, declared_max_kg')
      .in('form_id', formIds);

    if (liftsError) {
      console.error('Error loading lifts:', liftsError);
      return;
    }

    // Create map: form_id -> lifts[]
    const liftsMap = new Map<number, { lift_id: string; declared_max_kg: number }[]>();
    (lifts || []).forEach(lift => {
      if (!liftsMap.has(lift.form_id)) {
        liftsMap.set(lift.form_id, []);
      }
      liftsMap.get(lift.form_id)!.push({
        lift_id: lift.lift_id,
        declared_max_kg: lift.declared_max_kg
      });
    });

    // Enrich athletes with lifts
    const enriched: AthleteWithLifts[] = [];
    flightsData.forEach(flight => {
      flight.groups.forEach(group => {
        group.athletes?.forEach(athlete => {
          enriched.push({
            ...athlete,
            flight_id: flight.id,
            flight_name: flight.name,
            group_id: group.id,
            group_name: group.name,
            lifts: liftsMap.get(athlete.form_id) || []
          });
        });
      });
    });

    setAthletesWithLifts(enriched);
  };

  const handleCreateDivision = async () => {
    if (!meetId) {
      setError('Meet ID non disponibile');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await createDivision(parseInt(meetId));

      if (response.success) {
        setSuccessMessage(
          `Divisione creata con successo! ${response.division?.flights} flight, ${response.division?.groups} gruppi, ${response.division?.athletes} atleti.`
        );
        // Reload division
        await loadDivision();
      } else {
        setError(response.message || 'Errore durante la creazione della divisione');
      }
    } catch (err: any) {
      console.error('Error creating division:', err);
      setError(err.response?.data?.error || 'Errore durante la creazione della divisione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDivision = async () => {
    if (!meetId) {
      setError('Meet ID non disponibile');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await saveDivision(parseInt(meetId), { flights });

      if (response.success) {
        setSuccessMessage('Struttura salvata con successo!');
      } else {
        setError(response.message || 'Errore durante il salvataggio');
      }
    } catch (err: any) {
      console.error('Error saving division:', err);
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportNomination = () => {
    // TODO: Implement Excel export (STEP 5)
    alert('Export Excel - Da implementare nello STEP 5');
  };

  const calculateTotal = (lifts: { declared_max_kg: number }[]): number => {
    return lifts.reduce((sum, lift) => sum + Number(lift.declared_max_kg), 0);
  };

  // Handle drag & drop (simplified for now - will implement in STEP 3)
  const handleDragStart = (e: React.DragEvent, athleteId: number) => {
    e.dataTransfer.setData('athleteId', athleteId.toString());
  };

  const handleDrop = (e: React.DragEvent, targetFlightId: number, targetGroupId: number) => {
    e.preventDefault();
    const athleteId = parseInt(e.dataTransfer.getData('athleteId'));
    
    // TODO: Implement drag & drop logic in STEP 3
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!meetId) {
    return (
      <div className="card p-8">
        <p className="text-dark-text-secondary">
          Devi prima creare la gara nel tab INFO
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-dark-text-secondary">Caricamento divisione...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card p-6">
        <div className="flex flex-wrap gap-4">
          {/* Create Division Button */}
          <button
            onClick={handleCreateDivision}
            disabled={isCreating || divisionExists}
            className={`btn-primary flex items-center gap-2 ${
              divisionExists ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Users className="w-5 h-5" />
            {isCreating ? 'Creazione in corso...' : 'CREA DIVISIONE FLIGHT E GRUPPI'}
          </button>

          {/* Save Structure Button */}
          {divisionExists && (
            <button
              onClick={handleSaveDivision}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Salvataggio...' : 'SALVA STRUTTURA E STAMPA NOMINATION'}
            </button>
          )}

          {/* Export Button */}
          {divisionExists && (
            <button
              onClick={handleExportNomination}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              ESPORTA EXCEL
            </button>
          )}

          {/* Next Button */}
          <button
            className="btn-secondary flex items-center gap-2 ml-auto"
            onClick={() => {/* TODO: Navigate to next tab */}}
          >
            AVANTI
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {!divisionExists && (
          <p className="text-dark-text-secondary text-sm mt-4">
            ⚠️ Crea prima la divisione automatica cliccando il pulsante rosso. Potrai poi modificarla manualmente.
          </p>
        )}
      </div>

      {/* Athletes Table */}
      {divisionExists && athletesWithLifts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-dark-text mb-4">
            Lista Atleti - Divisione per Flight e Gruppi
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Nome</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Cognome</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Sesso</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Cat. Peso</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Totale Provv.</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Flight</th>
                  <th className="text-left py-3 px-4 text-dark-text font-semibold">Gruppo</th>
                </tr>
              </thead>
              <tbody>
                {athletesWithLifts.map((athlete, index) => (
                  <tr
                    key={athlete.athlete_id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, athlete.athlete_id)}
                    onDrop={(e) => handleDrop(e, athlete.flight_id!, athlete.group_id!)}
                    onDragOver={handleDragOver}
                    className={`border-b border-dark-border/50 hover:bg-dark-bg-secondary transition-colors cursor-move ${
                      index % 2 === 0 ? 'bg-dark-bg' : 'bg-dark-bg-secondary/30'
                    }`}
                  >
                    <td className="py-3 px-4 text-dark-text">{athlete.first_name}</td>
                    <td className="py-3 px-4 text-dark-text">{athlete.last_name}</td>
                    <td className="py-3 px-4 text-dark-text">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        athlete.sex === 'F' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {athlete.sex}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark-text">{athlete.weight_category}</td>
                    <td className="py-3 px-4 text-primary font-semibold">
                      {calculateTotal(athlete.lifts)} kg
                    </td>
                    <td className="py-3 px-4 text-dark-text">
                      <select
                        value={athlete.flight_id}
                        onChange={(e) => {
                          // TODO: Handle flight change
                        }}
                        className="bg-dark-bg-secondary border border-dark-border rounded px-2 py-1 text-sm text-dark-text"
                      >
                        {flights.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-dark-text">
                      <select
                        value={athlete.group_id}
                        onChange={(e) => {
                          // TODO: Handle group change
                        }}
                        className="bg-dark-bg-secondary border border-dark-border rounded px-2 py-1 text-sm text-dark-text"
                      >
                        {flights
                          .find(f => f.id === athlete.flight_id)
                          ?.groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-dark-bg-secondary rounded-lg">
            <h4 className="text-dark-text font-semibold mb-2">Riepilogo Divisione</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-dark-text-secondary">Flight totali:</span>
                <span className="text-dark-text font-semibold ml-2">{flights.length}</span>
              </div>
              <div>
                <span className="text-dark-text-secondary">Gruppi totali:</span>
                <span className="text-dark-text font-semibold ml-2">
                  {flights.reduce((sum, f) => sum + f.groups.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-dark-text-secondary">Atleti totali:</span>
                <span className="text-dark-text font-semibold ml-2">{athletesWithLifts.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {divisionExists && athletesWithLifts.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-dark-text-secondary">
            Nessun atleta trovato nella divisione
          </p>
        </div>
      )}
    </div>
  );
}
