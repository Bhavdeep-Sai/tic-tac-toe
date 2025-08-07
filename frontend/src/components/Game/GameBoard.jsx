import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GameBoard = () => {
  const navigate = useNavigate();
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

  // Get current player info with better matching logic
  const currentUserPlayer = game?.players?.find(p => {
    // Handle both string and ObjectId comparisons
    const playerUserId = p.userId?.toString ? p.userId.toString() : p.userId;
    const currentUserId = user?.id?.toString ? user?.id.toString() : user?.id;
    return playerUserId === currentUserId;
  });
  const opponent = game?.players?.find(p => {
    const playerUserId = p.userId?.toString ? p.userId.toString() : p.userId;
    const currentUserId = user?.id?.toString ? user?.id.toString() : user?.id;
    return playerUserId !== currentUserId;
  });
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

  // Handle cell click with better validation
  const handleCellClick = (position) => {
    console.log('Cell clicked:', {
      position,
      isGameActive,
      isCurrentUserTurn,
      currentPlayer: game?.currentPlayer,
      currentUserPlayer,
      cellValue: game?.board[position]
    });

    if (!isGameActive) {
      console.log('Game not active:', game?.gameStatus);
      return;
    }
    
    if (!isCurrentUserTurn) {
      console.log('Not your turn. Current player:', game?.currentPlayer, 'Your symbol:', currentUserPlayer?.symbol);
      return;
    }
    
    if (game.board[position] !== '') {
      console.log('Cell already occupied:', game.board[position]);
      return;
    }
    
    console.log('Making move at position:', position);
    makeMove(position);
  };

  // Copy invite code to clipboard
  const copyInviteCode = async () => {
    if (!inviteCode) return;

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
    const baseClasses = 'w-full h-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-bold cursor-pointer transition-all duration-300 hover:bg-gray-50 border-2 border-gray-300 rounded-lg shadow-sm';

    if (game?.board[position] !== '') {
      return `${baseClasses} cursor-not-allowed bg-gray-50`;
    }

    if (!isGameActive || !isCurrentUserTurn) {
      return `${baseClasses} cursor-not-allowed opacity-50`;
    }

    return `${baseClasses} hover:bg-blue-50 hover:border-blue-300 hover:shadow-md active:scale-95`;
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
        return `${baseClasses} grid-cols-3 w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96`;
      case 4:
        return `${baseClasses} grid-cols-4 w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96`;
      case 5:
        return `${baseClasses} grid-cols-5 w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[30rem] lg:h-[30rem]`;
      default:
        return `${baseClasses} grid-cols-3 w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96`;
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Game</h2>
          <p className="text-gray-600">Join or create a game to start playing!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-sm lg:rounded-xl bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl p-4 shadow-lg backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-green-100/90 border border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-100/90 border border-red-200 text-red-800' :
            'bg-blue-100/90 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={notification.type === 'success' ? "M5 13l4 4L19 7" :
                    notification.type === 'error' ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" :
                      "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
              </svg>
              <span className="font-medium text-sm">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-6">
          {/* Connection Status & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
              <span className="text-sm text-gray-600">
                {game.boardSize}×{game.boardSize} Board
              </span>
            </div>
            
            <div className="flex justify-end flex-wrap gap-2">
              {isGameActive && (
                <button
                  onClick={handleForfeit}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                >
                  Forfeit
                </button>
              )}
              <button
                onClick={() => {
                  leaveGame();
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Game Info Panel */}
          <div className="xl:col-span-4 order-2 xl:order-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 space-y-6">
              
              {/* Private Room Invite Code */}
              {inviteCode && game.gameStatus === 'waiting' && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private Room
                  </h3>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg border text-sm font-mono text-center shadow-sm">
                      {inviteCode}
                    </code>
                    <button
                      onClick={copyInviteCode}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2 text-center">
                    Share this code with your friend
                  </p>
                </div>
              )}

              {/* Players Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Players</h3>
                {game.players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getSymbolColor(player.symbol)} bg-white border-2 shadow-sm`}>
                        {player.symbol}
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{player.username}</span>
                        {player.userId === user?.id && (
                          <span className="block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-fit mt-1">You</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      {game.currentPlayer === player.symbol && isGameActive && (
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Turn
                        </div>
                      )}
                      {player.disconnected && (
                        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">Offline</div>
                      )}
                      {isRematchRequested && rematchRequest.requesterId === player.userId && (
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">🔄 Requested</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rematch Section */}
              {isGameFinished && currentUserPlayer && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rematch
                  </h3>
                  <div className="space-y-2">
                    {!isRematchRequested ? (
                      <button
                        onClick={handleRequestRematch}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                      >
                        Request Rematch
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {isUserRequester ? (
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-2 animate-spin">
                              <svg className="w-full h-full text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <p className="text-sm text-blue-700 font-medium mb-1">
                              Waiting for {opponent?.username}...
                            </p>
                            <p className="text-xs text-gray-500">
                              You requested a rematch
                            </p>
                          </div>
                        ) : isUserResponder ? (
                          <div className="space-y-3">
                            <p className="text-sm text-blue-700 font-medium text-center">
                              🎮 {rematchRequest.requesterName} wants a rematch!
                            </p>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleAcceptRematch}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                              >
                                Accept
                              </button>
                              <button
                                onClick={handleDeclineRematch}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
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

              {/* Game Stats */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Game Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600 block">Board Size</span>
                    <span className="font-semibold text-gray-800">{game.boardSize}×{game.boardSize}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600 block">Moves</span>
                    <span className="font-semibold text-gray-800">{game.moves?.length || 0}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600 block">Room Type</span>
                    <span className="font-semibold text-gray-800">{game.isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600 block">Room ID</span>
                    <span className="font-semibold text-gray-800 text-xs">{game.roomId?.substring(0, 8) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Board */}
          <div className="xl:col-span-8 order-1 xl:order-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 lg:p-8">
              {/* Game Board Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                  Tic-Tac-Toe
                </h1>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">{game.boardSize}×{game.boardSize}</span>
                  {game.gameStatus === 'waiting' && (
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full animate-pulse">
                      Waiting for {2 - game.players.length} more player(s)...
                    </span>
                  )}
                  {isGameActive && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      Game Active
                    </span>
                  )}
                  {isGameFinished && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Game Finished
                    </span>
                  )}
                </div>
              </div>

              {/* The Game Board */}
              <div className="flex justify-center mb-6">
                <div className={getBoardGridClasses()}>
                  {game.board.map((cell, index) => (
                    <div
                      key={index}
                      className={`
                        ${getCellClasses(index)}
                        ${isWinningCell(index) ? 'bg-green-100 border-green-400 shadow-green-200/50 shadow-lg' : ''}
                        ${cell ? getSymbolColor(cell) : ''}
                      `}
                      onClick={() => handleCellClick(index)}
                    >
                      {cell && (
                        <span className={`${isWinningCell(index) ? 'animate-bounce' : 'animate-fade-in'} font-black`}>
                          {cell}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Game Instructions */}
              <div className="text-center">
                {game.gameStatus === 'playing' && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm sm:text-base text-gray-700 font-medium">
                      {isCurrentUserTurn ? (
                        <>
                          <span className="text-green-600">Your turn!</span> Click on an empty cell to make your move
                        </>
                      ) : (
                        <>
                          <span className="text-amber-600">Opponent's turn</span> - Wait for {opponent?.username} to make a move
                        </>
                      )}
                    </p>
                  </div>
                )}
                
                {game.gameStatus === 'finished' && game.winner && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-green-800 mb-2">🎉 Game Over!</h3>
                    <p className="text-green-700">
                      {game.winner === currentUserPlayer?.symbol ? 'Congratulations! You won!' : `${opponent?.username} wins!`}
                    </p>
                  </div>
                )}
                
                {game.gameStatus === 'finished' && !game.winner && (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-gray-700 mb-2">🤝 It's a Tie!</h3>
                    <p className="text-gray-600">Great game! Well played by both players.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GameBoard;