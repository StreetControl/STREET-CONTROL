/**
 * GROUP DIVISION TAB - Divisione Gruppi
 * 
 * Automatic division of athletes into flights and groups
 * Features:
 * - Automatic creation based on weight categories and totals
 * - Inline editing of flight/group assignments via dropdowns
 * - Export to Excel (nomination)
 */

import { useState, useEffect } from 'react';
import { createDivision, getDivision, saveDivision, updateFlightsStructure, updateWeightCategory } from '../../services/api';
import { supabase } from '../../services/supabase';
import type { DivisionFlight, DivisionAthlete } from '../../types';
import { Users, Download, Save, ChevronRight } from 'lucide-react';
import { generateNominationPDF } from './NominationPDF';

interface GroupDivisionTabProps {
  meetId?: string;
}

// Extended athlete with form_lifts for total calculation
interface AthleteWithLifts extends DivisionAthlete {
  lifts: { lift_id: string; declared_max_kg: number }[];
  total_kg?: number;
  weight_cat_id?: number;
}

// Weight category interface
interface WeightCategory {
  id: number;
  name: string;
  sex: string;
  ord: number;
}

// Athlete Row Component
interface AthleteRowProps {
  athlete: AthleteWithLifts;
  index: number;
  flights: DivisionFlight[];
  weightCategories: WeightCategory[];
  onGroupChange: (athleteId: number, newGroupId: number) => void;
  onWeightCategoryChange: (formId: number, newWeightCatId: number) => void;
}

