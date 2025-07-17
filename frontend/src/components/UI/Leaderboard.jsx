import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('overall');

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const token = localStorage.getItem('token');
      const { data } = await api.get(`/leaderboard?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }
  
      setLeaderboardData(data.leaderboard || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getFilterLabel = (filterType) => {
    switch (filterType) {
      case 'overall': return 'Overall Rating';
      case 'wins': return 'Total Wins';
      case 'winRate': return 'Win Rate';
      case 'streak': return 'Current Streak';
      default: return 'Overall';
    }
  };

  const getStatValue = (player, filterType) => {
    switch (filterType) {
      case 'wins':
        return player.stats.wins;
      case 'winRate':
        return player.stats.totalGames >= 5 ? `${player.stats.winRate}%` : `${player.stats.winRate}%*`;
      case 'streak':
        return player.stats.currentStreak;
      default:
        return player.stats.overallRating;
    }
  };

  const currentUserRank = leaderboardData.findIndex(
    (player) => player._id === user?.id
  ) + 1;


  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error loading leaderboard</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
              <p className="text-gray-600">
                Top players ranked by {getFilterLabel(filter).toLowerCase()}
              </p>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="overall">Overall Rating</option>
                <option value="wins">Total Wins</option>
                <option value="winRate">Win Rate</option>
                <option value="streak">Current Streak</option>
              </select>
              
            </div>
          </div>
        </div>

        {/* Current User Rank */}
        {user && currentUserRank > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Your Rank</p>
                  <p className="text-sm text-gray-600">{user.username}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {getRankIcon(currentUserRank)}
                </div>
                <div className="text-sm text-gray-600">
                  {getStatValue(leaderboardData[currentUserRank - 1], filter)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="p-6">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">No players found</div>
              <p className="text-gray-400 mt-2">Be the first to play and appear on the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboardData.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player._id === user?.id;
                const isTopThree = rank <= 3;
                
                return (
                  <div
                    key={player._id}
                    className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all ${
                      isCurrentUser 
                        ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50' 
                        : isTopThree
                        ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className={`text-2xl font-bold ${isTopThree ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {getRankIcon(rank)}
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                          : isTopThree
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gray-600'
                      }`}>
                        {player.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {player.username}
                        </h3>
                        {isCurrentUser && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                        {isTopThree && !isCurrentUser && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Top {rank}
                          </span>
                        )}
                        {player.isOnline && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">Online</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>W: {player.stats.wins}</span>
                        <span>L: {player.stats.losses}</span>
                        <span>D: {player.stats.draws}</span>
                        <span>Rate: {player.stats.winRate}%</span>
                        {player.stats.currentStreak > 0 && (
                          <span className="text-green-600 font-medium">
                            🔥 {player.stats.currentStreak}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Main Stat */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-2xl font-bold ${isTopThree ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {getStatValue(player, filter)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getFilterLabel(filter)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Win Rate Note */}
          {filter === 'winRate' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Note:</span> Win rates marked with * indicate players with fewer than 5 games played.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;