import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function WorkoutPage() {
  const { showToast } = useApp();
  const [workouts, setWorkouts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    workout_type: '',
    duration_min: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workoutsData, clientsData] = await Promise.all([
        api.getWorkouts(),
        api.getClients(),
      ]);
      setWorkouts(workoutsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load workout data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      date: new Date().toISOString().split('T')[0],
      workout_type: '',
      duration_min: '',
      notes: '',
    });
    setEditingWorkout(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingWorkout) {
        await api.updateWorkout(editingWorkout.id, formData);
        showToast('Workout updated successfully', 'success');
      } else {
        await api.createWorkout(formData);
        showToast('Workout logged successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save workout:', error);
      showToast(error.message || 'Failed to save workout', 'danger');
    }
  };

  const handleEdit = (workout) => {
    setEditingWorkout(workout);
    setFormData({
      client_name: workout.client_name || '',
      date: workout.date || '',
      workout_type: workout.workout_type || '',
      duration_min: workout.duration_min || '',
      notes: workout.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (workoutId) => {
    if (!window.confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    try {
      await api.deleteWorkout(workoutId);
      showToast('Workout deleted successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Failed to delete workout:', error);
      showToast('Failed to delete workout', 'danger');
    }
  };

  const filteredWorkouts = selectedClient
    ? workouts.filter(workout => workout.client_name === selectedClient)
    : workouts;

  const workoutTypes = [
    'Strength Training',
    'Cardio',
    'HIIT',
    'Yoga',
    'Pilates',
    'CrossFit',
    'Swimming',
    'Running',
    'Cycling',
    'Other',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-600">Log and track workout sessions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          Log New Workout
        </button>
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

      {/* Workouts List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading workouts...</p>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {selectedClient
                ? `No workouts found for ${selectedClient}.`
                : 'No workouts logged yet. Add your first workout to get started.'
              }
            </p>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkouts.map((workout) => (
                  <tr key={workout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {workout.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(workout.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {workout.workout_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {workout.duration_min} min
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {workout.notes || 'No notes'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(workout)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(workout.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <WorkoutModal
          workout={editingWorkout}
          formData={formData}
          setFormData={setFormData}
          clients={clients}
          workoutTypes={workoutTypes}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        />
      )}
    </div>
  );
}

function WorkoutModal({ workout, formData, setFormData, clients, workoutTypes, onSubmit, onClose }) {
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {workout ? 'Edit Workout' : 'Log New Workout'}
          </h3>

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
                <label className="label">Workout Type *</label>
                <select
                  name="workout_type"
                  value={formData.workout_type}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select workout type</option>
                  {workoutTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration_min"
                  value={formData.duration_min}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 60"
                />
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Any additional notes about the workout..."
              />
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
                {workout ? 'Update Workout' : 'Log Workout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}