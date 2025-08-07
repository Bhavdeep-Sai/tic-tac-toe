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
      case 1: return (
        <div className="flex items-center justify-center h-full">
          <svg className="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M24 10L32 24L40 10" stroke="#B22222" strokeWidth="7" />
            <circle cx="32" cy="32" r="14" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
            <text x="32" y="38" textAnchor="middle" fontSize="16" fill="#000" fontWeight="bold">1</text>
          </svg>
        </div>
      );
      case 2: return (
        <div className="flex items-center justify-center h-full">
          <svg className="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M24 10L32 24L40 10" stroke="#4682B4" strokeWidth="7" />
            <circle cx="32" cy="32" r="14" fill="#C0C0C0" stroke="#808080" strokeWidth="2" />
            <text x="32" y="38" textAnchor="middle" fontSize="16" fill="#000" fontWeight="bold">2</text>
          </svg>
        </div>
      );
      case 3: return (
        <div className="flex items-center justify-center h-full ">
          <svg className="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M24 10L32 24L40 10" stroke="#A0522D" strokeWidth="7" />
            <circle cx="32" cy="32" r="14" fill="#CD7F32" stroke="#8B4513" strokeWidth="2" />
            <text x="32" y="38" textAnchor="middle" fontSize="16" fill="#000" fontWeight="bold">3</text>
          </svg>
        </div>
      );
      default: return (
        <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
          <span className="text-sm font-semibold text-gray-700">#{rank}</span>
        </div>
      );
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
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="animate-pulse">
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-6"></div>
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-xl">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
                    </div>
                    <div className="w-12 sm:w-16 h-4 bg-gray-200 rounded flex-shrink-0"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-red-600 text-sm sm:text-base">Error loading leaderboard</span>
                <p className="text-red-600 mt-1 text-sm break-words">{error}</p>
                <button
                  onClick={fetchLeaderboard}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Top players ranked by {getFilterLabel(filter).toLowerCase()}
                </p>
              </div>

              {/* Filters */}
              <div className="flex justify-center lg:justify-end">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base"
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
            <div className="p-4 sm:p-6 flex flex-col md:flex-row bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex flex-col md:flex-row w-full md:w-1/2 items-center justify-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm sm:text-base">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Your Rank</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{user.username}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center justify-end mb-1">
                    {getRankIcon(currentUserRank)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    {getStatValue(leaderboardData[currentUserRank - 1], filter)}
                  </div>
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="p-4 sm:p-6 w-full md:w-1/2">
                {leaderboardData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="text-gray-500 text-lg mb-2">No players found</div>
                    <p className="text-gray-400">Be the first to play and appear on the leaderboard!</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {leaderboardData.map((player, index) => {
                      const rank = index + 1;
                      const isCurrentUser = player._id === user?.id;
                      const isTopThree = rank <= 3;

                      return (
                        <div
                          key={player._id}
                          className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border-2 transition-all ${isCurrentUser
                            ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50'
                            : isTopThree
                              ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {/* Rank */}
                          <div className="flex-shrink-0 w-12 sm:w-16 flex justify-center">
                            {getRankIcon(rank)}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                              <h3 className="text-gray-900 truncate text-sm sm:text-base font-bold">
                                {player.username}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                                {isCurrentUser && (
                                  <span className="bg-blue-100  text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                    You
                                  </span>
                                )}
                                {isTopThree && !isCurrentUser && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-sm border-2 font-medium">
                                    Top {rank}
                                  </span>
                                )}
                                {player.isOnline && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-600 font-medium">Online</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <span className="font-medium">W:</span>
                                <span>{player.stats.wins}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <span className="font-medium">L:</span>
                                <span>{player.stats.losses}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <span className="font-medium">D:</span>
                                <span>{player.stats.draws}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <span className="font-medium">Rate:</span>
                                <span>{player.stats.winRate}%</span>
                              </span>
                              {player.stats.currentStreak > 0 && (
                                <span className="flex items-center space-x-1 text-green-600 font-medium">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                  </svg>
                                  <span>{player.stats.currentStreak}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Main Stat */}
                          <div className="flex-shrink-0 text-right">
                            <div className={`text-lg sm:text-2xl font-bold ${isTopThree ? 'text-yellow-600' : 'text-gray-900'}`}>
                              {getStatValue(player, filter)}
                            </div>
                            <div className="text-xs text-gray-500 hidden sm:block">
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
                  <div className="mt-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">Note:</span> Win rates marked with * indicate players with fewer than 5 games played.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Leaderboard;