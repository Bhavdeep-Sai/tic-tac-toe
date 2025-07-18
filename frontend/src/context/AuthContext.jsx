import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const token = window.localStorage?.getItem('token');
      const guestMode = window.localStorage?.getItem('guestMode');
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchProfile();
      } else if (guestMode === 'true') {
        // Set guest user
        setIsGuest(true);
        setUser({
          id: 'guest_' + Date.now(),
          username: 'Guest',
          email: null,
          stats: {
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
            currentStreak: 0,
            longestStreak: 0
          }
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
      setIsGuest(false);
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.localStorage?.removeItem('token');
      }
      delete api.defaults.headers.common['Authorization'];
      // Don't show toast on initial load if token is invalid
      if (user) {
        toast.error('Session expired. Please login again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('token', token);
        window.localStorage?.removeItem('guestMode');
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsGuest(false);
      toast.success(`Welcome back, ${user.username}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user } = response.data;
      
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('token', token);
        window.localStorage?.removeItem('guestMode');
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsGuest(false);
      toast.success(`Welcome, ${user.username}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const playAsGuest = () => {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('guestMode', 'true');
    }
    setIsGuest(true);
    setUser({
      id: 'guest_' + Date.now(),
      username: 'Guest',
      email: null,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        currentStreak: 0,
        longestStreak: 0
      }
    });
    toast.success('Playing as guest!');
  };

  const loginAsGuest = () => {
    // Generate a random guest ID and username
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    const guestUser = {
      id: guestId,
      username: `Guest${Math.floor(1000 + Math.random() * 9000)}`,
      isGuest: true,
      stats: { wins: 0, losses: 0, draws: 0 }
    };
    setUser(guestUser);
    setIsGuest(true);
    localStorage.removeItem('token'); // Ensure no token is set
    return true;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('token');
      window.localStorage?.removeItem('guestMode');
    }
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsGuest(false);
    toast.success('Logged out successfully');
  };

  const updateUserStats = (newStats) => {
    if (!isGuest) {
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, ...newStats }
      }));
    } else {
      // For guest users, update local stats only
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, ...newStats }
      }));
    }
  };

  const value = {
    user,
    loading,
    isGuest,
    login,
    register,
    logout,
    playAsGuest,
    loginAsGuest,
    updateUserStats
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};