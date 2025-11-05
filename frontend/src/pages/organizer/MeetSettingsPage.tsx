/**
 * PAGINA 4: IMPOSTAZIONI GARA
 * 
 * Pagina per configurare una nuova gara con 4 tab:
 * - 4.1: Info (informazioni generali)
 * - 4.2: Inscription (import atleti CSV)
 * - 4.3: Divisione Gruppi
 * - 4.4: Pre-Gara
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMeet, getMeetAthletes, bulkImportAthletes } from '../../services/api';
import { supabase } from '../../services/supabase';
import type { CreateMeetRequest } from '../../types';

interface MeetType {
  id: string;
  name: string;
}

type TabType = 'info' | 'inscription' | 'divisione-gruppi' | 'pre-gara';

export default function MeetSettingsPage() {
  const navigate = useNavigate();
  const { meetId } = useParams<{ meetId: string }>();
  
  // Se meetId esiste (gara esistente) → parti da INSCRIPTION
  // Se meetId NON esiste (nuova gara) → parti da INFO
  const initialTab: TabType = meetId ? 'inscription' : 'info';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [createdMeetId, setCreatedMeetId] = useState<string | undefined>(meetId);
  const [meetName, setMeetName] = useState<string>('');

  // Load meet name if editing existing meet or after creation
  useEffect(() => {
    const currentMeetId = createdMeetId || meetId;
    if (currentMeetId) {
      loadMeetName(currentMeetId);
    }
  }, [meetId, createdMeetId]);

  const loadMeetName = async (idToLoad: string) => {
    if (!idToLoad) return;
    try {
      const meetIdNum = parseInt(idToLoad);
      if (isNaN(meetIdNum)) return;

      const { data, error } = await supabase
        .from('meets')
        .select('name')
        .eq('id', meetIdNum)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading meet name:', error);
        return;
      }

      if (data) {
        setMeetName(data.name);
      }
    } catch (err) {
      console.error('Error loading meet name:', err);
    }
  };

  // Callback quando la gara viene creata nel tab Info
  const handleMeetCreated = (newMeetId: number) => {
    setCreatedMeetId(newMeetId.toString());
    // Redirect to edit mode
    navigate(`/meets/${newMeetId}/settings`, { replace: true });
    // Passa al tab Inscription
    setActiveTab('inscription');
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-bg-secondary border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-text">
                {meetId ? 'CONFIGURAZIONE GARA' : 'NUOVA GARA'}
              </h1>
              {meetName && (
                <p className="text-sm text-primary mt-1">{meetName}</p>
              )}
            </div>
            <button
              onClick={() => navigate('/meets')}
              className="btn-secondary"
            >
              ← Torna alla lista
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-dark-border">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
            >
              INFO
            </TabButton>
            <TabButton
              active={activeTab === 'inscription'}
              onClick={() => setActiveTab('inscription')}
            >
              INSCRIPTION
            </TabButton>
            <TabButton
              active={activeTab === 'divisione-gruppi'}
              onClick={() => setActiveTab('divisione-gruppi')}
            >
              DIVISIONE GRUPPI
            </TabButton>
            <TabButton
              active={activeTab === 'pre-gara'}
              onClick={() => setActiveTab('pre-gara')}
            >
              PRE-GARA
            </TabButton>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'info' && <InfoTab onMeetCreated={handleMeetCreated} existingMeetId={createdMeetId} />}
        {activeTab === 'inscription' && <InscriptionTab meetId={createdMeetId} />}
        {activeTab === 'divisione-gruppi' && <DivisioneGruppiTab />}
        {activeTab === 'pre-gara' && <PreGaraTab />}
      </div>
    </div>
  );
}

// ============================================
// TAB BUTTON COMPONENT
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider
        transition-colors duration-200
        ${
          active
            ? 'border-primary text-primary'
            : 'border-transparent text-dark-text-secondary hover:text-dark-text hover:border-dark-border'
        }
      `}
    >
      {children}
    </button>
  );
}

// ============================================
// TAB 4.1: INFO
// ============================================

interface InfoTabProps {
  onMeetCreated?: (meetId: number) => void;
  existingMeetId?: string;
}

function InfoTab({ onMeetCreated, existingMeetId }: InfoTabProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    competition_name: '',
    competition_type: '',
    level: '',
    start_date: '',
    regulation_code: ''
  });

  const [meetTypes, setMeetTypes] = useState<MeetType[]>([]);
  const [loadingMeetTypes, setLoadingMeetTypes] = useState(true);
  const [loadingMeet, setLoadingMeet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica meet types dal DB
  useEffect(() => {
    const fetchMeetTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('meet_types')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setMeetTypes(data || []);
      } catch (err) {
        setError('Errore nel caricamento dei tipi di gara');
      } finally {
        setLoadingMeetTypes(false);
      }
    };

    fetchMeetTypes();
  }, []);

  // Carica dati gara esistente se in edit mode
  useEffect(() => {
    console.log('InfoTab: existingMeetId changed to:', existingMeetId);
    if (existingMeetId) {
      loadExistingMeet();
    }
  }, [existingMeetId]);

  const loadExistingMeet = async () => {
    if (!existingMeetId) return;

    console.log('Loading meet with ID:', existingMeetId);
    setLoadingMeet(true);
    setError(null); // Reset error
    
    try {
      // Converti meetId a numero
      const meetIdNum = parseInt(existingMeetId);
      
      if (isNaN(meetIdNum)) {
        throw new Error('ID gara non valido');
      }

      console.log('Querying Supabase for meet ID:', meetIdNum);
      const { data, error } = await supabase
        .from('meets')
        .select('id, name, meet_type_id, level, start_date, regulation_code')
        .eq('id', meetIdNum)
        .maybeSingle(); // Usa maybeSingle invece di single

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error loading meet:', error);
        throw new Error(error.message);
      }

      if (data) {
        console.log('Meet data loaded successfully:', data);
        setFormData({
          competition_name: data.name,
          competition_type: data.meet_type_id,
          level: data.level,
          start_date: data.start_date,
          regulation_code: data.regulation_code
        });
      } else {
        console.warn('Meet not found with ID:', meetIdNum);
        // Non mostrare errore, semplicemente non popolare il form
      }
    } catch (err: any) {
      console.error('Error loading meet:', err);
      // Mostra errore solo per errori critici, non per "not found"
      const errorMsg = err.message || 'Errore sconosciuto';
      if (!errorMsg.includes('No rows found') && !errorMsg.includes('JSON object')) {
        setError('Errore nel caricamento dei dati della gara: ' + errorMsg);
      }
    } finally {
      setLoadingMeet(false);
    }
  };

  // Handler per cambiamenti nei form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler per submit del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validazione
      if (!formData.competition_name || !formData.competition_type || 
          !formData.level || !formData.start_date || !formData.regulation_code) {
        throw new Error('Tutti i campi sono obbligatori');
      }

      // Prepare API request
      const meetRequest: CreateMeetRequest = {
        name: formData.competition_name,
        meet_type_id: formData.competition_type,
        start_date: formData.start_date,
        level: formData.level as 'REGIONALE' | 'NAZIONALE',
        regulation_code: formData.regulation_code
      };

      // Call API
      const response = await createMeet(meetRequest);

      if (response.success && response.meet) {
        // Success - call callback to move to next tab
        if (onMeetCreated) {
          onMeetCreated(response.meet.id);
        } else {
          // Fallback: redirect to meets list
          navigate('/meets');
        }
      } else {
        throw new Error(response.message || 'Errore durante la creazione della gara');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Errore durante la creazione della gara');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching existing meet data
  if (loadingMeet) {
    return (
      <div className="card p-8">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-dark-text-secondary">Caricamento dati gara...</p>
          </div>
        </div>
      </div>
    );
  }

  // Se la gara esiste già, il form è read-only
  const isReadOnly = !!existingMeetId;

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        {existingMeetId ? 'Informazioni Gara' : 'Informazioni Generali'}
      </h2>

      {existingMeetId && (
        <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            ℹ️ Le informazioni della gara non possono essere modificate dopo la creazione.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Competition Name */}
        <div>
          <label htmlFor="competition_name" className="label">
            Nome Competizione
          </label>
          <input
            type="text"
            id="competition_name"
            name="competition_name"
            value={formData.competition_name}
            onChange={handleChange}
            className="input-field"
            placeholder="Es: Campionato Regionale Lazio 2025"
            required
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>

        {/* Competition Type */}
        <div>
          <label htmlFor="competition_type" className="label">
            Tipo Competizione
          </label>
          <select
            id="competition_type"
            name="competition_type"
            value={formData.competition_type}
            onChange={handleChange}
            className="input-field"
            required
            disabled={loadingMeetTypes || isReadOnly}
          >
            <option value="">
              {loadingMeetTypes ? 'Caricamento...' : 'Seleziona tipo...'}
            </option>
            {meetTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level */}
        <div>
          <label htmlFor="level" className="label">
            Livello
          </label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="input-field"
            required
            disabled={isReadOnly}
          >
            <option value="">Seleziona livello...</option>
            <option value="REGIONALE">Regionale</option>
            <option value="NAZIONALE">Nazionale</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="start_date" className="label">
            Data Inizio
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="input-field"
            required
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>

        {/* Regulation Code */}
        <div>
          <label htmlFor="regulation_code" className="label">
            Codice Regolamento
          </label>
          <select
            id="regulation_code"
            name="regulation_code"
            value={formData.regulation_code}
            onChange={handleChange}
            className="input-field"
            required
            disabled={isReadOnly}
          >
            <option value="">Seleziona regolamento...</option>
            <option value="REGOLAMENTO_ITALIANO">Regolamento Italiano</option>
            <option value="REGOLAMENTO_FINAL_REP">Regolamento Final Rep</option>
          </select>
        </div>

        {/* Submit Buttons - Solo per nuove gare */}
        {!existingMeetId && (
          <div className="flex justify-between items-center pt-6 border-t border-dark-border">
            <button
              type="button"
              onClick={() => navigate('/meets')}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || loadingMeetTypes}
              className="btn-primary px-8"
            >
              {isSubmitting ? 'Creazione in corso...' : 'CREA E CONTINUA →'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ============================================
// TAB 4.2: INSCRIPTION (Import Atleti CSV)
// ============================================

interface AthleteRow {
  cf: string;
  first_name: string;
  last_name: string;
  sex: 'M' | 'F';
  birth_date: string;
}

interface InscriptionTabProps {
  meetId?: string;
}

function InscriptionTab({ meetId }: InscriptionTabProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carica atleti esistenti se siamo in modalità edit
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
        // Transform data structure
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

  // Download CSV Template
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

  // Handle CSV File Upload
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
      
      // Skip header
      const dataLines = lines.slice(1);
      
      const parsedAthletes = dataLines.map(line => {
        // CSV format: first_name,last_name,birth_date,weight_category,sex,cf,team,max_sq,max_pu,max_dip,max_mp,max_mu
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

      // Call API
      const response = await bulkImportAthletes(parseInt(meetId), {
        athletes: parsedAthletes
      });

      if (response.success) {
        setSuccessMessage(response.message || 'Import completato con successo');
        
        // Reload athletes
        await loadAthletes();
      } else {
        setError(response.message || 'Errore durante l\'import');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la lettura del file CSV');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAthlete = async (cf: string) => {
    if (!meetId) return;
    if (!confirm('Sei sicuro di voler eliminare questo atleta dalla gara?')) return;

    try {
      // Find athlete id from athletes list
      const athlete = athletes.find(a => a.cf === cf);
      if (!athlete) return;

      // For now, just remove from local state
      // In production, call deleteAthleteFromMeet API
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
          Inscription - Import Atleti
        </h2>
        <button
          onClick={() => navigate('/meets')}
          className="btn-primary px-6"
        >
          AVANTI →
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

// ============================================
// TAB 4.3: DIVISIONE GRUPPI (TODO)
// ============================================

function DivisioneGruppiTab() {
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        Divisione Gruppi
      </h2>
      <p className="text-dark-text-secondary">
        Contenuto tab Divisione Gruppi - Da implementare
      </p>
    </div>
  );
}

// ============================================
// TAB 4.4: PRE-GARA (TODO)
// ============================================

function PreGaraTab() {
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        Pre-Gara
      </h2>
      <p className="text-dark-text-secondary">
        Contenuto tab Pre-Gara - Da implementare
      </p>
    </div>
  );
}
