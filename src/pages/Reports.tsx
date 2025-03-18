import React, { useState, useEffect } from 'react';
import { DashboardCard } from '../components/DashboardCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Award, Target, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SleepService, CommitService, InsightService } from '../services';
import { format, subDays, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth } from 'date-fns';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RefreshButton } from '../components/RefreshButton';

type ActivityInsight = Database['public']['Tables']['activity_insights']['Row'];

const sleepService = new SleepService();
const commitService = new CommitService();
const insightService = new InsightService();

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [insights, setInsights] = useState<ActivityInsight[]>([]);
  const [previousMonthStats, setPreviousMonthStats] = useState<typeof monthlyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthlyStats, setMonthlyStats] = useState({
    totalCommits: 0,
    avgSleep: 0,
    avgProductivity: 0,
    goalsMetCount: 0,
    activeHours: 0,
    consistencyScore: 0
  });

  const loadMonthlyData = async (showRefreshToast = false) => {
    if (!user) return;

    try {
      setError(null);
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      // Load current month insights
      const monthInsights = await insightService.getInsights(user.id, start, end);
      setInsights(monthInsights);

      // Calculate monthly statistics
      const stats = {
        totalCommits: monthInsights.reduce((sum, insight) => sum + insight.commit_count, 0),
        avgSleep: monthInsights.reduce((sum, insight) => sum + (insight.sleep_score || 0), 0) / monthInsights.length || 0,
        avgProductivity: monthInsights.reduce((sum, insight) => sum + (insight.productivity_score || 0), 0) / monthInsights.length || 0,
        goalsMetCount: monthInsights.filter(insight => 
          (insight.sleep_score || 0) >= 70 && 
          (insight.productivity_score || 0) >= 70
        ).length,
        activeHours: monthInsights.reduce((sum, insight) => sum + insight.active_hours, 0),
        consistencyScore: calculateConsistencyScore(monthInsights)
      };

      setMonthlyStats(stats);

      // Load previous month stats for comparison
      if (isSameMonth(selectedMonth, new Date())) {
        const prevStart = startOfMonth(subDays(start, 1));
        const prevEnd = endOfMonth(subDays(start, 1));
        const prevMonthInsights = await insightService.getInsights(user.id, prevStart, prevEnd);
        
        const prevStats = {
          totalCommits: prevMonthInsights.reduce((sum, insight) => sum + insight.commit_count, 0),
          avgSleep: prevMonthInsights.reduce((sum, insight) => sum + (insight.sleep_score || 0), 0) / prevMonthInsights.length || 0,
          avgProductivity: prevMonthInsights.reduce((sum, insight) => sum + (insight.productivity_score || 0), 0) / prevMonthInsights.length || 0,
          goalsMetCount: prevMonthInsights.filter(insight => 
            (insight.sleep_score || 0) >= 70 && 
            (insight.productivity_score || 0) >= 70
          ).length,
          activeHours: prevMonthInsights.reduce((sum, insight) => sum + insight.active_hours, 0),
          consistencyScore: calculateConsistencyScore(prevMonthInsights)
        };

        setPreviousMonthStats(prevStats);
      } else {
        setPreviousMonthStats(null);
      }

      if (showRefreshToast) {
        toast.success('Report data refreshed');
      }
    } catch (error) {
      console.error('Error loading monthly data:', error);
      setError('Failed to load report data. Please try again.');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMonthlyData();
    }
  }, [user, selectedMonth]);

  const handleRefresh = () => {
    loadMonthlyData(true);
  };

  const calculateConsistencyScore = (data: ActivityInsight[]) => {
    if (data.length < 2) return 0;
    
    let consistencyScore = 0;
    for (let i = 1; i < data.length; i++) {
      const prevDay = data[i - 1];
      const currentDay = data[i];
      
      // Check sleep consistency
      if (Math.abs((prevDay.sleep_score || 0) - (currentDay.sleep_score || 0)) < 20) {
        consistencyScore += 1;
      }
      
      // Check productivity consistency
      if (Math.abs((prevDay.productivity_score || 0) - (currentDay.productivity_score || 0)) < 20) {
        consistencyScore += 1;
      }
    }
    
    return (consistencyScore / ((data.length - 1) * 2)) * 100;
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const renderTrend = (current: number, previous: number) => {
    const change = getPercentageChange(current, previous);
    const color = change >= 0 ? 'text-green-500' : 'text-red-500';
    const Icon = change >= 0 ? ArrowUp : ArrowDown;
    return (
      <div className={`flex items-center ${color} text-sm mt-1`}>
        <Icon className="h-4 w-4 mr-1" />
        {Math.abs(change).toFixed(1)}% vs last month
      </div>
    );
  };

  // Group insights by week
  const weeklyData = eachWeekOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  }).map((weekStart, index) => {
    const weekInsights = insights.filter(insight => {
      const insightDate = new Date(insight.date);
      return insightDate >= weekStart && insightDate < new Date(weekStart.setDate(weekStart.getDate() + 7));
    });

    return {
      week: `Week ${index + 1}`,
      commits: weekInsights.reduce((sum, insight) => sum + insight.commit_count, 0),
      sleep: weekInsights.reduce((sum, insight) => sum + (insight.sleep_score || 0), 0) / weekInsights.length || 0,
      productivity: weekInsights.reduce((sum, insight) => sum + (insight.productivity_score || 0), 0) / weekInsights.length || 0,
      activeHours: weekInsights.reduce((sum, insight) => sum + insight.active_hours, 0)
    };
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-700">{error}</p>
        <button
          onClick={() => loadMonthlyData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Monthly Report</h1>
        <div className="flex space-x-2 items-center">
          <select 
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={selectedMonth.toISOString().slice(0, 7)}
            onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              return (
                <option key={i} value={date.toISOString().slice(0, 7)}>
                  {format(date, 'MMMM yyyy')}
                </option>
              );
            })}
          </select>
          <RefreshButton onClick={handleRefresh} loading={refreshing} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Total Commits" className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <Calendar className="h-8 w-8" />
            <span className="text-3xl font-bold">{monthlyStats.totalCommits}</span>
          </div>
          <p className="mt-2 text-indigo-100">This month</p>
          {previousMonthStats && renderTrend(monthlyStats.totalCommits, previousMonthStats.totalCommits)}
        </DashboardCard>

        <DashboardCard title="Avg Sleep Score" className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-8 w-8" />
            <span className="text-3xl font-bold">{monthlyStats.avgSleep.toFixed(1)}</span>
          </div>
          <p className="mt-2 text-blue-100">Monthly average</p>
          {previousMonthStats && renderTrend(monthlyStats.avgSleep, previousMonthStats.avgSleep)}
        </DashboardCard>

        <DashboardCard title="Productivity" className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <Award className="h-8 w-8" />
            <span className="text-3xl font-bold">{monthlyStats.avgProductivity.toFixed(1)}%</span>
          </div>
          <p className="mt-2 text-green-100">Achievement rate</p>
          {previousMonthStats && renderTrend(monthlyStats.avgProductivity, previousMonthStats.avgProductivity)}
        </DashboardCard>

        <DashboardCard title="Consistency Score" className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <Target className="h-8 w-8" />
            <span className="text-3xl font-bold">{monthlyStats.consistencyScore.toFixed(1)}%</span>
          </div>
          <p className="mt-2 text-orange-100">Habit strength</p>
          {previousMonthStats && renderTrend(monthlyStats.consistencyScore, previousMonthStats.consistencyScore)}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Weekly Progress">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border">
                          <p className="font-semibold">{data.week}</p>
                          <p className="text-gray-600">Commits: {data.commits}</p>
                          <p className="text-gray-600">Active Hours: {data.activeHours}h</p>
                          <p className="text-gray-600">Productivity: {data.productivity.toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="commits" 
                  stroke="#6366f1" 
                  name="Commits"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="productivity" 
                  stroke="#10b981" 
                  name="Productivity %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Sleep vs Productivity">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border">
                          <p className="font-semibold">{data.week}</p>
                          <p className="text-gray-600">Sleep Score: {data.sleep.toFixed(1)}</p>
                          <p className="text-gray-600">Productivity: {data.productivity.toFixed(1)}%</p>
                          <p className="text-gray-600">Active Hours: {data.activeHours}h</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="sleep" 
                  fill="#6366f1" 
                  name="Sleep Score"
                />
                <Bar 
                  dataKey="productivity" 
                  fill="#10b981" 
                  name="Productivity %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Monthly Insights">
        <div className="space-y-6">
          <div className="border-l-4 border-indigo-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-900">Sleep Pattern Analysis</h3>
            <p className="mt-2 text-gray-600">
              {monthlyStats.avgSleep > 70
                ? "You've maintained a healthy sleep schedule this month. Keep up the good work!"
                : "Your sleep quality could use some improvement. Try to maintain a consistent sleep schedule."}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Average sleep score: {monthlyStats.avgSleep.toFixed(1)}
              {previousMonthStats && ` (${monthlyStats.avgSleep > previousMonthStats.avgSleep ? 'up' : 'down'} from last month)`}
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-900">Coding Activity</h3>
            <p className="mt-2 text-gray-600">
              {`You've made ${monthlyStats.totalCommits} commits this month, with an average productivity score of ${monthlyStats.avgProductivity.toFixed(1)}%.`}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Total active hours: {monthlyStats.activeHours.toFixed(1)}h
              {previousMonthStats && ` (${monthlyStats.activeHours > previousMonthStats.activeHours ? 'more' : 'less'} than last month)`}
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-900">Consistency Analysis</h3>
            <p className="mt-2 text-gray-600">
              {monthlyStats.consistencyScore > 70
                ? "You've developed strong coding and sleep habits. Your consistency is excellent!"
                : "Your patterns show some variability. Try to establish more consistent daily routines."}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Goals met: {monthlyStats.goalsMetCount}/{insights.length} days
              {previousMonthStats && ` (${monthlyStats.goalsMetCount > previousMonthStats.goalsMetCount ? 'better' : 'fewer'} than last month)`}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};