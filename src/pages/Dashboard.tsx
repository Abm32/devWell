import React, { useState, useEffect } from 'react';
import { DashboardCard } from '../components/DashboardCard';
import { Moon, Code, Brain, Zap, Clock, AlertTriangle, Github } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { SleepService, CommitService, InsightService } from '../services';
import { format, subDays, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RefreshButton } from '../components/RefreshButton';

type ActivityInsight = Database['public']['Tables']['activity_insights']['Row'];
type SleepRecord = Database['public']['Tables']['sleep_records']['Row'];

const sleepService = new SleepService();
const commitService = new CommitService();
const insightService = new InsightService();

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading, signInWithGitHub } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sleepData, setSleepData] = useState<SleepRecord[]>([]);
  const [insight, setInsight] = useState<ActivityInsight | null>(null);
  const [commitStats, setCommitStats] = useState({ count: 0, hours: 0 });
  const [error, setError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

  const loadDashboardData = async (showRefreshToast = false) => {
    if (!user) {
      console.log('No user found, skipping dashboard load');
      return;
    }

    try {
      setError(null);
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Loading dashboard data for user:', user.id);
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      console.log('Fetching sleep records...');
      const sleepRecords = await sleepService.getSleepRecords(user.id, startDate, endDate);
      console.log('Sleep records:', sleepRecords);

      console.log('Fetching commit stats...');
      const todayStats = await commitService.getCommitStats(user.id, new Date());
      console.log('Commit stats:', todayStats);

      console.log('Fetching insights...');
      const latestInsight = await insightService.getLatestInsight(user.id);
      console.log('Latest insight:', latestInsight);

      setSleepData(sleepRecords);
      setCommitStats(todayStats);
      setInsight(latestInsight);
      setGithubConnected(true);

      if (showRefreshToast) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard data');
      setGithubConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleConnectGitHub = async () => {
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast.error('Failed to connect to GitHub');
    }
  };

  const averageSleepDuration = sleepData.length
    ? sleepData.reduce((acc, record) => acc + record.duration_hours, 0) / sleepData.length
    : 0;

  const sleepChartData = sleepData.map(record => ({
    date: format(new Date(record.date), 'MMM dd'),
    hours: record.duration_hours,
    quality: record.quality_score,
    isToday: isToday(new Date(record.date))
  }));

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-700">{error}</p>
        <button
          onClick={() => loadDashboardData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!githubConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Github className="h-12 w-12 text-gray-600" />
        <p className="text-lg text-gray-700">Connect your GitHub account to track your commits</p>
        <button
          onClick={handleConnectGitHub}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center space-x-2"
        >
          <Github className="h-5 w-5" />
          <span>Connect GitHub</span>
        </button>
      </div>
    );
  }

  const getProductivityStatus = (score: number | null | undefined) => {
    if (!score) return 'No data';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs improvement';
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {user?.user_metadata?.full_name || 'Developer'}!
        </h1>
        <RefreshButton onClick={handleRefresh} loading={refreshing} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Sleep Score" className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <Moon className="h-8 w-8" />
            <span className="text-3xl font-bold">
              {insight?.sleep_score?.toFixed(1) || '—'}
            </span>
          </div>
          <p className="mt-2 text-indigo-100">
            {averageSleepDuration > 7 ? 'Good sleep quality' : 'Could be better'}
          </p>
          <div className="mt-4 text-sm text-indigo-100">
            <Clock className="h-4 w-4 inline mr-1" />
            Last 7 days avg: {averageSleepDuration.toFixed(1)}h
          </div>
        </DashboardCard>

        <DashboardCard title="Commits Today" className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <Code className="h-8 w-8" />
            <span className="text-3xl font-bold">{commitStats.count}</span>
          </div>
          <p className="mt-2 text-green-100">
            {commitStats.count > 5 ? 'Above average' : 'Keep pushing!'}
          </p>
          <div className="mt-4 text-sm text-green-100">
            <Clock className="h-4 w-4 inline mr-1" />
            Active time: {commitStats.hours}h today
          </div>
        </DashboardCard>

        <DashboardCard title="Focus Score" className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <Brain className="h-8 w-8" />
            <span className="text-3xl font-bold">
              {insight?.productivity_score?.toFixed(1) || '—'}
            </span>
          </div>
          <p className="mt-2 text-blue-100">
            {getProductivityStatus(insight?.productivity_score)}
          </p>
          <div className="mt-4 text-sm text-blue-100">
            <Clock className="h-4 w-4 inline mr-1" />
            Peak hours: {commitStats.hours > 0 ? '10 AM - 2 PM' : 'No data yet'}
          </div>
        </DashboardCard>

        <DashboardCard title="Active Hours" className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <Zap className="h-8 w-8" />
            <span className="text-3xl font-bold">{commitStats.hours}h</span>
          </div>
          <p className="mt-2 text-orange-100">Coding time today</p>
          <div className="mt-4 text-sm text-orange-100">
            <Clock className="h-4 w-4 inline mr-1" />
            {commitStats.count > 0 ? `${(commitStats.count / commitStats.hours).toFixed(1)} commits/hour` : 'No commits yet'}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Sleep Pattern">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 12]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border">
                          <p className="font-semibold">{data.date} {data.isToday ? '(Today)' : ''}</p>
                          <p className="text-gray-600">Duration: {data.hours}h</p>
                          <p className="text-gray-600">Quality: {data.quality}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Sleep Duration"
                  dot={({ isToday }) => isToday}
                />
                <Line 
                  type="monotone" 
                  dataKey="quality" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Quality Score"
                  dot={({ isToday }) => isToday}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Health Insights">
          <div className="space-y-4">
            {insight?.recommendations?.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                {index % 3 === 0 && <Moon className="h-5 w-5 text-indigo-600 mt-1" />}
                {index % 3 === 1 && <Code className="h-5 w-5 text-green-600 mt-1" />}
                {index % 3 === 2 && <Brain className="h-5 w-5 text-blue-600 mt-1" />}
                <div>
                  <p className="text-gray-700">{recommendation}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {index % 3 === 0 && 'Sleep Insight'}
                    {index % 3 === 1 && 'Coding Pattern'}
                    {index % 3 === 2 && 'Focus Tip'}
                  </p>
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-8">
                No insights available yet. Start tracking your activities to get personalized recommendations.
              </div>
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};