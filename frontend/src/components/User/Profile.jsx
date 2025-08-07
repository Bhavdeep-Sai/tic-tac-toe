import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Trophy, TrendingUp, Clock, Target, Settings, Save, X, Eye, EyeOff } from 'lucide-react';
import api from '../../utils/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fixed API calls with better error handling
  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
      setFormData({
        username: response.data.username || '',
        email: response.data.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      return true;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      
      // Handle different types of errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        setErrors({ general: 'Unable to connect to server. Please check your internet connection.' });
      } else if (error.response?.status === 401) {
        setErrors({ general: 'Session expired. Please login again.' });
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to load user data' });
      }
      return false;
    }
  };

  const fetchGameStats = async () => {
    try {
      const response = await api.get('/game/stats/overview');
      console.log('Full game stats response:', response.data); // Keep this temporarily for debugging
      setGameStats(response.data);
      return true;
    } catch (error) {
      console.error('Failed to fetch game stats:', error);
      
      // Set default stats and don't treat this as a critical error
      setGameStats({
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winsByBoardSize: { 3: 0, 4: 0, 5: 0 },
        averageGameDuration: 0,
        longestGame: 0,
        shortestGame: 0,
        recentGames: []
      });
      
      // Only show error if it's not a network issue
      if (error.code !== 'NETWORK_ERROR' && error.code !== 'ECONNABORTED') {
        console.warn('Game stats could not be loaded, using defaults');
      }
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Try to fetch user data first - this is critical
      const userSuccess = await fetchUserData();
      
      if (userSuccess) {
        // Only fetch game stats if user data was successful
        await fetchGameStats();
      }
      
      setLoading(false);
    };
    loadData();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (updateMessage) {
      const timer = setTimeout(() => {
        setUpdateMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateMessage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      newErrors.username = 'Username must not exceed 20 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await api.put('/auth/update-profile', updateData);

      if (response.data) {
        setUser(prev => ({
          ...prev,
          username: formData.username,
          email: formData.email
        }));
        setUpdateMessage('Profile updated successfully!');
        setIsEditing(false);
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setErrors({});
      }
    } catch (error) {
      setErrors({
        general: error.response?.data?.error || 'Failed to update profile'
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setUpdateMessage('');
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWinRate = () => {
    if (!gameStats || gameStats.totalGames === 0) return 0;
    return ((gameStats.wins / gameStats.totalGames) * 100).toFixed(1);
  };

  // Safe access to user stats with defaults
  const getUserStats = () => {
    return user?.stats || {
      currentStreak: 0,
      longestStreak: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-transparent border-r-blue-400 mx-auto animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md mx-auto border border-gray-100">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Loading Your Profile</h3>
            <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch your game statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100">
            <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <X className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Unable to Load Profile</h3>
            <p className="text-red-600 mb-6 text-sm sm:text-base">We couldn't load your profile data. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userStats = getUserStats();

  return (
    <div className="min-h-screenpy-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* User Info Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full p-4 shadow-lg">
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                {/* Online Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse border-white ${user.isOnline ? 'bg-green-500' : 'bg-red-400'
                  }`}></div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                  {user.username}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mb-1 flex items-center justify-center sm:justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  {user.email}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center justify-center sm:justify-start">
                  <Clock className="h-4 w-4 mr-1" />
                  Member since {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            {/* Status and Actions Section */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm ${user.isOnline
                ? 'bg-green-100 text-green-800 border border-green-800'
                : 'bg-gray-100  text-gray-800 border border-gray-800'
                }`}>
                {user.isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Update Message */}
        {updateMessage && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-4 sm:px-6 py-4 rounded-xl mb-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-500 rounded-full p-1 mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <span className="font-medium">{updateMessage}</span>
            </div>
            <button
              onClick={() => setUpdateMessage('')}
              className="text-green-700 hover:text-green-900 transition-colors p-1 hover:bg-green-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h2>
            </div>

            <div className="space-y-6">
              {errors.general && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800 px-4 sm:px-6 py-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-red-500 rounded-full p-1 mr-3">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">{errors.general}</span>
                  </div>
                  <button
                    onClick={() => setErrors(prev => ({ ...prev, general: '' }))}
                    className="text-red-700 hover:text-red-900 transition-colors p-1 hover:bg-red-100 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.username ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Enter your username"
                    />
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" />
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-blue-600" />
                  Change Password <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.currentPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" />
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="New password"
                    />
                    {errors.newPassword && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" />
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Confirm new password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                >
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 font-medium border border-gray-300"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Games</p>
                <p className="text-3xl font-bold text-gray-900">{gameStats?.totalGames || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-green-600">{getWinRate()}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {gameStats?.wins || 0} of {gameStats?.totalGames || 0} games
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">{userStats.currentStreak}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Best: {userStats.longestStreak || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Game Statistics */}
          {gameStats && (
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Game Statistics</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">Wins</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">{gameStats.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">Losses</span>
                  </div>
                  <span className="font-bold text-red-600 text-lg">{gameStats.losses || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">Draws</span>
                  </div>
                  <span className="font-bold text-yellow-600 text-lg">{gameStats.draws || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">Current Streak</span>
                  </div>
                  <span className="font-bold text-orange-600 text-lg">{userStats.currentStreak || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">Longest Streak</span>
                  </div>
                  <span className="font-bold text-purple-600 text-lg">{userStats.longestStreak || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Games */}
          <div className="bg-white relative rounded-xl h-150 overflow-auto shadow-lg p-6 sm:p-8 border border-gray-100 scrollable" style={{ paddingTop: '10px' }}>
            <div className="flex sticky z-10 bg-white h-15 -top-[10px] items-center mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Recent Games</h3>
            </div>

            <div className="space-y-4">
              {gameStats?.recentGames?.length > 0 ? (
                gameStats.recentGames.map((game, index) => {
                  const currentUsername = user?.username;
                  let displayOpponent = 'Unknown Opponent';
                  let displayResult = game.result || 'unknown';

                  // Try to get opponent name from enhanced game details first
                  if (game.gameDetails?.players?.length === 2) {
                    const opponentPlayer = game.gameDetails.players.find(p => p.username !== currentUsername);
                    if (opponentPlayer?.username) {
                      displayOpponent = opponentPlayer.username;
                    }
                  }

                  // Fallback to the direct opponent field
                  if (displayOpponent === 'Unknown Opponent' && game.opponent) {
                    displayOpponent = game.opponent;
                  }

                  return (
                    <div key={game.roomId || index} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border-2 border-gray-300  duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <p className="font-semibold text-lg text-gray-900">vs {displayOpponent}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                              {game.gameDetails?.currentUserSymbol && (
                                <span className="text-xs hidden lg:block bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">
                                  You: {game.gameDetails.currentUserSymbol}
                                </span>
                              )}
                              <div className="flex flex-row lg:flex-col gap-2 justify-center items-center lg:items-end">
                                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${displayResult === 'win' ? 'bg-green-100 border-2 text-green-800' :
                                  displayResult === 'loss' ? 'bg-red-100 border-2 text-red-800' :
                                    displayResult === 'draw' ? 'bg-yellow-100 border-2 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                  }`}>
                                  {displayResult === 'win' ? ' WON' :
                                    displayResult === 'loss' ? ' LOST' :
                                      displayResult === 'draw' ? ' DRAW' : '❓ UNKNOWN'}
                                </span>
                                <p className="text-sm text-gray-500 flex items-center justify-end">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDuration(game.duration)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Target className="h-4 w-4 mr-1" />
                            <span>{game.boardSize || 3}×{game.boardSize || 3}</span>
                            <span className="mx-2">•</span>
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{formatDate(game.createdAt)}</span>
                          </div>

                          {game.gameDetails?.moves > 0 && (
                            <div className="flex items-center text-xs text-gray-500">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                              <span>{game.gameDetails.moves} moves</span>
                              {game.gameDetails?.gameEndReason === 'forfeit' && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-red-500">Forfeit</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>


                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Target className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-lg mb-2">No recent games</p>
                  <p className="text-sm text-gray-400">Start playing to see your game history!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;