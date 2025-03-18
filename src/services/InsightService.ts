import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type ActivityInsight = Database['public']['Tables']['activity_insights']['Row'];
type ActivityInsightInsert = Database['public']['Tables']['activity_insights']['Insert'];
type ActivityInsightUpdate = Database['public']['Tables']['activity_insights']['Update'];

export class InsightService {
  private cache: Map<string, { data: ActivityInsight[], timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getInsights(userId: string, startDate: Date, endDate: Date): Promise<ActivityInsight[]> {
    const cacheKey = `${userId}-${startDate.toISOString()}-${endDate.toISOString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('activity_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  async getLatestInsight(userId: string): Promise<ActivityInsight | null> {
    const cacheKey = `latest-${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data[0] || null;
    }

    const { data, error } = await supabase
      .from('activity_insights')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest insight:', error);
      return null;
    }

    this.cache.set(cacheKey, { data: [data], timestamp: Date.now() });
    return data;
  }

  async upsertInsight(insight: ActivityInsightInsert): Promise<ActivityInsight | null> {
    const { data, error } = await supabase
      .from('activity_insights')
      .upsert(insight)
      .select()
      .single();

    if (error) {
      console.error('Error upserting insight:', error);
      return null;
    }

    // Invalidate cache
    this.cache.clear();
    return data;
  }

  async updateInsight(insightId: string, updates: ActivityInsightUpdate): Promise<ActivityInsight | null> {
    const { data, error } = await supabase
      .from('activity_insights')
      .update(updates)
      .eq('id', insightId)
      .select()
      .single();

    if (error) {
      console.error('Error updating insight:', error);
      return null;
    }

    // Invalidate cache
    this.cache.clear();
    return data;
  }
}