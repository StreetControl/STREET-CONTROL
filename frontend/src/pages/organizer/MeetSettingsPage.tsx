/**
 * PAGINA 4: IMPOSTAZIONI GARA
 * 
 * Pagina per configurare una nuova gara con 4 tab:
 * - 4.1: Info (informazioni generali)
 * - 4.2: Descrizione
 * - 4.3: Divisione Gruppi
 * - 4.4: Pre-Gara
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeet } from '../../services/api';
import { supabase } from '../../services/supabase';
import type { CreateMeetRequest } from '../../types';

interface MeetType {
  id: string;
  name: string;
}

type TabType = 'info' | 'descrizione' | 'divisione-gruppi' | 'pre-gara';

export default function MeetSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-bg-secondary border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-dark-text">
            IMPOSTAZIONI GARA
          </h1>
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
              active={activeTab === 'descrizione'}
              onClick={() => setActiveTab('descrizione')}
            >
              DESCRIZIONE
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
        {activeTab === 'info' && <InfoTab />}
        {activeTab === 'descrizione' && <DescrizioneTab />}
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

function InfoTab() {
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
        // Success - redirect to meets list
        navigate('/meets');
      } else {
        throw new Error(response.message || 'Errore durante la creazione della gara');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Errore durante la creazione della gara');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        Informazioni Generali
      </h2>

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
            disabled={loadingMeetTypes}
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
          >
            <option value="">Seleziona regolamento...</option>
            <option value="REGOLAMENTO_ITALIANO">Regolamento Italiano</option>
            <option value="REGOLAMENTO_FINAL_REP">Regolamento Final Rep</option>
          </select>
        </div>

        {/* Submit Buttons */}
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
            {isSubmitting ? 'Creazione in corso...' : 'CREA E AVVIA COMPETIZIONE'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// TAB 4.2: DESCRIZIONE (TODO)
// ============================================

function DescrizioneTab() {
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        Descrizione
      </h2>
      <p className="text-dark-text-secondary">
        Contenuto tab Descrizione - Da implementare
      </p>
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