function AthleteRow({ athlete, index, flights, weightCategories, onGroupChange, onWeightCategoryChange }: AthleteRowProps) {
  const bgColor = index % 2 === 0 ? 'bg-dark-bg' : 'bg-dark-bg-secondary/30';

  // Filter weight categories by athlete's sex
  const availableCategories = weightCategories.filter(cat => cat.sex === athlete.sex);

  return (
    <tr className={`border-b border-dark-border/50 hover:bg-dark-bg-secondary transition-colors ${bgColor}`}>
      {/* Nome */}
      <td className="py-3 px-3 text-dark-text">{athlete.first_name}</td>

      {/* Cognome */}
      <td className="py-3 px-3 text-dark-text font-semibold">{athlete.last_name}</td>

      {/* Sesso */}
      <td className="py-3 px-3">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          athlete.sex === 'F' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {athlete.sex}
        </span>
      </td>

      {/* Categoria Peso - Now editable */}
      <td className="py-3 px-3">
        <select
          value={athlete.weight_cat_id || ''}
          onChange={(e) => onWeightCategoryChange(athlete.form_id, parseInt(e.target.value))}
          className="bg-dark-bg-secondary border border-dark-border rounded px-2 py-1 text-sm text-dark-text hover:border-primary focus:border-primary focus:outline-none transition-colors"
        >
          {availableCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </td>

      {/* Totale Provvisorio */}
      <td className="py-3 px-3 text-primary font-bold">
        {athlete.total_kg?.toFixed(1) || '0'} kg
      </td>

      {/* Group Select */}
      <td className="py-3 px-3">
        <select
          value={athlete.group_id}
          onChange={(e) => onGroupChange(athlete.athlete_id, parseInt(e.target.value))}
          className="bg-dark-bg-secondary border border-dark-border rounded px-2 py-1 text-sm text-dark-text hover:border-primary focus:border-primary focus:outline-none transition-colors"
        >
          {flights.map(flight => (
            <optgroup key={flight.id} label={flight.name}>
              {flight.groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>
    </tr>
  );
}

export default function GroupDivisionTab({ meetId }: GroupDivisionTabProps) {
  const [flights, setFlights] = useState<DivisionFlight[]>([]);
  const [athletesWithLifts, setAthletesWithLifts] = useState<AthleteWithLifts[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [divisionExists, setDivisionExists] = useState(false);
  const [expandedFlights, setExpandedFlights] = useState<Set<number>>(new Set());
  const [isEditingFlights, setIsEditingFlights] = useState(false);
  const [editedFlights, setEditedFlights] = useState<DivisionFlight[]>([]);
  const [meetDays, setMeetDays] = useState<number>(1);
  const [originalAthleteAssignments, setOriginalAthleteAssignments] = useState<Map<number, number>>(new Map());

  // Load existing division on mount
  useEffect(() => {
    if (meetId) {
      loadMeetInfo();
      loadDivision();
      loadWeightCategories();
    }
  }, [meetId]);

  const loadWeightCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_categories_std')
        .select('id, name, sex, ord')
        .order('ord', { ascending: true });
      
      if (error) throw error;
      setWeightCategories(data || []);
    } catch (err) {
      console.error('Error loading weight categories:', err);
    }
  };

  const loadMeetInfo = async () => {
    if (!meetId) return;
    
    try {
      const { data, error } = await supabase
        .from('meets')
        .select('start_date, end_date')
        .eq('id', parseInt(meetId))
        .single();
      
      if (error) throw error;
      
      if (data) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setMeetDays(days);
      }
    } catch (err) {
      console.error('Error loading meet info:', err);
      setMeetDays(1);
    }
  };

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
        setFlights([]);
        setAthletesWithLifts([]);
      }
    } catch (err: any) {
      console.error('Error loading division:', err);
      setDivisionExists(false);
      setFlights([]);
      setAthletesWithLifts([]);
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

    if (formIds.length === 0) {
      setAthletesWithLifts([]);
      return;
    }

    // Load form_lifts for these athletes
    const { data: lifts, error: liftsError } = await supabase
      .from('form_lifts')
      .select('form_id, lift_id, declared_max_kg')
      .in('form_id', formIds);

    if (liftsError) {
      console.error('Error loading lifts:', liftsError);
      return;
    }

    // Load weight_cat_id from form_info
    const { data: formInfos, error: formInfoError } = await supabase
      .from('form_info')
      .select('id, weight_cat_id')
      .in('id', formIds);

    if (formInfoError) {
      console.error('Error loading form_info:', formInfoError);
    }

    const weightCatMap = new Map<number, number>();
    (formInfos || []).forEach(info => {
      weightCatMap.set(info.id, info.weight_cat_id);
    });

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

    // Enrich athletes with lifts and calculate total
    const enriched: AthleteWithLifts[] = [];
    flightsData.forEach(flight => {
      flight.groups.forEach(group => {
        group.athletes?.forEach(athlete => {
          const athleteLifts = liftsMap.get(athlete.form_id) || [];
          const total = athleteLifts.reduce((sum, l) => sum + Number(l.declared_max_kg), 0);
          
          enriched.push({
            ...athlete,
            flight_id: flight.id,
            flight_name: flight.name,
            group_id: group.id,
            group_name: group.name,
            lifts: athleteLifts,
            total_kg: total,
            weight_cat_id: weightCatMap.get(athlete.form_id)
          });
        });
      });
    });

    setAthletesWithLifts(enriched);
    
    // Save original assignments for change detection (form_id -> group_id)
    const originalAssignments = new Map<number, number>();
    enriched.forEach(athlete => {
      if (athlete.group_id) {
        originalAssignments.set(athlete.form_id, athlete.group_id);
      }
    });
    setOriginalAthleteAssignments(originalAssignments);
    
    // Expand all flights by default
    const flightIds = new Set(flightsData.map(f => f.id));
    setExpandedFlights(flightIds);
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

  const handleSaveAthleteAssignments = async () => {
    if (!meetId) {
      setError('Meet ID non disponibile');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Filter only athletes that have changed group (OPTIMIZED!)
      const changedAssignments = athletesWithLifts
        .filter(athlete => {
          if (!athlete.group_id) return false;
          const originalGroupId = originalAthleteAssignments.get(athlete.form_id);
          return originalGroupId !== athlete.group_id; // Only if changed
        })
        .map(athlete => ({
          form_id: athlete.form_id,
          group_id: athlete.group_id!,
          flight_id: athlete.flight_id!
        }));

      // If no changes, don't call backend
      if (changedAssignments.length === 0) {
        setSuccessMessage('Nessuna modifica da salvare');
        setIsSaving(false);
        return;
      }

      const response = await saveDivision(parseInt(meetId), { 
        assignments: changedAssignments,
        flights 
      });

      if (response.success) {
        setSuccessMessage(`Struttura salvata! ${response.updated} atleti aggiornati.`);
        
        // Update original assignments after successful save
        const newOriginalAssignments = new Map<number, number>();
        athletesWithLifts.forEach(athlete => {
          if (athlete.group_id) {
            newOriginalAssignments.set(athlete.form_id, athlete.group_id);
          }
        });
        setOriginalAthleteAssignments(newOriginalAssignments);
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

  const handleExportNomination = async () => {
    if (!meetId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch meet information
      const { data: meetData, error: meetError } = await supabase
        .from('meets')
        .select('name, start_date')
        .eq('id', meetId)
        .single();

      if (meetError || !meetData) {
        throw new Error('Errore nel caricamento dei dati della gara');
      }

      // Prepare data for PDF
      const pdfData = {
        meetName: meetData.name,
        meetDate: meetData.start_date,
        flights: flights.map(flight => ({
          ...flight,
          athletes: athletesWithLifts.filter(a => a.flight_id === flight.id)
        }))
      };

      // Generate PDF
      await generateNominationPDF(pdfData);

      setSuccessMessage('PDF generato con successo!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Errore generazione PDF:', err);
      setError(err.message || 'Errore durante la generazione del PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Move athlete to new group (local state only)
  const moveAthleteToGroup = (athleteId: number, newFlightId: number, newGroupId: number) => {
    setAthletesWithLifts(prev => 
      prev.map(athlete => 
        athlete.athlete_id === athleteId
          ? { 
              ...athlete, 
              flight_id: newFlightId, 
              group_id: newGroupId,
              flight_name: flights.find(f => f.id === newFlightId)?.name || '',
              group_name: flights.find(f => f.id === newFlightId)?.groups.find(g => g.id === newGroupId)?.name || ''
            }
          : athlete
      )
    );

    // Update flights structure
    setFlights(prev => {
      const updated = JSON.parse(JSON.stringify(prev)) as DivisionFlight[];
      
      // Remove athlete from old group
      updated.forEach(flight => {
        flight.groups.forEach(group => {
          group.athletes = group.athletes?.filter(a => a.athlete_id !== athleteId);
        });
      });

      // Add athlete to new group
      const athlete = athletesWithLifts.find(a => a.athlete_id === athleteId);
      if (athlete) {
        const targetFlight = updated.find(f => f.id === newFlightId);
        const targetGroup = targetFlight?.groups.find(g => g.id === newGroupId);
        if (targetGroup) {
          if (!targetGroup.athletes) targetGroup.athletes = [];
          targetGroup.athletes.push({
            athlete_id: athlete.athlete_id,
            form_id: athlete.form_id,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            sex: athlete.sex,
            weight_category: athlete.weight_category
          });
        }
      }

      return updated;
    });
  };

  // Handle inline select change for group
  const handleGroupChange = (athleteId: number, newGroupId: number) => {
    // Find which flight contains this group
    let targetFlightId: number | null = null;
    for (const flight of flights) {
      if (flight.groups.some(g => g.id === newGroupId)) {
        targetFlightId = flight.id;
        break;
      }
    }
    
    if (!targetFlightId) return;
    
    moveAthleteToGroup(athleteId, targetFlightId, newGroupId);
  };

  // Handle weight category change
  const handleWeightCategoryChange = async (formId: number, newWeightCatId: number) => {
    if (!meetId) return;

    try {
      // Update in database via API
      await updateWeightCategory(parseInt(meetId), formId, newWeightCatId);

      // Update local state
      const newCategory = weightCategories.find(cat => cat.id === newWeightCatId);
      setAthletesWithLifts(prev =>
        prev.map(athlete =>
          athlete.form_id === formId
            ? { ...athlete, weight_cat_id: newWeightCatId, weight_category: newCategory?.name || '' }
            : athlete
        )
      );

      // Update flights state
      setFlights(prev => {
        const updated = JSON.parse(JSON.stringify(prev)) as DivisionFlight[];
        updated.forEach(flight => {
          flight.groups.forEach(group => {
            const athlete = group.athletes?.find(a => a.form_id === formId);
            if (athlete) {
              athlete.weight_category = newCategory?.name || '';
            }
          });
        });
        return updated;
      });

      setSuccessMessage('Categoria peso modificata con successo');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      console.error('Error updating weight category:', err);
      setError('Errore durante la modifica della categoria peso');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Toggle flight expansion
  const toggleFlightExpansion = (flightId: number) => {
    setExpandedFlights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flightId)) {
        newSet.delete(flightId);
      } else {
        newSet.add(flightId);
      }
      return newSet;
    });
  };

  // Flight management functions
  const handleEditFlights = () => {
    setEditedFlights(JSON.parse(JSON.stringify(flights))); // Deep copy
    setIsEditingFlights(true);
  };

  const handleCancelEditFlights = () => {
    setIsEditingFlights(false);
    setEditedFlights([]);
  };

  const handleSaveFlights = async () => {
    if (!meetId) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Save flight structure to database
      await updateFlightsStructure(parseInt(meetId), editedFlights);
      
      // Reload division from backend to get updated IDs and structure
      const response = await getDivision(parseInt(meetId));
      
      if (response.success && response.flights) {
        setFlights(response.flights);
        
        // Reload athletes with new structure
        await loadAthletesWithLifts(response.flights);
        
        setSuccessMessage('Struttura flight aggiornata con successo!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      
      setIsEditingFlights(false);
      setEditedFlights([]);
    } catch (err: any) {
      console.error('Error saving flights:', err);
      setError(err.response?.data?.error || 'Errore nel salvataggio della struttura flight');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFlight = () => {
    const maxId = Math.max(0, ...editedFlights.map(f => f.id));
    const newFlightId = maxId + 1;
    
    // Calculate next progressive group number across all flights
    let maxGroupNumber = 0;
    editedFlights.forEach(flight => {
      flight.groups.forEach(group => {
        const groupNum = parseInt(group.name.replace(/\D/g, '')) || 0;
        if (groupNum > maxGroupNumber) maxGroupNumber = groupNum;
      });
    });
    
    const newFlight: DivisionFlight = {
      id: newFlightId,
      meet_id: parseInt(meetId!),
      name: `Flight ${String.fromCharCode(65 + editedFlights.length)}`,
      day_number: 1,
      start_time: '09:00',
      groups: [
        {
          id: Date.now(),
          flight_id: newFlightId,
          name: `Gruppo ${maxGroupNumber + 1}`,
          ord: maxGroupNumber + 1,
          athletes: []
        }
      ]
    };
    
    setEditedFlights([...editedFlights, newFlight]);
  };

  const handleRemoveFlight = (flightId: number) => {
    setEditedFlights(editedFlights.filter(f => f.id !== flightId));
  };

  const handleUpdateFlight = (flightId: number, field: string, value: any) => {
    setEditedFlights(editedFlights.map(f => {
      if (f.id === flightId) {
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const handleAddGroup = (flightId: number) => {
    // Calculate next progressive group number across all flights
    let maxGroupNumber = 0;
    editedFlights.forEach(flight => {
      flight.groups.forEach(group => {
        const groupNum = parseInt(group.name.replace(/\D/g, '')) || 0;
        if (groupNum > maxGroupNumber) maxGroupNumber = groupNum;
      });
    });

    setEditedFlights(editedFlights.map(f => {
      if (f.id === flightId) {
        const newGroup = {
          id: Date.now(),
          flight_id: flightId,
          name: `Gruppo ${maxGroupNumber + 1}`,
          ord: maxGroupNumber + 1,
          athletes: []
        };
        return { ...f, groups: [...f.groups, newGroup] };
      }
      return f;
    }));
  };

  const handleRemoveGroup = (flightId: number, groupId: number) => {
    setEditedFlights(editedFlights.map(f => {
      if (f.id === flightId) {
        // Find the group to remove and its athletes
        const groupToRemove = f.groups.find(g => g.id === groupId);
        const athletesToRedistribute = groupToRemove?.athletes || [];
        
        // Remove the group
        const remainingGroups = f.groups.filter(g => g.id !== groupId);
        
        // If there are athletes to redistribute and remaining groups
        if (athletesToRedistribute.length > 0 && remainingGroups.length > 0) {
          // Add athletes to the first remaining group
          const firstGroup = remainingGroups[0];
          remainingGroups[0] = {
            ...firstGroup,
            athletes: [...firstGroup.athletes, ...athletesToRedistribute]
          };
        }
        
        return { ...f, groups: remainingGroups };
      }
      return f;
    }));

    // Update athletesWithLifts to reflect the new group assignment
    if (athletesWithLifts.length > 0) {
      const flight = editedFlights.find(f => f.id === flightId);
      const groupToRemove = flight?.groups.find(g => g.id === groupId);
      
      if (groupToRemove && groupToRemove.athletes.length > 0) {
        const remainingGroups = flight!.groups.filter(g => g.id !== groupId);
        
        if (remainingGroups.length > 0) {
          const targetGroupId = remainingGroups[0].id;
          
          setAthletesWithLifts(athletesWithLifts.map(athlete => {
            if (athlete.group_id === groupId) {
              return { ...athlete, group_id: targetGroupId };
            }
            return athlete;
          }));
        }
      }
    }
  };

  const handleUpdateGroupName = (flightId: number, groupId: number, newName: string) => {
    setEditedFlights(editedFlights.map(f => {
      if (f.id === flightId) {
        return {
          ...f,
          groups: f.groups.map(g => g.id === groupId ? { ...g, name: newName } : g)
        };
      }
      return f;
    }));
  };

  const handleMoveGroup = (groupId: number, fromFlightId: number, toFlightId: number) => {
    if (fromFlightId === toFlightId) return;

    let groupToMove: any = null;

    // Remove group from source flight
    const updatedFlights = editedFlights.map(f => {
      if (f.id === fromFlightId) {
        groupToMove = f.groups.find(g => g.id === groupId);
        return { ...f, groups: f.groups.filter(g => g.id !== groupId) };
      }
      return f;
    });

    // Add group to destination flight
    if (groupToMove) {
      setEditedFlights(updatedFlights.map(f => {
        if (f.id === toFlightId) {
          return { ...f, groups: [...f.groups, { ...groupToMove, flight_id: toFlightId }] };
        }
        return f;
      }));
    }
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
              onClick={handleSaveAthleteAssignments}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Save className="w-6 h-6" />
              {isSaving ? '⏳ SALVATAGGIO IN CORSO...' : '💾 SALVA STRUTTURA'}
            </button>
          )}

          {/* Print Nomination Button */}
          {divisionExists && (
            <button
              onClick={handleExportNomination}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              🖨️ STAMPA NOMINATION
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

      {/* Athletes Division Display */}
      {divisionExists && athletesWithLifts.length > 0 && (
        <div className="space-y-4">
            {/* Summary Bar */}
            <div className="card p-4 bg-dark-bg-secondary">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-dark-text-secondary">Flight totali:</span>
                    <span className="text-dark-text font-bold text-lg">{flights.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-dark-text-secondary">Gruppi totali:</span>
                    <span className="text-dark-text font-bold text-lg">
                      {flights.reduce((sum, f) => sum + f.groups.length, 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-dark-text-secondary">Atleti totali:</span>
                    <span className="text-primary font-bold text-lg">{athletesWithLifts.length}</span>
                  </div>
                </div>
                <button
                  onClick={handleEditFlights}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  ⚙️ Gestisci Flight
                </button>
              </div>
            </div>

            {/* Flight Management Modal */}
            {isEditingFlights && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-dark-bg-secondary rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-dark-bg-secondary border-b border-dark-border px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-dark-text">Gestione Flight</h3>
                    <button
                      onClick={handleCancelEditFlights}
                      className="text-dark-text-secondary hover:text-dark-text transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Flight List */}
                  <div className="p-6 space-y-4">
                    {editedFlights.map((flight, index) => (
                      <div key={flight.id} className="card p-4 bg-dark-bg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-dark-text">Flight {index + 1}</h4>
                          {editedFlights.length > 1 && (
                            <button
                              onClick={() => handleRemoveFlight(flight.id)}
                              className="text-red-500 hover:text-red-400 text-sm"
                            >
                              🗑️ Elimina
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Nome */}
                          <div>
                            <label className="block text-sm text-dark-text-secondary mb-1">Nome Flight</label>
                            <input
                              type="text"
                              value={flight.name}
                              onChange={(e) => handleUpdateFlight(flight.id, 'name', e.target.value)}
                              className="w-full bg-dark-bg-secondary border border-dark-border rounded px-3 py-2 text-dark-text focus:border-primary focus:outline-none"
                              placeholder="es. Flight A"
                            />
                          </div>

                          {/* Giorno */}
                          <div>
                            <label className="block text-sm text-dark-text-secondary mb-1">Giorno</label>
                            <select
                              value={flight.day_number}
                              onChange={(e) => handleUpdateFlight(flight.id, 'day_number', parseInt(e.target.value))}
                              className="w-full bg-dark-bg-secondary border border-dark-border rounded px-3 py-2 text-dark-text focus:border-primary focus:outline-none"
                            >
                              {Array.from({ length: meetDays }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Giorno {i + 1}</option>
                              ))}
                            </select>
                          </div>

                          {/* Orario */}
                          <div>
                            <label className="block text-sm text-dark-text-secondary mb-1">Orario Inizio</label>
                            <input
                              type="time"
                              value={flight.start_time || '09:00'}
                              onChange={(e) => handleUpdateFlight(flight.id, 'start_time', e.target.value)}
                              className="w-full bg-dark-bg-secondary border border-dark-border rounded px-3 py-2 text-dark-text focus:border-primary focus:outline-none"
                            />
                          </div>

                          {/* Info Atleti */}
                          <div className="flex items-center">
                            <span className="text-sm text-dark-text-secondary">
                              👥 {flight.groups.reduce((sum, g) => sum + g.athletes.length, 0)} atleti in {flight.groups.length} gruppi
                            </span>
                          </div>
                        </div>

                        {/* Groups Management */}
                        <div className="mt-4 pt-4 border-t border-dark-border space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-semibold text-dark-text-secondary">Gruppi</h5>
                            <button
                              onClick={() => handleAddGroup(flight.id)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              + Aggiungi Gruppo
                            </button>
                          </div>

                          {flight.groups.map((group, gIndex) => (
                            <div key={group.id} className="flex items-center gap-2 bg-dark-bg-secondary/50 rounded p-2">
                              <span className="text-xs text-dark-text-secondary w-6">{gIndex + 1}.</span>
                              
                              {/* Group Name */}
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) => handleUpdateGroupName(flight.id, group.id, e.target.value)}
                                className="flex-1 bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm text-dark-text focus:border-primary focus:outline-none"
                                placeholder="Nome gruppo"
                              />

                              {/* Move to Flight */}
                              <select
                                value={flight.id}
                                onChange={(e) => handleMoveGroup(group.id, flight.id, parseInt(e.target.value))}
                                className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-dark-text focus:border-primary focus:outline-none"
                              >
                                {editedFlights.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>

                              {/* Athletes Count */}
                              <span className="text-xs text-dark-text-secondary whitespace-nowrap">
                                {group.athletes.length} 👤
                              </span>

                              {/* Delete Group */}
                              {flight.groups.length > 1 && (
                                <button
                                  onClick={() => handleRemoveGroup(flight.id, group.id)}
                                  className="text-red-500 hover:text-red-400 text-xs"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Add Flight Button */}
                    <button
                      onClick={handleAddFlight}
                      className="w-full border-2 border-dashed border-dark-border hover:border-primary rounded-lg py-4 text-dark-text-secondary hover:text-primary transition-colors"
                    >
                      + Aggiungi Flight
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-dark-bg-secondary border-t border-dark-border px-6 py-4 flex gap-3 justify-end">
                    <button
                      onClick={handleCancelEditFlights}
                      className="btn-secondary"
                      disabled={isSaving}
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSaveFlights}
                      className="btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? '⏳ Salvataggio...' : '💾 Salva Modifiche'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Flights with Groups */}
            {flights.map(flight => (
              <div key={flight.id} className="card overflow-hidden">
                {/* Flight Header */}
                <div 
                  className="bg-primary/10 border-b border-primary/30 px-6 py-4 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => toggleFlightExpansion(flight.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold text-primary">{flight.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-dark-text-secondary">
                        <span>📅 Giorno {flight.day_number}</span>
                        <span>🕐 {flight.start_time}</span>
                        <span>👥 {flight.groups.reduce((sum, g) => sum + (g.athletes?.length || 0), 0)} atleti</span>
                      </div>
                    </div>
                    <button className="text-dark-text-secondary hover:text-dark-text">
                      {expandedFlights.has(flight.id) ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Groups (collapsible) */}
                {expandedFlights.has(flight.id) && (
                  <div className="p-6 space-y-6">
                    {flight.groups.map(group => {
                      const groupAthletes = athletesWithLifts.filter(
                        a => a.flight_id === flight.id && a.group_id === group.id
                      );

                      return (
                        <div key={group.id} className="border border-dark-border rounded-lg overflow-hidden">
                          {/* Group Header */}
                          <div className="bg-dark-bg-secondary px-4 py-3 border-b border-dark-border">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-dark-text">{group.name}</h4>
                              <span className="text-sm text-dark-text-secondary">
                                {groupAthletes.length} atleti
                              </span>
                            </div>
                          </div>

                          {/* Athletes Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-dark-bg-secondary/50">
                                <tr>
                                  <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Nome</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Cognome</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Sesso</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Categoria Peso</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Totale Provv.</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text-secondary uppercase">Gruppo</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupAthletes.map((athlete, index) => (
                                    <AthleteRow
                                      key={athlete.athlete_id}
                                      athlete={athlete}
                                      index={index}
                                      flights={flights}
                                      weightCategories={weightCategories}
                                      onGroupChange={handleGroupChange}
                                      onWeightCategoryChange={handleWeightCategoryChange}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
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
