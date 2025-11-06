/**
 * REGISTRATION TAB - Athlete Import via CSV
 * Import and manage athletes for a meet
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetAthletes, bulkImportAthletes } from '../../services/api';

interface AthleteRow {
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (meetId) {
      loadAthletes();
    }
  }, [meetId]);

  const loadAthletes = async () => {
    if (!meetId) return;
    
    setIsLoading(true);
    try {
      const response = await getMeetAthletes(parseInt(meetId));
      if (response.success && response.athletes) {
        const athletesData = response.athletes.map((item: any) => ({
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

  const downloadTemplate = () => {
    const csvContent = `first_name,last_name,birth_date,weight_category,sex,cf,team,max_sq,max_pu,max_dip,max_mp,max_mu
# Note: The 'max_*' columns (max_sq, max_pu, max_dip, max_mp, max_mu) should be dynamically selected based on the meet type:
# - STREET_4: requires max_mu, max_pu, max_dip, max_sq (4 lifts)
# - STREET_3: requires max_pu, max_dip, max_sq (3 lifts)
# - PUSH_PULL: requires max_pu, max_dip (2 lifts)
# - S_PU (Single Lift Pull-Up): requires only max_pu
# - S_DIP (Single Lift Dip): requires only max_dip
# - S_MU (Single Lift Muscle-Up): requires only max_mu
# - S_SQ (Single Lift Squat): requires only max_sq
# - S_MP (Single Lift Military-Press): requires only max_mp
# Only fill in the max_* columns that are relevant for your specific meet type. Leave unused columns empty.
# Date format: YYYY-MM-DD
# Weight category format: (e.g., '-59M', '-66M', '-73M', '-80M', '-87M', '-94M', '-101M', '+101M' for men; '-52F', '-57F', '-63F', '-70F', '+70F' for women)
# Sex: M or F
# Example rows:
Mario,Rossi,1995-06-15,-80M,M,RSSMRA95H15H501Z,Team Alpha,120.5,15,25,,
Giulia,Bianchi,1998-03-22,-63F,F,BNCGLI98C62H501Y,Team Beta,80.0,10,18,,`;

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
      
      const dataLines = lines.slice(1);
      
      const parsedAthletes = dataLines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const [firstName, lastName, birthDate, weightCategory, sex, cf, team, maxSq, maxPu, maxDip, maxMp, maxMu] = parts;
        
        return { 
          cf, 
          firstName, 
          lastName, 
          sex: sex as 'M' | 'F', 
          birthDate,
          weightCategory: weightCategory || undefined,
          team: team || undefined,
          maxSq: maxSq ? parseFloat(maxSq) : undefined,
          maxPu: maxPu ? parseFloat(maxPu) : undefined,
          maxDip: maxDip ? parseFloat(maxDip) : undefined,
          maxMp: maxMp ? parseFloat(maxMp) : undefined,
          maxMu: maxMu ? parseFloat(maxMu) : undefined
        };
      });

      const response = await bulkImportAthletes(parseInt(meetId), {
        athletes: parsedAthletes
      });

      if (response.success) {
        setSuccessMessage(response.message || 'Import completato con successo');
        await loadAthletes();
      } else {
        setError(response.message || 'Errore durante l\'import');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la lettura del file CSV');
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

    try {
      const athlete = athletes.find(a => a.cf === cf);
      if (!athlete) return;

      setAthletes(prev => prev.filter(a => a.cf !== cf));
      setSuccessMessage('Atleta rimosso');
    } catch (err: any) {
      setError('Errore durante l\'eliminazione');
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
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-lg font-semibold text-white">
            {isLoading ? 'Caricamento...' : 'Importa dati atleti CSV'}
          </span>
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
