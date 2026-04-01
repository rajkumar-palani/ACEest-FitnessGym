import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function ClientListPage() {
  const { showToast } = useApp();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    program: '',
    calories: '',
    target_weight: '',
    target_adherence: '',
    membership_status: 'Active',
    membership_end: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      showToast('Failed to load clients', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      height: '',
      weight: '',
      program: '',
      calories: '',
      target_weight: '',
      target_adherence: '',
      membership_status: 'Active',
      membership_end: '',
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formData);
        showToast('Client updated successfully', 'success');
      } else {
        await api.createClient(formData);
        showToast('Client created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Failed to save client:', error);
      showToast(error.message || 'Failed to save client', 'danger');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      age: client.age || '',
      height: client.height || '',
      weight: client.weight || '',
      program: client.program || '',
      calories: client.calories || '',
      target_weight: client.target_weight || '',
      target_adherence: client.target_adherence || '',
      membership_status: client.membership_status || 'Active',
      membership_end: client.membership_end || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await api.deleteClient(clientId);
      showToast('Client deleted successfully', 'success');
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      showToast('Failed to delete client', 'danger');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      Active: 'badge-success',
      Inactive: 'badge-danger',
      Pending: 'badge-warning',
    };
    return colors[status] || 'badge-primary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your gym members</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          Add New Client
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No clients found. Add your first client to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <Link
                          to={`/clients/${client.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {client.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.age}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.weight} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.program || 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusBadge(client.membership_status)}`}>
                        {client.membership_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
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
        <ClientModal
          client={editingClient}
          formData={formData}
          setFormData={setFormData}
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

function ClientModal({ client, formData, setFormData, onSubmit, onClose }) {
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
            {client ? 'Edit Client' : 'Add New Client'}
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Height (m)</label>
                <input
                  type="number"
                  step="0.01"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="input"
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
                />
              </div>

              <div>
                <label className="label">Program</label>
                <input
                  type="text"
                  name="program"
                  value={formData.program}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Daily Calories</label>
                <input
                  type="number"
                  name="calories"
                  value={formData.calories}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="target_weight"
                  value={formData.target_weight}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Target Adherence (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="target_adherence"
                  value={formData.target_adherence}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Membership Status</label>
                <select
                  name="membership_status"
                  value={formData.membership_status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="label">Membership End Date</label>
                <input
                  type="date"
                  name="membership_end"
                  value={formData.membership_end}
                  onChange={handleChange}
                  className="input"
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
                {client ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}