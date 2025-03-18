import React, { useState, useEffect } from 'react';
import { DashboardCard } from '../components/DashboardCard';
import { Code, Clock, GitCommit, GitBranch } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { CommitService } from '../services';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type CommitRecord = Database['public']['Tables']['commit_records']['Row'];

const commitService = new CommitService();

export const Commits: React.FC = () => {
  const { user } = useAuth();
  const [commits, setCommits] = useState<CommitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ count: 0, hours: 0 });

  useEffect(() => {
    if (user) {
      loadCommitData();
    }
  }, [user]);

  const loadCommitData = async () => {
    if (!user) return;
    
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 1);
      const records = await commitService.getCommitRecords(user.id, startDate, endDate);
      const todayStats = await commitService.getCommitStats(user.id, new Date());
      
      setCommits(records);
      setStats(todayStats);
    } catch (error) {
      console.error('Error loading commit data:', error);
      toast.error('Failed to load commit data');
    } finally {
      setLoading(false);
    }
  };

  const commitsByHour = Array.from({ length: 24 }, (_, hour) => {
    const count = commits.filter(commit => {
      const commitHour = new Date(commit.commit_timestamp).getHours();
      return commitHour === hour;
    }).length;

    return {
      hour: format(new Date().setHours(hour), 'HH:00'),
      commits: count
    };
  });

  const repositories = [...new Set(commits.map(commit => commit.repository))];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Commit Activity</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DashboardCard title="Today's Commits" className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <GitCommit className="h-8 w-8" />
            <span className="text-3xl font-bold">{stats.count}</span>
          </div>
          <p className="mt-2 text-green-100">Total commits today</p>
        </DashboardCard>

        <DashboardCard title="Active Hours" className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8" />
            <span className="text-3xl font-bold">{stats.hours}h</span>
          </div>
          <p className="mt-2 text-blue-100">Coding time today</p>
        </DashboardCard>

        <DashboardCard title="Repositories" className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <GitBranch className="h-8 w-8" />
            <span className="text-3xl font-bold">{repositories.length}</span>
          </div>
          <p className="mt-2 text-purple-100">Active today</p>
        </DashboardCard>

        <DashboardCard title="Peak Time" className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <Code className="h-8 w-8" />
            <span className="text-3xl font-bold">
              {commitsByHour.reduce((max, current) => 
                current.commits > max.commits ? current : max
              ).hour}
            </span>
          </div>
          <p className="mt-2 text-orange-100">Most productive hour</p>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard title="Commit Activity by Hour">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commitsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commits" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCard title="Recent Activity">
            <div className="space-y-4">
              {commits.slice(0, 5).map((commit) => (
                <div key={commit.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <GitCommit className="h-5 w-5 text-indigo-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{commit.commit_message || 'No message'}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(commit.commit_timestamp), 'h:mm a')} in {commit.repository}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Repository Activity">
            <div className="space-y-4">
              {repositories.map((repo) => {
                const repoCommits = commits.filter(c => c.repository === repo);
                return (
                  <div key={repo} className="flex items-start space-x-3">
                    <GitBranch className="h-5 w-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{repo}</p>
                      <p className="text-xs text-gray-500">{repoCommits.length} commits today</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};