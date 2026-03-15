import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface UserProfile {
  id: string; // Default to "user" for single device usage
  age_months: number;
  current_sub_level: string;
  highest_digits: number;
  current_percentile: number;
  total_wm_score: number;
  settings: {
    voice_assist: boolean;
    spatial_mapping: boolean;
  };
}

export interface TrialLog {
  trial_id: string;
  session_id: string;
  timestamp: string;
  sub_level: string;
  displayed_sequence: number[];
  actual_time_sec: number;
  error_interventions: number;
  prompt_used: boolean;
  fluency_score: number;
  is_fatigue_detected: boolean;
}

export class WMTrainingDB extends Dexie {
  userProfile!: Table<UserProfile, string>;
  trialLogs!: Table<TrialLog, string>;

  constructor() {
    super('WMTrainingDB');
    this.version(1).stores({
      userProfile: 'id',
      trialLogs: 'trial_id, session_id, timestamp'
    });
  }
}

export const db = new WMTrainingDB();
