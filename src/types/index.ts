export interface User {
  id: string;
  email?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  user_metadata?: {
    [key: string]: any;
  };
  app_metadata?: {
    [key: string]: any;
  };
}

export interface SleepData {
  id: string;
  user_id: string;
  date: string;
  duration: number;
  quality_score: number;
  start_time: string;
  end_time: string;
}

export interface CommitData {
  id: string;
  user_id: string;
  timestamp: string;
  repository: string;
  message: string;
}