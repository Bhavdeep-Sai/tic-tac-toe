import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const Matchmaking = () => {
  const { user, validateToken, logout } = useAuth();
  const navigate = useNavigate();
  const {
    findMatch,
    cancelMatchmaking,
    createRoom,
    joinRoom,
    leaveGame,
    isInQueue,
    queuePosition,
    game,
    inviteCode,
    isConnected,
    authError
  } = useGame();

  const [selectedBoardSize, setSelectedBoardSize] = useState(3);
  const [gameMode, setGameMode] = useState('matchmaking'); // matchmaking, private, join
  const [inputInviteCode, setInputInviteCode] = useState('');
  const [notification, setNotification] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Auto-connect logic when component mounts
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (autoConnectAttempted) return;
      
      setAutoConnectAttempted(true);
      
      // Check if user data is stored in localStorage
      const token = localStorage.getItem('token');
      if (token && !user) {
        showNotification('Auto-connecting to server...', 'info');
        
        try {
          const result = await validateToken();
          if (!result.success) {
            console.log('Token validation failed:', result.error);
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
              logout();
              navigate('/login');
            }, 2000);
            return;
          }
          console.log('Auto-connect successful! User:', result.user);
          showNotification('Successfully connected!', 'success');
        } catch (error) {
          console.error('Auto-connect failed:', error);
          showNotification('Connection failed. Please login again.', 'error');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
        }
      } else if (!token && !user) {
        console.log('No token found, redirecting to login...');
        navigate('/login');
      }
    };

    attemptAutoConnect();
  }, [user, validateToken, logout, navigate, autoConnectAttempted]);

  // Handle authentication errors from socket
  useEffect(() => {
    if (authError) {
      showNotification('Authentication failed. Please login again.', 'error');
      logout();
      navigate('/login');
    }
  }, [authError, logout, navigate]);

  // Auto-redirect to game when ready
  useEffect(() => {
    if (game && (game.gameStatus === 'playing' || game.gameStatus === 'waiting')) {
      navigate('/game');
    }
  }, [game, navigate]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFindMatch = () => {
    if (isConnected) {
      findMatch(selectedBoardSize);
      showNotification('Looking for opponent...', 'info');
    } else {
      showNotification('Please check your connection', 'error');
    }
  };

  const handleCancelMatchmaking = () => {
    cancelMatchmaking();
    showNotification('Matchmaking cancelled', 'info');
  };

  const handleCreatePrivateRoom = () => {
    if (!isConnected) {
      showNotification('Please check your connection', 'error');
      return;
    }

    setIsCreatingRoom(true);
    createRoom(selectedBoardSize, true);
    showNotification('Creating private room...', 'info');

    // Reset loading state after a reasonable time
    setTimeout(() => {
      setIsCreatingRoom(false);
    }, 3000);
  };

  const handleJoinPrivateRoom = async () => {
    if (!inputInviteCode.trim()) {
      showNotification('Please enter an invite code', 'error');
      return;
    }

    if (!isConnected) {
      showNotification('Please check your connection', 'error');
      return;
    }

    setIsJoiningRoom(true);

    try {
      const response = await api.post('/game/join-private', {
        inviteCode: inputInviteCode.trim().toUpperCase()
      });
      if (response.data && response.data.roomId) {
        joinRoom(response.data.roomId);
        showNotification('Joining room...', 'info');
      } else {
        showNotification('Room not found', 'error');
      }
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to join private room', 'error');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      showNotification('Invite code copied to clipboard!', 'success');
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Invite code copied to clipboard!', 'success');
    }
  };

  const handleManualReconnect = () => {
    window.location.reload();
  };

  const getBoardSizeLabel = (size) => {
    return `${size}x${size}`;
  };

  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      leaveGame();
    }
  };

  // If already in a game, show game info with navigation
  if (game) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Game Active</h2>
            <p className="text-gray-600 mb-4">
              {game.gameStatus === 'playing'
                ? "Game is in progress! Click below to continue playing."
                : "Waiting for another player to join..."}
            </p>
            <div className="space-y-2 mb-6">
              <p><strong>Board Size:</strong> {getBoardSizeLabel(game.boardSize)}</p>
              <p><strong>Status:</strong> {game.gameStatus}</p>
              <p><strong>Players:</strong> {game.players?.length || 0}/2</p>
              {inviteCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 mb-2">Share this code with your friend:</p>
                  <div className="flex items-center justify-center space-x-2">
                    <code className="bg-white px-3 py-1 rounded border text-sm font-mono">
                      {inviteCode}
                    </code>
                    <button
                      onClick={copyInviteCode}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/game')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                {game.gameStatus === 'playing' ? 'Continue Game' : 'Go to Game Room'}
              </button>
              <button
                onClick={handleLeaveGame}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-0">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Find a Game</h1>
        <p className="text-gray-300">Choose your preferred way to play</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 rounded-lg p-4 ${notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={notification.type === 'success' ? "M5 13l4 4L19 7" :
                  notification.type === 'error' ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" :
                    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && user && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Connection Lost</span>
          </div>
          <p className="text-red-600 mt-1">
            Unable to connect to server 
          </p>
          <p className="text-red-500 text-sm">
            User: {user.username} (ID: {user.id || 'undefined'})
          </p>
          <button
            onClick={handleManualReconnect}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Connected Status */}
      {isConnected && user && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Connected to Server</span>
          </div>
        </div>
      )}

      {/* Board Size Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Board Size</h2>
        <div className="grid grid-cols-3 gap-4">
          {[3, 4, 5].map((size) => (
            <button
              key={size}
              onClick={() => setSelectedBoardSize(size)}
              className={`p-2 lg:p-4 rounded-lg border-2 transition-all ${selectedBoardSize === size
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <div className="lg:text-2xl font-bold">{getBoardSizeLabel(size)}</div>
              <div className="text-sm text-gray-600 mt-1">
                {size === 3 ? 'Classic' : size === 4 ? 'Medium' : 'Large'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Game Mode Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-2 item-center justify-center m-auto lg:flex-row space-x-1 mb-6">
          {[
            { key: 'matchmaking', label: 'Quick Match' },
            { key: 'private', label: 'Private Room' },
            { key: 'join', label: 'Join Private Room' }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setGameMode(mode.key)}
              className={`flex-1 py-3 px-4 text-center  font-medium rounded-lg transition-all ${gameMode === mode.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Quick Match */}
        {gameMode === 'matchmaking' && (
          <div className="text-center">
            {!isInQueue ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Find a random opponent for a {getBoardSizeLabel(selectedBoardSize)} game
                </p>
                <button
                  onClick={handleFindMatch}
                  disabled={!isConnected}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-all"
                >
                  Find Match
                </button>
              </div>
            ) : (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-700 mb-2">Looking for opponent...</p>
                {queuePosition > 0 && (
                  <p className="text-gray-600 mb-4">Queue position: {queuePosition}</p>
                )}
                <button
                  onClick={handleCancelMatchmaking}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Private Room */}
        {gameMode === 'private' && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Create a private room and invite friends
            </p>

            <button
              onClick={handleCreatePrivateRoom}
              disabled={!isConnected || isCreatingRoom}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-all"
            >
              {isCreatingRoom ? 'Creating Room...' : 'Create Private Room'}
            </button>

            {isCreatingRoom && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Setting up your private room...</p>
              </div>
            )}
          </div>
        )}

        {/* Join Private Room */}
        {gameMode === 'join' && (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Join with Invite Code</h3>
            <p className="text-gray-600 mb-4">
              Enter the invite code your friend shared with you
            </p>
            <div className="flex lg:flex-row flex-col justify-center space-x-4 mb-4">
              <input
                type="text"
                value={inputInviteCode}
                onChange={(e) => setInputInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="w-full lg:w-1/4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
                maxLength={8}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinPrivateRoom();
                  }
                }}
              />
              <div className='flex justify-end lg:block mt-2 lg:mt-0'>
                <button
                  onClick={handleJoinPrivateRoom}
                  disabled={!inputInviteCode.trim() || !isConnected || isJoiningRoom}
                  className="w-3/5 lg:w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-all"
                >
                  {isJoiningRoom ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </div>

            {isJoiningRoom && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Connecting to room...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm">
          {gameMode === 'matchmaking' && 'Find a random opponent and start playing immediately'}
          {gameMode === 'private' && 'Create a private room to play with friends'}
          {gameMode === 'join' && 'Join a friend\'s private room using their invite code'}
        </p>
      </div>
    </div>
  );
};

export default Matchmaking;