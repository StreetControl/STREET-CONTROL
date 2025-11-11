/**
 * REGISTRATION TAB - Athlete Import via CSV
 * Import and manage athletes for a meet
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetAthletes, bulkImportAthletes, deleteAthleteFromMeet } from '../../services/api';
import { supabase } from '../../services/supabase';

interface AthleteRow {
  id: number;
  cf: string;
  first_name: string;
  last_name: string;
  sex: 'M' | 'F';
  birth_date: string;
}

interface RegistrationTabProps {
  meetId?: string;
}

export default function RegistrationTab({ meetId }: RegistrationTabProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [meetTypeLifts, setMeetTypeLifts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (meetId) {
      loadAthletes();
      loadMeetTypeLifts();
    }
  }, [meetId]);

  const loadAthletes = async () => {
    if (!meetId) return;
    
    setIsLoading(true);
    try {
      const response = await getMeetAthletes(parseInt(meetId));
      if (response.success && response.athletes) {
        const athletesData = response.athletes.map((item: any) => ({
          id: item.athletes.id,
          cf: item.athletes.cf,
          first_name: item.athletes.first_name,
          last_name: item.athletes.last_name,
          sex: item.athletes.sex,
          birth_date: item.athletes.birth_date
        }));
        setAthletes(athletesData);
      }
    } catch (err: any) {
      setError('Errore nel caricamento degli atleti');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetTypeLifts = async () => {
    if (!meetId) return;

    try {
      // Get meet info to find meet_type_id
      const { data: meet, error: meetError } = await supabase
        .from('meets')
        .select('meet_type_id')
        .eq('id', parseInt(meetId))
        .single();

      if (meetError || !meet) {
        console.error('Error loading meet type:', meetError);
        return;
      }

      // Get lifts for this meet type
      const { data: lifts, error: liftsError } = await supabase
        .from('meet_type_lifts')
        .select('lift_id')
        .eq('meet_type_id', meet.meet_type_id)
        .order('sequence');

      if (liftsError) {
        console.error('Error loading lifts:', liftsError);
        return;
      }

      const liftIds = lifts?.map((l: { lift_id: string }) => l.lift_id) || [];
      setMeetTypeLifts(liftIds);
    } catch (err) {
      console.error('Error loading meet type lifts:', err);
    }
  };

  const downloadTemplate = () => {
    // ORDINE FISSO E CONSISTENTE: MU, PU, DIP, SQ, MP
    const LIFT_ORDER = ['MU', 'PU', 'DIP', 'SQ', 'MP'];
    const LIFT_MAP: Record<string, string> = {
      'MU': 'max_mu',
      'PU': 'max_pu',
      'DIP': 'max_dip',
      'SQ': 'max_sq',
      'MP': 'max_mp'
    };

    // Filtra solo le alzate presenti in questa gara, mantenendo l'ordine fisso
    const liftColumns = LIFT_ORDER
      .filter(liftId => meetTypeLifts.includes(liftId))
      .map(liftId => LIFT_MAP[liftId]);

    // Base columns
    const baseColumns = 'first_name,last_name,birth_date,weight_category,sex,cf,team';
    
    // Full header with dynamic lift columns IN FIXED ORDER
    const header = `${baseColumns},${liftColumns.join(',')}`;
    
    // Build example rows with correct number of commas
    const exampleRow1Values = ['Mario', 'Rossi', '1995-06-15', '-80M', 'M', 'RSSMRA95H15H501Z', 'IronChurch'];
    const exampleRow2Values = ['Giulia', 'Bianchi', '1998-03-22', '-63F', 'F', 'BNCGLI98C62H501Y', 'CaliFlorence'];
    
    // Add example weights IN THE SAME ORDER as columns
    const exampleWeights: Record<string, number> = {
      'max_mu': 15,
      'max_pu': 60,
      'max_dip': 90,
      'max_sq': 160,
      'max_mp': 50
    };

    liftColumns.forEach(colName => {
      exampleRow1Values.push(exampleWeights[colName]?.toString() || '0');
      exampleRow2Values.push((exampleWeights[colName] ? exampleWeights[colName] - 5 : 0).toString());
    });

    const liftNamesForComment = LIFT_ORDER.filter(l => meetTypeLifts.includes(l)).join(', ');
    
    const csvContent = `${header}
# Campi richiesti: first_name, last_name, birth_date, sex, cf
# Campi opzionali: weight_category, team, ${liftColumns.join(', ')}
# Alzate per questa gara: ${liftNamesForComment}
# Formato data: YYYY-MM-DD
# Formato categoria peso: es. '-59M', '-66M', '-73M', '-80M', '+101M' (uomini); '-52F', '-57F', '-63F', '+70F' (donne)
# Sesso: M o F
# Esempi:
${exampleRow1Values.join(',')}
${exampleRow2Values.join(',')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_atleti.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!meetId) {
      setError('Devi prima creare la gara nel tab INFO');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      
      if (lines.length < 2) {
        throw new Error('File CSV vuoto o senza dati');
      }

      // Parse header to get column order
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim());
      
      const dataLines = lines.slice(1);
      
      const parsedAthletes = dataLines.map((line, index) => {
        try {
          const parts = line.split(',').map(s => s.trim());
          
          // Create object mapping header → value
          const rowData: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowData[header] = parts[idx] || '';
          });

          // Extract values using header names (case-insensitive)
          const getVal = (key: string) => rowData[key] || rowData[key.toLowerCase()] || '';

          const athlete = { 
            cf: getVal('cf'),
            firstName: getVal('first_name'),
            lastName: getVal('last_name'),
            sex: getVal('sex') as 'M' | 'F',
            birthDate: getVal('birth_date'),
            weightCategory: getVal('weight_category') || undefined,
            team: getVal('team') || undefined,
            // Parse lift maxes from correct columns
            maxMu: getVal('max_mu') ? parseFloat(getVal('max_mu')) : undefined,
            maxPu: getVal('max_pu') ? parseFloat(getVal('max_pu')) : undefined,
            maxDip: getVal('max_dip') ? parseFloat(getVal('max_dip')) : undefined,
            maxSq: getVal('max_sq') ? parseFloat(getVal('max_sq')) : undefined,
            maxMp: getVal('max_mp') ? parseFloat(getVal('max_mp')) : undefined
          };

          // Validation
          if (!athlete.cf || !athlete.firstName || !athlete.lastName || !athlete.sex || !athlete.birthDate) {
            throw new Error(`Riga ${index + 2}: campi obbligatori mancanti (cf, nome, cognome, sesso, data nascita)`);
          }

          return athlete;
        } catch (rowError: any) {
          console.error(`Error parsing row ${index + 2}:`, line);
          throw new Error(`Errore alla riga ${index + 2}: ${rowError.message}`);
        }
      });

      const response = await bulkImportAthletes(parseInt(meetId), {
        athletes: parsedAthletes
      });

      if (response.success) {
        const { results } = response;
        if (results && results.failed > 0) {
          // Partial success
          setSuccessMessage(`Import completato: ${results.success} atleti importati, ${results.failed} falliti`);
          setError(`Errori: ${results.errors.slice(0, 5).join('; ')}${results.errors.length > 5 ? '...' : ''}`);
        } else {
          setSuccessMessage(response.message || 'Import completato con successo');
        }
        await loadAthletes();
      } else {
        setError(response.message || 'Errore durante l\'import');
      }

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Errore durante la lettura del file CSV');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAthlete = async (cf: string) => {
    if (!meetId) return;
    if (!confirm('Sei sicuro di voler eliminare questo atleta dalla gara?')) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const athlete = athletes.find(a => a.cf === cf);
      if (!athlete) {
        setError('Atleta non trovato');
        return;
      }

      // Chiama API per eliminare da form_info e form_lifts (ma NON da athletes)
      const response = await deleteAthleteFromMeet(parseInt(meetId), athlete.id);
      
      if (response.success) {
        // Rimuovi dallo state locale
        setAthletes(prev => prev.filter(a => a.cf !== cf));
        setSuccessMessage('Atleta rimosso dalla gara con successo');
      } else {
        setError('Errore durante l\'eliminazione');
      }
    } catch (err: any) {
      console.error('Error deleting athlete:', err);
      setError(err.message || 'Errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-8">
      {/* Header with AVANTI button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-dark-text">
          Importa Atleti
        </h2>
        <button
          onClick={() => navigate('/meets')}
          className="btn-primary px-6"
        >
          AVANTI
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Loading Overlay with Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-dark-bg-secondary border-2 border-primary rounded-lg p-8 flex flex-col items-center gap-4">
            {/* Spinning Loader */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
            </div>
            
            {/* Loading Text */}
            <div className="text-center">
              <p className="text-lg font-semibold text-dark-text mb-1">
                Importazione in corso...
              </p>
              <p className="text-sm text-dark-text-secondary">
                Attendere, potrebbe volerci qualche minuto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Download Template */}
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 bg-dark-bg-secondary border-2 border-dark-border hover:border-primary rounded-lg p-6 transition-colors"
        >
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-lg font-semibold text-dark-text">
            Scarica Template
          </span>
        </button>

        {/* Upload CSV */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || !meetId}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg p-6 transition-colors"
        >
          {isLoading ? (
            <>
              {/* Small spinner in button */}
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-lg font-semibold text-white">
                Caricamento...
              </span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-lg font-semibold text-white">
                Importa dati atleti CSV
              </span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Athletes List */}
      {athletes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-dark-text mb-4">
            LISTA ATLETI REGISTRATI:
          </h3>
          
          <div className="bg-dark-bg-secondary border border-dark-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-bg border-b border-dark-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Codice Fiscale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Cognome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Sesso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Data Nascita
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {athletes.map((athlete, index) => (
                  <tr key={index} className="hover:bg-dark-bg/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-dark-text font-mono">
                      {athlete.cf}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text">
                      {athlete.first_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text">
                      {athlete.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text">
                      {athlete.sex}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text">
                      {new Date(athlete.birth_date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteAthlete(athlete.cf)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-dark-text-secondary">
            Totale atleti registrati: <span className="font-semibold text-primary">{athletes.length}</span>
          </p>
        </div>
      )}

      {/* No athletes message */}
      {!isLoading && athletes.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-dark-text">
            Nessun atleta registrato
          </h3>
          <p className="mt-1 text-sm text-dark-text-secondary">
            Carica un file CSV per importare gli atleti
          </p>
        </div>
      )}
    </div>
  );
}
