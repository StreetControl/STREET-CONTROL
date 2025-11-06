/**
 * MEET CONFIGURATION
 * Centralized configuration for meet levels and regulation codes
 */

export interface MeetLevel {
  value: string;
  label: string;
  description?: string;
}

export interface RegulationCode {
  value: string;
  label: string;
  description?: string;
}

export interface ScoreType {
  value: string;
  label: string;
  description?: string;
}

/**
 * Available meet levels
 * Can be easily extended with new levels
 */
export const MEET_LEVELS: MeetLevel[] = [
  {
    value: 'REGIONALE',
    label: 'Regionale',
    description: 'Competizione a livello regionale'
  },
  {
    value: 'NAZIONALE',
    label: 'Nazionale',
    description: 'Competizione a livello nazionale'
  },
  {
    value: 'INTERNAZIONALE',
    label: 'Internazionale',
    description: 'Competizione a livello internazionale'
  }
];

/**
 * Available regulation codes
 * Can be easily extended with new regulations
 */
export const REGULATION_CODES: RegulationCode[] = [
  {
    value: 'REGOLAMENTO_ITALIANO',
    label: 'Regolamento Italiano',
    description: 'Regolamento standard italiano'
  },
  {
    value: 'REGOLAMENTO_FINAL_REP',
    label: 'Regolamento Final Rep',
    description: 'Regolamento Final Rep'
  }
];

/**
 * Helper function to get level label by value
 */
export const getLevelLabel = (value: string): string => {
  const level = MEET_LEVELS.find(l => l.value === value);
  return level?.label || value;
};

/**
 * Available score types
 * Can be easily extended with new score systems
 */
export const SCORE_TYPES: ScoreType[] = [
  {
    value: 'IPF',
    label: 'IPF',
    description: 'Sistema di punteggio IPF'
  },
  {
    value: 'RIS',
    label: 'RIS',
    description: 'Sistema di punteggio RIS'
  }
];

/**
 * Helper function to get regulation label by value
 */
export const getRegulationLabel = (value: string): string => {
  const regulation = REGULATION_CODES.find(r => r.value === value);
  return regulation?.label || value;
};

/**
 * Helper function to get score type label by value
 */
export const getScoreTypeLabel = (value: string): string => {
  const scoreType = SCORE_TYPES.find(p => p.value === value);
  return scoreType?.label || value;
};
