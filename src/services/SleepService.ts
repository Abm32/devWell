import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type SleepRecord = Database['public']['Tables']['sleep_records']['Row'];
type SleepRecordInsert = Database['public']['Tables']['sleep_records']['Insert'];
type SleepRecordUpdate = Database['public']['Tables']['sleep_records']['Update'];

export class SleepService {
  private cache: Map<string, { data: SleepRecord[], timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getSleepRecords(userId: string, startDate: Date, endDate: Date): Promise<SleepRecord[]> {
    const cacheKey = `${userId}-${startDate.toISOString()}-${endDate.toISOString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sleep records:', error);
      return [];
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  async addSleepRecord(record: SleepRecordInsert): Promise<SleepRecord | null> {
    const { data, error } = await supabase
      .from('sleep_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error adding sleep record:', error);
      return null;
    }

    // Invalidate cache
    this.cache.clear();
    return data;
  }

  async updateSleepRecord(recordId: string, updates: SleepRecordUpdate): Promise<SleepRecord | null> {
    const { data, error } = await supabase
      .from('sleep_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating sleep record:', error);
      return null;
    }

    // Invalidate cache
    this.cache.clear();
    return data;
  }

  async deleteSleepRecord(recordId: string): Promise<boolean> {
    const { error } = await supabase
      .from('sleep_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Error deleting sleep record:', error);
      return false;
    }

    // Invalidate cache
    this.cache.clear();
    return true;
  }
}