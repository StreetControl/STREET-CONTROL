/**
 * INFO TAB - Meet General Information
 * Create or view meet general information
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeet, updateMeet } from '../../services/api';
import { supabase } from '../../services/supabase';
import { MEET_LEVELS, REGULATION_CODES, SCORE_TYPES } from '../../config/meetConfig';
import { Edit, Save } from 'lucide-react';
import type { CreateMeetRequest } from '../../types';

interface MeetType {
  id: string;
  name: string;
}

interface InfoTabProps {
  onMeetCreated?: (meetId: number) => void;
  existingMeetId?: string;
}

export default function InfoTab({ onMeetCreated, existingMeetId }: InfoTabProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    competition_name: '',
    competition_type: '',
    level: '',
    start_date: '',
    end_date: '',
    regulation_code: '',
    score_type: '' // Default value
  });

  const [meetTypes, setMeetTypes] = useState<MeetType[]>([]);
  const [loadingMeetTypes, setLoadingMeetTypes] = useState(true);
  const [loadingMeet, setLoadingMeet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Load existing meet data if in edit mode
  useEffect(() => {
    if (existingMeetId) {
      loadExistingMeet();
    }
  }, [existingMeetId]);

  const loadExistingMeet = async () => {
    if (!existingMeetId) return;

    setLoadingMeet(true);
    setError(null);
    
    try {
      const meetIdNum = parseInt(existingMeetId);
      
      if (isNaN(meetIdNum)) {
        throw new Error('ID gara non valido');
      }

      const { data, error } = await supabase
        .from('meets')
        .select('id, name, meet_type_id, level, start_date, end_date, regulation_code, score_type')
        .eq('id', meetIdNum)
        .maybeSingle();

      if (error) {
        console.error('Supabase error loading meet:', error);
        throw new Error(error.message);
      }

      if (data) {
        setFormData({
          competition_name: data.name,
          competition_type: data.meet_type_id,
          level: data.level,
          start_date: data.start_date,
          end_date: data.end_date,
          regulation_code: data.regulation_code,
          score_type: data.score_type || 'RIS'
        });
      }
    } catch (err: any) {
      console.error('Error loading meet:', err);
      const errorMsg = err.message || 'Errore sconosciuto';
      if (!errorMsg.includes('No rows found') && !errorMsg.includes('JSON object')) {
        setError('Errore nel caricamento dei dati della gara: ' + errorMsg);
      }
    } finally {
      setLoadingMeet(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (!formData.competition_name || !formData.competition_type || 
          !formData.level || !formData.start_date || !formData.end_date || 
          !formData.regulation_code || !formData.score_type) {
        throw new Error('Tutti i campi sono obbligatori');
      }

      // Validate end_date >= start_date
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        throw new Error('La data di fine deve essere successiva o uguale alla data di inizio');
      }

      if (existingMeetId && isEditMode) {
        // UPDATE MODE
        const updateRequest = {
          name: formData.competition_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          level: formData.level as 'REGIONALE' | 'NAZIONALE' | 'INTERNAZIONALE',
          regulation_code: formData.regulation_code,
          score_type: formData.score_type
        };

        const response = await updateMeet(parseInt(existingMeetId), updateRequest);

        if (response.success) {
          setSuccessMessage('Gara aggiornata con successo!');
          setIsEditMode(false);
          // Reload data to ensure consistency
          await loadExistingMeet();
        } else {
          throw new Error(response.message || 'Errore durante l\'aggiornamento della gara');
        }

      } else {
        // CREATE MODE
        const meetRequest: CreateMeetRequest = {
          name: formData.competition_name,
          meet_type_id: formData.competition_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          level: formData.level as 'REGIONALE' | 'NAZIONALE' | 'INTERNAZIONALE',
          regulation_code: formData.regulation_code,
          score_type: formData.score_type
        };

        const response = await createMeet(meetRequest);

        if (response.success && response.meet) {
          if (onMeetCreated) {
            onMeetCreated(response.meet.id);
          } else {
            navigate('/meets');
          }
        } else {
          throw new Error(response.message || 'Errore durante la creazione della gara');
        }
      }

    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 
                       (existingMeetId ? 'Errore durante l\'aggiornamento della gara' : 'Errore durante la creazione della gara');
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const isReadOnly = !!existingMeetId && !isEditMode;

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-dark-text mb-6">
        {existingMeetId ? 'INFORMAZIONI GARA' : 'INFORMAZIONI GENERALI'}
      </h2>

      {existingMeetId && !isEditMode && (
        <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-400">
                Le informazioni della gara sono in modalità sola lettura.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="btn-secondary text-sm py-2 px-4 whitespace-nowrap flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifica
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-green-400">{successMessage}</p>
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
          <label className="label">
            Nome Competizione
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {formData.competition_name}
            </div>
          ) : (
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
          )}
        </div>

        {/* Competition Type - SEMPRE in sola lettura se esistingMeetId */}
        <div>
          <label className="label">
            Tipo Competizione {existingMeetId && <span className="text-xs text-dark-text-secondary">(non modificabile)</span>}
          </label>
          {existingMeetId ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text-secondary px-4 py-3 rounded-lg opacity-60">
              {meetTypes.find(t => t.id === formData.competition_type)?.name || formData.competition_type}
            </div>
          ) : (
            <select
              id="competition_type"
              name="competition_type"
              value={formData.competition_type}
              onChange={handleChange}
              className="input-field cursor-pointer enabled:opacity-100 enabled:cursor-pointer enabled:pointer-events-auto"
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
          )}
        </div>

        {/* Level */}
        <div>
          <label className="label">
            Livello
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {MEET_LEVELS.find(l => l.value === formData.level)?.label || formData.level}
            </div>
          ) : (
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="input-field cursor-pointer enabled:opacity-100 enabled:cursor-pointer enabled:pointer-events-auto"
              required
            >
              <option value="">Seleziona livello...</option>
              {MEET_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="label">
            Data Inizio
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {formData.start_date ? new Date(formData.start_date).toLocaleDateString('it-IT', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : '-'}
            </div>
          ) : (
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="input-field"
              required
            />
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="label">
            Data Fine
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {formData.end_date ? new Date(formData.end_date).toLocaleDateString('it-IT', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : '-'}
            </div>
          ) : (
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="input-field"
              required
              min={formData.start_date || undefined}
            />
          )}
          {!isReadOnly && formData.start_date && formData.end_date && (
            <p className="text-xs text-dark-text-secondary mt-1">
              Durata gara: {Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} giorni
            </p>
          )}
        </div>

        {/* Regulation Code */}
        <div>
          <label className="label">
            Regolamento
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {REGULATION_CODES.find(r => r.value === formData.regulation_code)?.label || formData.regulation_code}
            </div>
          ) : (
            <select
              id="regulation_code"
              name="regulation_code"
              value={formData.regulation_code}
              onChange={handleChange}
              className="input-field cursor-pointer enabled:opacity-100 enabled:cursor-pointer enabled:pointer-events-auto"
              required
            >
              <option value="">Seleziona regolamento...</option>
              {REGULATION_CODES.map((regulation) => (
                <option key={regulation.value} value={regulation.value}>
                  {regulation.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Score Type */}
        <div>
          <label className="label">
            Tipo Punteggio
          </label>
          {isReadOnly ? (
            <div className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-3 rounded-lg">
              {SCORE_TYPES.find(p => p.value === formData.score_type)?.label || formData.score_type}
            </div>
          ) : (
            <select
              id="score_type"
              name="score_type"
              value={formData.score_type}
              onChange={handleChange}
              className="input-field cursor-pointer enabled:opacity-100 enabled:cursor-pointer enabled:pointer-events-auto"
              required
            >
              <option value="">Seleziona tipo punteggio...</option>
              {SCORE_TYPES.map((scoreType) => (
                <option key={scoreType.value} value={scoreType.value}>
                  {scoreType.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Submit Buttons */}
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
              {isSubmitting ? 'Creazione in corso...' : 'CREA GARA'}
            </button>
          </div>
        )}

        {/* Edit Mode Buttons */}
        {existingMeetId && isEditMode && (
          <div className="flex justify-between items-center pt-6 border-t border-dark-border">
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                setError(null);
                setSuccessMessage(null);
                loadExistingMeet(); // Ricarica i dati originali
              }}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Annulla Modifiche
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-8 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Salvataggio in corso...' : 'SALVA MODIFICHE'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
