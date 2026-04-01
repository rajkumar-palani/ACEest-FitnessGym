import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function MetricsPage() {
  const { showToast } = useApp();
  const [metrics, setMetrics] = useState([]);
  const [progress, setProgress] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('');
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [metricFormData, setMetricFormData] = useState({
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    weight: '',
    waist: '',
    bodyfat: '',
  });
  const [progressFormData, setProgressFormData] = useState({
    client_name: '',
    week: '',
    adherence: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, progressData, clientsData] = await Promise.all([
        api.getMetrics(),
        api.getProgress(),
        api.getClients(),
      ]);
      setMetrics(metricsData);
      setProgress(progressData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load metrics data:', error);
      showToast('Failed to load metrics data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const resetMetricForm = () => {
    setMetricFormData({
      client_name: '',
      date: new Date().toISOString().split('T')[0],
      weight: '',
      waist: '',
      bodyfat: '',
    });
  };

  const resetProgressForm = () => {
    setProgressFormData({
      client_name: '',
      week: '',
      adherence: '',
    });
  };

  const handleMetricSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createMetric(metricFormData);
      showToast('Metrics logged successfully', 'success');
      setShowMetricModal(false);
      resetMetricForm();
      loadData();
    } catch (error) {
      console.error('Failed to save metrics:', error);
      showToast(error.message || 'Failed to save metrics', 'danger');
    }
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createProgress(progressFormData);
      showToast('Progress logged successfully', 'success');
      setShowProgressModal(false);
      resetProgressForm();
      loadData();
    } catch (error) {
      console.error('Failed to save progress:', error);
      showToast(error.message || 'Failed to save progress', 'danger');
    }
  };

  const filteredMetrics = selectedClient
    ? metrics.filter(metric => metric.client_name === selectedClient)
    : metrics;

  const filteredProgress = selectedClient
    ? progress.filter(p => p.client_name === selectedClient)
    : progress;

  // Prepare chart data
  const weightChartData = filteredMetrics
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(metric => ({
      date: new Date(metric.date).toLocaleDateString(),
      weight: metric.weight,
      waist: metric.waist,
      bodyfat: metric.bodyfat,
    }));

  const progressChartData = filteredProgress
    .sort((a, b) => a.id - b.id)
    .map(p => ({
      week: p.week,
      adherence: p.adherence,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metrics & Progress</h1>
          <p className="text-gray-600">Track body measurements and adherence</p>
        </div>
        <div className="space-x-3">
          <button
            onClick={() => {
              resetProgressForm();
              setShowProgressModal(true);
            }}
            className="btn btn-secondary"
          >
            Log Progress
          </button>
          <button
            onClick={() => {
              resetMetricForm();
              setShowMetricModal(true);
            }}
            className="btn btn-primary"
          >
            Log Metrics
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.name}>
                {client.name}
              </option>
            ))}
          </select>
          {selectedClient && (
            <button
              onClick={() => setSelectedClient('')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Progress Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Body Measurements</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : weightChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No metrics data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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

        {/* Adherence Progress Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Adherence</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : progressChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No progress data available
            </div>
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
      </div>

      {/* Recent Metrics Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Metrics</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No metrics logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
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
                {filteredMetrics.slice(0, 10).map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

      {/* Metric Modal */}
      {showMetricModal && (
        <MetricModal
          formData={metricFormData}
          setFormData={setMetricFormData}
          clients={clients}
          onSubmit={handleMetricSubmit}
          onClose={() => {
            setShowMetricModal(false);
            resetMetricForm();
          }}
        />
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <ProgressModal
          formData={progressFormData}
          setFormData={setProgressFormData}
          clients={clients}
          onSubmit={handleProgressSubmit}
          onClose={() => {
            setShowProgressModal(false);
            resetProgressForm();
          }}
        />
      )}
    </div>
  );
}

function MetricModal({ formData, setFormData, clients, onSubmit, onClose }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Log Body Metrics</h3>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Client *</label>
                <select
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 75.5"
                />
              </div>

              <div>
                <label className="label">Waist (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="waist"
                  value={formData.waist}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 85.0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="bodyfat"
                  value={formData.bodyfat}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 15.5"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Log Metrics
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ formData, setFormData, clients, onSubmit, onClose }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Log Weekly Progress</h3>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Client *</label>
                <select
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Week *</label>
                <input
                  type="text"
                  name="week"
                  value={formData.week}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Week 1, Jan 1-7"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Adherence (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="adherence"
                  value={formData.adherence}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 85"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Percentage of planned workouts completed this week
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Log Progress
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}