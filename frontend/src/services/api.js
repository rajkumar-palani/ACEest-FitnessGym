/**
 * API Service Layer
 * Handles all communication with the Flask backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.credentials = null;
  }

  /**
   * Set authentication credentials
   */
  setCredentials(username, password) {
    this.credentials = { username, password };
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.credentials) {
      headers['X-Username'] = this.credentials.username;
      headers['X-Password'] = this.credentials.password;
    }
    return headers;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // ============== AUTHENTICATION ==============

  /**
   * Login with username and password
   */
  async login(username, password) {
    const response = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: {
        'X-Username': undefined,
        'X-Password': undefined,
      },
    });
    this.setCredentials(username, password);
    return response;
  }

  // ============== CLIENT ENDPOINTS ==============

  /**
   * Get all clients
   */
  async getClients() {
    return this.request('/api/clients', { method: 'GET' });
  }

  /**
   * Get specific client
   */
  async getClient(clientId) {
    return this.request(`/api/clients/${clientId}`, { method: 'GET' });
  }

  /**
   * Create new client
   */
  async createClient(clientData) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Update client
   */
  async updateClient(clientId, clientData) {
    return this.request(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Delete client
   */
  async deleteClient(clientId) {
    return this.request(`/api/clients/${clientId}`, { method: 'DELETE' });
  }

  // ============== WORKOUT ENDPOINTS ==============

  /**
   * Get all workouts or filter by client
   */
  async getWorkouts(clientName = null) {
    const endpoint = clientName
      ? `/api/workouts?client_name=${encodeURIComponent(clientName)}`
      : '/api/workouts';
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Get specific workout
   */
  async getWorkout(workoutId) {
    return this.request(`/api/workouts/${workoutId}`, { method: 'GET' });
  }

  /**
   * Create new workout
   */
  async createWorkout(workoutData) {
    return this.request('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(workoutData),
    });
  }

  /**
   * Update workout
   */
  async updateWorkout(workoutId, workoutData) {
    return this.request(`/api/workouts/${workoutId}`, {
      method: 'PUT',
      body: JSON.stringify(workoutData),
    });
  }

  /**
   * Delete workout
   */
  async deleteWorkout(workoutId) {
    return this.request(`/api/workouts/${workoutId}`, { method: 'DELETE' });
  }

  // ============== METRICS ENDPOINTS ==============

  /**
   * Get all metrics or filter by client
   */
  async getMetrics(clientName = null) {
    const endpoint = clientName
      ? `/api/metrics?client_name=${encodeURIComponent(clientName)}`
      : '/api/metrics';
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Create new metric
   */
  async createMetric(metricData) {
    return this.request('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(metricData),
    });
  }

  // ============== PROGRESS ENDPOINTS ==============

  /**
   * Get progress data or filter by client
   */
  async getProgress(clientName = null) {
    const endpoint = clientName
      ? `/api/progress?client_name=${encodeURIComponent(clientName)}`
      : '/api/progress';
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Create progress entry
   */
  async createProgress(progressData) {
    return this.request('/api/progress', {
      method: 'POST',
      body: JSON.stringify(progressData),
    });
  }

  // ============== PROGRAM GENERATOR ==============

  /**
   * Generate program for client
   */
  async generateProgram(clientId) {
    return this.request(`/api/generate-program/${clientId}`, {
      method: 'POST',
    });
  }

  // ============== HEALTH CHECK ==============

  /**
   * Check API health
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export default new APIClient(API_BASE_URL);
