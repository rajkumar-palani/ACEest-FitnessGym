import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    recentWorkouts: 0,
    avgAdherence: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Load clients
      const clients = await api.getClients();
      const activeClients = clients.filter(client => client.membership_status === 'Active').length;

      // Load recent workouts (last 7 days)
      const workouts = await api.getWorkouts();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentWorkouts = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= oneWeekAgo;
      }).length;

      // Load progress data for adherence
      const progress = await api.getProgress();
      const avgAdherence = progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.adherence, 0) / progress.length)
        : 0;

      setStats({
        totalClients: clients.length,
        activeClients,
        recentWorkouts,
        avgAdherence,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      showToast('Failed to load dashboard data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className={`bg-white overflow-hidden shadow rounded-lg border-l-4 border-${color}-500`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md bg-${color}-50`}>
              <span className={`text-${color}-600 text-2xl`}>{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {loading ? '...' : value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, to, icon, color = 'blue' }) => (
    <Link
      to={to}
      className={`block bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-200`}
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-md bg-${color}-50 mr-4`}>
            <span className={`text-${color}-600 text-xl`}>{icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Role: {user?.role} • Here's what's happening with your gym today.
          </p>
        </div>
      </div>

      {/* Main Grid (left/right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Stats + Recent Activity */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Clients"
              value={stats.totalClients}
              icon="👥"
              color="blue"
            />
            <StatCard
              title="Active Members"
              value={stats.activeClients}
              icon="✅"
              color="green"
            />
            <StatCard
              title="Workouts This Week"
              value={stats.recentWorkouts}
              icon="💪"
              color="purple"
            />
            <StatCard
              title="Avg Adherence"
              value={`${stats.avgAdherence}%`}
              icon="📊"
              color="yellow"
            />
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="text-center py-8 text-gray-500">
                <p>Recent client activities and workout logs will appear here.</p>
                <p className="text-sm mt-2">Feature coming in next update.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="lg:col-span-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <QuickActionCard
                  title="Add New Client"
                  description="Register a new gym member"
                  to="/clients"
                  icon="➕"
                  color="green"
                />
                <QuickActionCard
                  title="Log Workout"
                  description="Record a client's workout session"
                  to="/workouts"
                  icon="🏋️"
                  color="blue"
                />
                <QuickActionCard
                  title="View Progress"
                  description="Check client metrics and adherence"
                  to="/metrics"
                  icon="📈"
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8 text-gray-500">
            <p>Recent client activities and workout logs will appear here.</p>
            <p className="text-sm mt-2">Feature coming in next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}