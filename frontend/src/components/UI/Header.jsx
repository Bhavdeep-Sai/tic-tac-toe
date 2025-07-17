import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const { isConnected, game, leaveGame } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    try {
      // Leave game first if in a game
      if (game && game.gameStatus !== 'finished') {
        leaveGame();
      }
      
      // Then logout
      logout();
      setShowUserMenu(false);
      setShowMobileMenu(false);
      
      // Navigate to login
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNavigation = (path) => {
    try {
      setShowMobileMenu(false);
      setShowUserMenu(false);
      
      // Don't navigate if already on the same path
      if (location.pathname === path) {
        return;
      }
      
      navigate(path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation('/')}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">TicTacToe Pro</h1>
            </div>
            
            {/* Navigation Links - Desktop */}
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => handleNavigation('/')}
                className={`font-medium transition-colors ${
                  isActive('/') || isActive('/') 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Play
              </button>
              <button
                onClick={() => handleNavigation('/leaderboard')}
                className={`font-medium transition-colors ${
                  isActive('/leaderboard') 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Leaderboard
              </button>
            </nav>
          </div>

          {/* Center - Game Status */}
          {game && (
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {game.gameStatus === 'waiting' ? 'Waiting for opponent' : 
                   game.gameStatus === 'playing' ? 'In Game' : 'Game Finished'}
                </span>
              </div>
              
              {game.gameStatus === 'playing' && game.roomId && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Room:</span>
                  <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {game.roomId}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 hidden sm:block">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* User Profile */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-2 transition-colors"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="font-medium text-gray-700 hidden sm:block">
                    {user.username || 'User'}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transform transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user.username || 'User'}</p>
                      {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
                    </div>
                    
                    {/* User Stats */}
                    {user.stats && (
                      <div className="px-4 py-2 border-b">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{user.stats.wins || 0}</div>
                            <div className="text-gray-500">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-red-600">{user.stats.losses || 0}</div>
                            <div className="text-gray-500">Losses</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{user.stats.draws || 0}</div>
                            <div className="text-gray-500">Draws</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleNavigation('/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-expanded={showMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <div className="md:hidden bg-gray-50 border-t">
          <nav className="px-4 py-2 space-y-1">
            <button
              onClick={() => handleNavigation('/')}
              className={`block w-full text-left py-2 font-medium ${
                isActive('/') || isActive('/') 
                  ? 'text-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Play
            </button>
            <button
              onClick={() => handleNavigation('/leaderboard')}
              className={`block w-full text-left py-2 font-medium ${
                isActive('/leaderboard') 
                  ? 'text-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Leaderboard
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;