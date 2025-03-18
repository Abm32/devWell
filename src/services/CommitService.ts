import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type CommitRecord = Database['public']['Tables']['commit_records']['Row'];
type CommitRecordInsert = Database['public']['Tables']['commit_records']['Insert'];

export class CommitService {
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCommitRecords(userId: string, startDate: Date, endDate: Date): Promise<CommitRecord[]> {
    const cacheKey = `records-${userId}-${startDate.toISOString()}-${endDate.toISOString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('commit_records')
      .select('*')
      .eq('user_id', userId)
      .gte('commit_timestamp', startDate.toISOString())
      .lte('commit_timestamp', endDate.toISOString())
      .order('commit_timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching commit records:', error);
      return [];
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  async getCommitStats(userId: string, date: Date): Promise<{ count: number; hours: number }> {
    const cacheKey = `stats-${userId}-${date.toISOString().split('T')[0]}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('commit_records')
      .select('commit_timestamp')
      .eq('user_id', userId)
      .gte('commit_timestamp', startOfDay.toISOString())
      .lte('commit_timestamp', endOfDay.toISOString());

    if (error) {
      console.error('Error fetching commit stats:', error);
      return { count: 0, hours: 0 };
    }

    const timestamps = data.map(record => new Date(record.commit_timestamp));
    const uniqueHours = new Set(timestamps.map(t => t.getHours())).size;
    const stats = { count: data.length, hours: uniqueHours };

    this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
    return stats;
  }

  async addCommitRecord(record: CommitRecordInsert): Promise<CommitRecord | null> {
    const { data, error } = await supabase
      .from('commit_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error adding commit record:', error);
      return null;
    }

    // Invalidate cache
    this.cache.clear();
    return data;
  }
}