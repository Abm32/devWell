/*
  # Initial Schema Setup for Developer Wellness Tracker

  1. New Tables
    - `profiles`
      - Extends auth.users with additional user profile data
      - Stores GitHub username and preferences
    - `sleep_records`
      - Stores daily sleep data
      - Tracks duration, quality, and timestamps
    - `commit_records`
      - Stores GitHub commit activity
      - Tracks commit timestamps and repository info
    - `activity_insights`
      - Stores analyzed activity patterns
      - Contains productivity scores and recommendations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username text,
  display_name text,
  avatar_url text,
  sleep_goal_hours numeric(4,2) DEFAULT 8.0,
  commit_goal_daily int DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create sleep_records table
CREATE TABLE IF NOT EXISTS sleep_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_hours numeric(4,2) NOT NULL,
  quality_score int CHECK (quality_score BETWEEN 0 AND 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sleep records"
  ON sleep_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create commit_records table
CREATE TABLE IF NOT EXISTS commit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  repository text NOT NULL,
  commit_hash text NOT NULL,
  commit_message text,
  commit_timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, commit_hash)
);

ALTER TABLE commit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own commit records"
  ON commit_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create activity_insights table
CREATE TABLE IF NOT EXISTS activity_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  productivity_score int CHECK (productivity_score BETWEEN 0 AND 100),
  sleep_score int CHECK (sleep_score BETWEEN 0 AND 100),
  commit_count int DEFAULT 0,
  active_hours numeric(4,2) DEFAULT 0,
  recommendations text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE activity_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity insights"
  ON activity_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update profile timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_records_updated_at
  BEFORE UPDATE ON sleep_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_insights_updated_at
  BEFORE UPDATE ON activity_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_date ON sleep_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_commit_records_user_timestamp ON commit_records(user_id, commit_timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_insights_user_date ON activity_insights(user_id, date);