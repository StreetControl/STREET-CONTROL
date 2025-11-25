/**
 * Meet Settings Page
 * 
 * Configuration page for creating and managing meets with tabs for:
 * - General information
 * - Athlete registration and CSV import
 * - Group division
 * - Pre-meet setup
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ChevronLeft } from 'lucide-react';
import {
  InfoTab,
  RegistrationTab,
  GroupDivisionTab,
  PreMeetTab,
  TabButton
} from '../../components/meet-settings';

type TabType = 'info' | 'registration' | 'group-division' | 'pre-meet';

export default function MeetSettingsPage() {
  const navigate = useNavigate();
  const { meetId } = useParams<{ meetId: string }>();
  
  // If meetId exists (editing existing meet) → start from REGISTRATION
  // If meetId does NOT exist (new meet) → start from INFO
  const initialTab: TabType = meetId ? 'registration' : 'info';
  
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

  // Callback when the meet is created in the Info tab
  const handleMeetCreated = (newMeetId: number) => {
    setCreatedMeetId(newMeetId.toString());
    // Redirect to edit mode
    navigate(`/meets/${newMeetId}/settings`, { replace: true });
    // Switch to registration tab
    setActiveTab('registration');
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 bg-dark-bg-secondary border-b border-dark-border z-50">
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
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4 text-primary flex-shrink-0" />
              Torna alla lista
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation - with top padding to account for fixed header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pt-24">
        <div className="border-b border-dark-border">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
            >
              INFO
            </TabButton>
            <TabButton
              active={activeTab === 'registration'}
              onClick={() => setActiveTab('registration')}
            >
              ISCRIZIONE
            </TabButton>
            <TabButton
              active={activeTab === 'group-division'}
              onClick={() => setActiveTab('group-division')}
            >
              DIVISIONE GRUPPI
            </TabButton>
            <TabButton
              active={activeTab === 'pre-meet'}
              onClick={() => setActiveTab('pre-meet')}
            >
              PRE-GARA
            </TabButton>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'info' && <InfoTab onMeetCreated={handleMeetCreated} existingMeetId={createdMeetId} />}
        {activeTab === 'registration' && <RegistrationTab meetId={createdMeetId} />}
        {activeTab === 'group-division' && <GroupDivisionTab meetId={createdMeetId} />}
        {activeTab === 'pre-meet' && <PreMeetTab meetId={createdMeetId} />}
      </div>
    </div>
  );
}
