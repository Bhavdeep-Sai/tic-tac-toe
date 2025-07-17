import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user, isGuest } = useAuth();
  const { socket, isConnected } = useSocket(user?.id);
  
  const [game, setGame] = useState(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [spectators, setSpectators] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Game events
    socket.on('room_created', (data) => {
      setGame(data.game);
      setRoomId(data.roomId);
      // Generate invite code from room ID (you can make this more sophisticated)
      const code = data.roomId.substring(0, 8).toUpperCase();
      setInviteCode(code);
      toast.success('Room created successfully!');
    });

    socket.on('game_started', (data) => {
      setGame(data.game);
      toast.success('Game started!');
    });

    socket.on('match_found', (data) => {
      setGame(data.game);
      setRoomId(data.roomId);
      setIsInQueue(false);
      toast.success('Match found!');
    });

    socket.on('move_made', (data) => {
      setGame(data.game);
    });

    socket.on('game_finished', (data) => {
      setGame(prev => ({
        ...prev,
        gameStatus: 'finished',
        winner: data.winner,
        winningCombination: data.winningCombination
      }));
      
      if (!user) return;
      
      const isWinner = data.winner !== 'draw' && 
        game?.players?.find(p => p.userId === user.id)?.symbol === data.winner;
      
      if (data.winner === 'draw') {
        toast('Game ended in a draw!', { icon: '🤝' });
      } else if (isWinner) {
        toast.success('You won! 🎉');
      } else {
        toast.error('You lost! 😔');
      }
    });

    socket.on('player_disconnected', (data) => {
      toast.error(`${data.username} disconnected`);
    });

    socket.on('spectator_joined', (data) => {
      toast(`${data.username} joined as spectator`);
    });

    socket.on('room_joined', (data) => {
      setGame(data.game);
      setRoomId(data.roomId);
      toast.success('Joined room successfully!');
    });

    socket.on('player_joined', (data) => {
      toast.success(`${data.username} joined the game`);
    });

    socket.on('joined_as_spectator', (data) => {
      setGame(data.game);
      setRoomId(data.roomId);
      toast.success('Joined as spectator!');
    });

    // Queue events
    socket.on('queued', (data) => {
      setIsInQueue(true);
      setQueuePosition(data.position);
      toast.success(`Joined queue! Position: ${data.position}`);
    });

    socket.on('queue_updated', (data) => {
      setQueuePosition(data.position);
    });

    socket.on('matchmaking_cancelled', () => {
      setIsInQueue(false);
      setQueuePosition(0);
      toast.success('Matchmaking cancelled');
    });

    // Error handling
    socket.on('error', (data) => {
      toast.error(data.message || 'An error occurred');
    });

    socket.on('game_error', (data) => {
      toast.error(data.message || 'Game error occurred');
    });

    return () => {
      socket.off('room_created');
      socket.off('game_started');
      socket.off('match_found');
      socket.off('move_made');
      socket.off('game_finished');
      socket.off('player_disconnected');
      socket.off('spectator_joined');
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('joined_as_spectator');
      socket.off('queued');
      socket.off('queue_updated');
      socket.off('matchmaking_cancelled');
      socket.off('error');
      socket.off('game_error');
    };
  }, [socket, user, game]);

  const createRoom = (boardSize = 3, isPrivate = false) => {
    if (socket && isConnected) {
      socket.emit('create_room', { boardSize, isPrivate });
    } else {
      toast.error('Not connected to server');
    }
  };

  const joinRoom = (roomId, asSpectator = false) => {
    if (socket && isConnected) {
      socket.emit('join_room', { roomId, asSpectator });
      setRoomId(roomId);
    } else {
      toast.error('Not connected to server');
    }
  };

  const findMatch = (boardSize = 3) => {
    if (socket && isConnected) {
      socket.emit('find_match', { boardSize });
    } else {
      toast.error('Not connected to server');
    }
  };

  const cancelMatchmaking = () => {
    if (socket && isConnected) {
      socket.emit('cancel_matchmaking');
    } else {
      toast.error('Not connected to server');
    }
  };

  const makeMove = (position) => {
    if (socket && isConnected && roomId) {
      socket.emit('make_move', { roomId, position });
    } else {
      toast.error('Cannot make move - not connected');
    }
  };

  const leaveGame = () => {
    if (socket && isConnected && roomId) {
      socket.emit('leave_game', { roomId });
    }
    setGame(null);
    setRoomId(null);
    setSpectators([]);
    setIsInQueue(false);
    setQueuePosition(0);
    setInviteCode(null);
  };

  const forfeitGame = () => {
    if (socket && isConnected && roomId) {
      socket.emit('forfeit_game', { roomId });
    }
  };

  const requestRematch = () => {
    if (socket && isConnected && roomId) {
      socket.emit('request_rematch', { roomId });
    }
  };

  const value = {
    game,
    isInQueue,
    queuePosition,
    spectators,
    roomId,
    inviteCode,
    isConnected,
    createRoom,
    joinRoom,
    findMatch,
    cancelMatchmaking,
    makeMove,
    leaveGame,
    forfeitGame,
    requestRematch
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};