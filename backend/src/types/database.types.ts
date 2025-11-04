/**
 * DATABASE TYPES - Database Schema Types
 */

// Sex enum
export type Sex = 'M' | 'F';

// Meet status
export type MeetStatus = 'SETUP' | 'WEIGH_IN' | 'IN_PROGRESS' | 'COMPLETED';

// Attempt result
export type AttemptResult = 'VALID' | 'INVALID' | 'PENDING';

// Lift
export interface Lift {
  id: string; // 'SQ', 'PU', 'DIP', etc.
  name: string;
}

// Meet Type
export interface MeetType {
  id: string; // 'STREET_4', 'STREET_3'
  name: string;
}

// Meet Type Lifts (junction table)
export interface MeetTypeLift {
  meet_type_id: string;
  lift_id: string;
  sequence: number;
}

// Weight Category
export interface WeightCategory {
  id: number;
  name: string;
  sex: Sex;
  min_kg: number;
  max_kg: number | null;
  ord: number;
}

// Age Category
export interface AgeCategory {
  id: number;
  name: string;
  min_age: number | null;
  max_age: number | null;
  ord: number;
}

// Team
export interface Team {
  id: number;
  name: string;
  created_at: Date;
}

// Athlete
export interface Athlete {
  id: number;
  cf: string;
  first_name: string;
  last_name: string;
  sex: Sex;
  birth_date: Date;
  team_id: number | null;
  body_weight: number | null;
  created_at: Date;
}

// Meet
export interface Meet {
  id: number;
  name: string;
  meet_type_id: string;
  date: Date;
  location: string | null;
  status: MeetStatus;
  created_at: Date;
}

// Meet Athlete (registration)
export interface MeetAthlete {
  id: number;
  meet_id: number;
  athlete_id: number;
  weight_category_id: number | null;
  age_category_id: number | null;
  flight_number: number | null;
  lot_number: number | null;
  created_at: Date;
}

// Attempt
export interface Attempt {
  id: number;
  meet_athlete_id: number;
  lift_id: string;
  attempt_number: 1 | 2 | 3;
  declared_weight: number | null;
  result: AttemptResult | null;
  override_reason: string | null;
  created_at: Date;
}

// Vote
export interface Vote {
  id: number;
  attempt_id: number;
  judge_id: number;
  vote: boolean; // true = valid, false = invalid
  created_at: Date;
}

// Database query result types
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}
