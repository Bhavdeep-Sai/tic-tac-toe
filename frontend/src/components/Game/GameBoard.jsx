import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GameBoard = () => {
  const navigate = useNavigate()
  const { user } = useAuth();
  const {
    game,
    makeMove,
    leaveGame,
    forfeitGame,
    requestRematch,
    acceptRematch,
    declineRematch,
    isConnected,
    inviteCode,
    rematchRequest
  } = useGame();

  const [notification, setNotification] = useState(null);

  // Get current player info
  const currentUserPlayer = game?.players?.find(p => p.userId === user?.id);
  const opponent = game?.players?.find(p => p.userId !== user?.id);
  const isCurrentUserTurn = game?.currentPlayer === currentUserPlayer?.symbol;
  const isGameActive = game?.gameStatus === 'playing';
  const isGameFinished = game?.gameStatus === 'finished';

  // Check rematch status
  const isRematchRequested = rematchRequest?.status === 'pending';
  const isUserRequester = rematchRequest?.requesterId === user?.id;
  const isUserResponder = rematchRequest?.responderId === user?.id;

  // Show notification helper
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle cell click
  const handleCellClick = (position) => {
    if (!isGameActive || !isCurrentUserTurn || game.board[position] !== '') {
      return;
    }
    makeMove(position);
  };

  // Copy invite code to clipboard
  const copyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      showNotification('Invite code copied to clipboard!', 'success');
    } catch (error) {
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

  // Handle forfeit
  const handleForfeit = () => {
    if (window.confirm('Are you sure you want to forfeit this game?')) {
      forfeitGame();
    }
  };

  // Handle rematch request
  const handleRequestRematch = () => {
    requestRematch();
    showNotification('Rematch requested!', 'info');
  };

  // Handle accept rematch
  const handleAcceptRematch = () => {
    acceptRematch();
    showNotification('Rematch accepted!', 'success');
  };

  // Handle decline rematch
  const handleDeclineRematch = () => {
    declineRematch();
    showNotification('Rematch declined', 'info');
  };

  // Get cell classes based on state
  const getCellClasses = (position) => {
    const baseClasses = 'w-full h-full flex items-center justify-center text-4xl font-bold cursor-pointer transition-all duration-200 hover:bg-gray-100 border-2 border-gray-400';

    if (game?.board[position] !== '') {
      return `${baseClasses} cursor-not-allowed`;
    }

    if (!isGameActive || !isCurrentUserTurn) {
      return `${baseClasses} cursor-not-allowed opacity-10`;
    }

    return `${baseClasses} hover:bg-blue-50 hover:border-blue-300`;
  };

  // Get symbol color
  const getSymbolColor = (symbol) => {
    return symbol === 'X' ? 'text-blue-600' : 'text-red-600';
  };

  // Check if cell is part of winning combination
  const isWinningCell = (position) => {
    return game?.winningCombination?.includes(position);
  };


  // Get board grid classes based on size
  const getBoardGridClasses = () => {
    const size = game?.boardSize || 3;
    const baseClasses = 'grid gap-2 mx-auto';

    switch (size) {
      case 3:
        return `${baseClasses} grid-cols-3 w-80 h-80`;
      case 4:
        return `${baseClasses} grid-cols-4 w-96 h-96`;
      case 5:
        return `${baseClasses} grid-cols-5 w-[30rem] h-[30rem]`;
      default:
        return `${baseClasses} grid-cols-3 w-80 h-80`;
    }
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-2">No active game</h2>
          <p className="text-gray-500">Join or create a game to start playing!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 rounded-lg p-4 ${notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm ${isConnected ? 'text-black' : 'text-white'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex space-x-2">
          {isGameActive && (
            <button
              onClick={handleForfeit}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Give up
            </button>
          )}
          <button
            onClick={() => {
              leaveGame();
              navigate('/')
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Info Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-bold mb-4">Game Info</h2>

            {/* Private Room Invite Code */}
            {inviteCode && game.gameStatus === 'waiting' && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-2">
                  Private Room - Share with friends
                </h3>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono text-center">
                    {inviteCode}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-all"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Send this code to your friend to join the game
                </p>
              </div>
            )}


            {/* Rematch Section */}
            {isGameFinished && currentUserPlayer && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">
                  Rematch
                </h3>
                <div className="space-y-2">
                  {!isRematchRequested ? (
                    // No rematch request - show request button
                    <button
                      onClick={handleRequestRematch}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-all"
                    >
                      Request Rematch
                    </button>
                  ) : (
                    // Rematch request exists
                    <div className="space-y-2">
                      {isUserRequester ? (
                        // User is the requester - waiting for response
                        <div className="text-center">
                          <p className="text-sm text-blue-600 mb-2">
                            ⏳ Waiting for {opponent?.username} to respond...
                          </p>
                          <p className="text-xs text-gray-500">
                            You requested a rematch
                          </p>
                        </div>
                      ) : isUserResponder ? (
                        // User is the responder - show accept/decline buttons
                        <div className="space-y-2">
                          <p className="text-sm text-blue-600 mb-2 text-center">
                            {rematchRequest.requesterName} wants a rematch!
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleAcceptRematch}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={handleDeclineRematch}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Players */}
            <div className="space-y-3">
              {game.players.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getSymbolColor(player.symbol)} bg-white border-2`}>
                      {player.symbol}
                    </div>
                    <span className="font-medium">{player.username}</span>
                    {player.userId === user?.id && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    {game.currentPlayer === player.symbol && isGameActive && (
                      <div className="text-green-600 font-semibold">Turn</div>
                    )}
                    {player.disconnected && (
                      <div className="text-red-600 text-sm">Disconnected</div>
                    )}
                    {isRematchRequested && rematchRequest.requesterId === player.userId && (
                      <div className="text-blue-600 text-sm">🔄 Requested</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Game Stats */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Board Size:</span>
                  <span className="font-semibold ml-2">{game.boardSize}x{game.boardSize}</span>
                </div>
                <div>
                  <span className="text-gray-600">Moves:</span>
                  <span className="font-semibold ml-2">{game.moves?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-semibold ml-2">{game.isPrivate ? 'Private' : 'Public'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Room ID:</span>
                  <span className="font-semibold ml-2 text-xs">{game.roomId?.substring(0, 8) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Spectators */}
            {game.spectators && game.spectators.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Spectators</h3>
                <div className="space-y-1">
                  {game.spectators.map((spectator, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      👁️ {spectator.username}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Board */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Game Board Header */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {game.boardSize}x{game.boardSize} Tic-Tac-Toe
              </h3>
              {game.gameStatus === 'waiting' && (
                <p className="text-sm text-gray-600 mt-1">
                  Waiting for {2 - game.players.length} more player(s)...
                </p>
              )}
            </div>

            {/* The Game Board */}
            <div className={getBoardGridClasses()}>
              {game.board.map((cell, index) => (
                <div
                  key={index}
                  className={`
                    ${getCellClasses(index)}
                    ${isWinningCell(index) ? 'bg-green-200 border-green-400' : ''}
                    ${cell ? getSymbolColor(cell) : ''}
                  `}
                  onClick={() => handleCellClick(index)}
                >
                  {cell && (
                    <span className={`${isWinningCell(index) ? 'animate-pulse' : ''}`}>
                      {cell}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Game Instructions */}
            {game.gameStatus === 'playing' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  {isCurrentUserTurn ? 'Click on an empty cell to make your move' : 'Wait for your opponent to make a move'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;