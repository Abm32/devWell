export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          github_username: string | null
          display_name: string | null
          avatar_url: string | null
          sleep_goal_hours: number
          commit_goal_daily: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          github_username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          sleep_goal_hours?: number
          commit_goal_daily?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          github_username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          sleep_goal_hours?: number
          commit_goal_daily?: number
          created_at?: string
          updated_at?: string
        }
      }
      sleep_records: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          duration_hours: number
          quality_score: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          duration_hours: number
          quality_score?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string
          duration_hours?: number
          quality_score?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      commit_records: {
        Row: {
          id: string
          user_id: string
          repository: string
          commit_hash: string
          commit_message: string | null
          commit_timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repository: string
          commit_hash: string
          commit_message?: string | null
          commit_timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repository?: string
          commit_hash?: string
          commit_message?: string | null
          commit_timestamp?: string
          created_at?: string
        }
      }
      activity_insights: {
        Row: {
          id: string
          user_id: string
          date: string
          productivity_score: number | null
          sleep_score: number | null
          commit_count: number
          active_hours: number
          recommendations: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          productivity_score?: number | null
          sleep_score?: number | null
          commit_count?: number
          active_hours?: number
          recommendations?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          productivity_score?: number | null
          sleep_score?: number | null
          commit_count?: number
          active_hours?: number
          recommendations?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}