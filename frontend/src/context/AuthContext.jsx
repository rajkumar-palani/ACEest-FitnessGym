import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedCredentials = sessionStorage.getItem('credentials');

    if (storedUser && storedCredentials) {
      try {
        const credentials = JSON.parse(storedCredentials);
        api.setCredentials(credentials.username, credentials.password);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to restore session:', err);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('credentials');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(username, password);

      const userData = {
        username: response.username,
        role: response.role,
      };

      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem(
        'credentials',
        JSON.stringify({ username, password })
      );

      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('credentials');
    setUser(null);
    api.setCredentials(null, null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
