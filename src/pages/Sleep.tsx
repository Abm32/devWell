import React, { useState, useEffect } from 'react';
import { DashboardCard } from '../components/DashboardCard';
import { Moon, Clock, Zap, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { SleepService } from '../services';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type SleepRecord = Database['public']['Tables']['sleep_records']['Row'];

const sleepService = new SleepService();

export const Sleep: React.FC = () => {
  const { user } = useAuth();
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '22:00',
    endTime: '06:00',
    quality: 75,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadSleepData();
    }
  }, [user]);

  const loadSleepData = async () => {
    if (!user) return;
    
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      const records = await sleepService.getSleepRecords(user.id, startDate, endDate);
      setSleepRecords(records);
    } catch (error) {
      console.error('Error loading sleep data:', error);
      toast.error('Failed to load sleep data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    // If end time is before start time, assume it's the next day
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    try {
      await sleepService.addSleepRecord({
        user_id: user.id,
        date: formData.date,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_hours: Number(durationHours.toFixed(2)),
        quality_score: formData.quality,
        notes: formData.notes || null
      });

      toast.success('Sleep record added successfully');
      setShowAddModal(false);
      loadSleepData();
    } catch (error) {
      console.error('Error adding sleep record:', error);
      toast.error('Failed to add sleep record');
    }
  };

  const averageSleepDuration = sleepRecords.length
    ? sleepRecords.reduce((acc, record) => acc + record.duration_hours, 0) / sleepRecords.length
    : 0;

  const averageQuality = sleepRecords.length
    ? sleepRecords.reduce((acc, record) => acc + (record.quality_score || 0), 0) / sleepRecords.length
    : 0;

  const chartData = sleepRecords.map(record => ({
    date: format(new Date(record.date), 'MMM dd'),
    duration: record.duration_hours,
    quality: record.quality_score
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sleep Analytics</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Sleep Record
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Average Sleep Duration" className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8" />
            <span className="text-3xl font-bold">{averageSleepDuration.toFixed(1)}h</span>
          </div>
          <p className="mt-2 text-purple-100">Last 7 days average</p>
        </DashboardCard>

        <DashboardCard title="Sleep Quality" className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <Moon className="h-8 w-8" />
            <span className="text-3xl font-bold">{averageQuality.toFixed(0)}%</span>
          </div>
          <p className="mt-2 text-blue-100">Average quality score</p>
        </DashboardCard>

        <DashboardCard title="Optimal Sleep Time" className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <Zap className="h-8 w-8" />
            <span className="text-3xl font-bold">10:30 PM</span>
          </div>
          <p className="mt-2 text-emerald-100">Recommended bedtime</p>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard title="Weekly Sleep Pattern">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="duration" stroke="#6366f1" strokeWidth={2} name="Duration (hours)" />
                <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} name="Quality (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Sleep Record</h2>
            <form onSubmit={handleAddSleep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Score</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.quality}
                  onChange={(e) => setFormData({ ...formData, quality: Number(e.target.value) })}
                  className="mt-1 block w-full"
                />
                <span className="text-sm text-gray-500">{formData.quality}%</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};