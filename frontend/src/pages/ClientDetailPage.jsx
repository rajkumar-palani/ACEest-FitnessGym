import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [client, setClient] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const [clientData, workoutsData, metricsData, progressData] = await Promise.all([
        api.getClient(id),
        api.getWorkouts(),
        api.getMetrics(),
        api.getProgress(),
      ]);

      setClient(clientData);
      setWorkouts(workoutsData.filter(w => w.client_name === clientData.name));
      setMetrics(metricsData.filter(m => m.client_name === clientData.name));
      setProgress(progressData.filter(p => p.client_name === clientData.name));
    } catch (error) {
      console.error('Failed to load client data:', error);
      showToast('Failed to load client data', 'danger');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const generateWorkoutProgram = async () => {
    try {
      const program = await api.generateProgram(client.id);
      showToast('Workout program generated successfully', 'success');
      // Refresh data to show new program
      loadClientData();
    } catch (error) {
      console.error('Failed to generate program:', error);
      showToast(error.message || 'Failed to generate workout program', 'danger');
    }
  };

  // Prepare chart data
  const weightChartData = metrics
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(metric => ({
      date: new Date(metric.date).toLocaleDateString(),
      weight: metric.weight,
      waist: metric.waist,
      bodyfat: metric.bodyfat,
    }));

  const progressChartData = progress
    .sort((a, b) => a.id - b.id)
    .map(p => ({
      week: p.week,
      adherence: p.adherence,
    }));

  const workoutTypeData = workouts.reduce((acc, workout) => {
    const existing = acc.find(item => item.type === workout.workout_type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type: workout.workout_type, count: 1 });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Client not found</h2>
        <p className="text-gray-600 mt-2">The requested client could not be found.</p>
        <button
          onClick={() => navigate('/clients')}
          className="btn btn-primary mt-4"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600 mt-1">{client.email}</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-lg font-semibold">{client.age}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="text-lg font-semibold">{client.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Goal</p>
                <p className="text-lg font-semibold">{client.goal}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
          <div className="space-x-3">
            <button
              onClick={generateWorkoutProgram}
              className="btn btn-secondary"
            >
              Generate Program
            </button>
            <button
              onClick={() => navigate('/clients')}
              className="btn btn-outline"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'workouts', name: 'Workouts' },
              { id: 'metrics', name: 'Metrics' },
              { id: 'progress', name: 'Progress' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-600">Total Workouts</h3>
                  <p className="text-2xl font-bold text-blue-900">{workouts.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-600">Avg Adherence</h3>
                  <p className="text-2xl font-bold text-green-900">
                    {progress.length > 0
                      ? Math.round(progress.reduce((sum, p) => sum + p.adherence, 0) / progress.length)
                      : 0}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-600">Current Weight</h3>
                  <p className="text-2xl font-bold text-purple-900">
                    {metrics.length > 0 ? `${metrics[metrics.length - 1].weight} kg` : 'N/A'}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-orange-600">Body Fat</h3>
                  <p className="text-2xl font-bold text-orange-900">
                    {metrics.length > 0 ? `${metrics[metrics.length - 1].bodyfat}%` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {workouts.slice(0, 5).map((workout) => (
                    <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{workout.workout_type}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(workout.date).toLocaleDateString()} • {workout.duration} min
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">{workout.notes || 'No notes'}</span>
                    </div>
                  ))}
                  {workouts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No workouts logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Workouts Tab */}
          {activeTab === 'workouts' && (
            <div className="space-y-6">
              {/* Workout Types Chart */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Workout Distribution</h3>
                {workoutTypeData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No workout data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workoutTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Workouts List */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Workout History</h3>
                </div>
                {workouts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No workouts logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workouts.map((workout) => (
                          <tr key={workout.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(workout.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {workout.workout_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {workout.duration} min
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {workout.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Body Measurements Chart */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Body Measurements Progress</h3>
                {weightChartData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No metrics data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={weightChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="weight" stroke="#3B82F6" name="Weight (kg)" />
                      <Line type="monotone" dataKey="waist" stroke="#10B981" name="Waist (cm)" />
                      <Line type="monotone" dataKey="bodyfat" stroke="#F59E0B" name="Body Fat (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Metrics Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Metrics History</h3>
                </div>
                {metrics.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No metrics logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Waist
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Body Fat
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.map((metric) => (
                          <tr key={metric.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(metric.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {metric.weight} kg
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {metric.waist} cm
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {metric.bodyfat}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Adherence Chart */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Adherence</h3>
                {progressChartData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No progress data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={progressChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="adherence" fill="#3B82F6" name="Adherence (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Progress Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Progress History</h3>
                </div>
                {progress.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No progress logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Adherence
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {progress.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {p.week}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.adherence}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}