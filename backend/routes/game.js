const express = require('express');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { checkWinner, getWinningCombination } = require('../utils/gameLogic');

const router = express.Router();

// Get specific game details
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId })
      .populate('players.userId', 'username stats')
      .populate('spectators.userId', 'username');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user is participant or spectator
    const isParticipant = game.players.some(p => p.userId._id.toString() === req.userId) ||
                         game.spectators.some(s => s.userId._id.toString() === req.userId);

    if (!isParticipant && game.isPrivate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active games (public games only)
router.get('/active/list', async (req, res) => {
  try {
    const { boardSize, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      gameStatus: 'waiting',
      isPrivate: false
    };

    if (boardSize) {
      filter.boardSize = parseInt(boardSize);
    }

    const games = await Game.find(filter)
      .select('roomId boardSize players createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('players.userId', 'username stats');

    const total = await Game.countDocuments(filter);

    res.json({
      games,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game statistics - FIXED VERSION
router.get('/stats/overview', auth, async (req, res) => {
  try {
    console.log('Getting stats for user:', req.userId);
    
    // Validate user ID
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Convert string ID to ObjectId if needed
    const mongoose = require('mongoose');
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.userId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Find all finished games where the user participated
    const userGames = await Game.find({
      $and: [
        { 'players.userId': userId },
        { gameStatus: 'finished' }
      ]
    }).populate('players.userId', 'username').lean();

    console.log('Found games:', userGames.length);

    const stats = {
      totalGames: userGames.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winsByBoardSize: { 3: 0, 4: 0, 5: 0 },
      averageGameDuration: 0,
      longestGame: 0,
      shortestGame: Infinity,
      recentGames: []
    };

    let totalDuration = 0;
    let validDurationCount = 0;

    userGames.forEach(game => {
      // Find user's player data
      const userPlayer = game.players.find(p => 
        p.userId && p.userId._id && p.userId._id.toString() === req.userId
      );
      
      if (!userPlayer) {
        console.log('User player not found in game:', game._id);
        return;
      }

      // Calculate game result
      if (game.winner === 'draw') {
        stats.draws++;
      } else if (game.winner === userPlayer.symbol) {
        stats.wins++;
        const boardSize = game.boardSize || 3;
        if (stats.winsByBoardSize[boardSize] !== undefined) {
          stats.winsByBoardSize[boardSize]++;
        }
      } else {
        stats.losses++;
      }

      // Calculate game duration
      if (game.finishedAt && game.createdAt) {
        const duration = (new Date(game.finishedAt) - new Date(game.createdAt)) / 1000;
        if (duration > 0) {
          totalDuration += duration;
          validDurationCount++;
          stats.longestGame = Math.max(stats.longestGame, duration);
          stats.shortestGame = Math.min(stats.shortestGame, duration);
        }
      }
    });

    // Calculate average duration
    stats.averageGameDuration = validDurationCount > 0 ? totalDuration / validDurationCount : 0;
    stats.shortestGame = stats.shortestGame === Infinity ? 0 : stats.shortestGame;

    // Get recent games with proper opponent information
    stats.recentGames = userGames
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(game => {
        const userPlayer = game.players.find(p => 
          p.userId && p.userId._id && p.userId._id.toString() === req.userId
        );
        const opponentPlayer = game.players.find(p => 
          (!p.userId && p.isGuest) || // Guest player
          (p.userId && p.userId._id && p.userId._id.toString() !== req.userId) // Registered player
        );
        
        // Determine opponent name
        let opponentName = 'Unknown';
        if (opponentPlayer) {
          if (opponentPlayer.isGuest) {
            opponentName = opponentPlayer.username || 'Guest';
          } else if (opponentPlayer.userId && opponentPlayer.userId.username) {
            opponentName = opponentPlayer.userId.username;
          } else {
            opponentName = opponentPlayer.username || 'Unknown';
          }
        }
        
        return {
          roomId: game.roomId,
          opponent: opponentName,
          result: game.winner === 'draw' ? 'draw' : 
                  game.winner === (userPlayer ? userPlayer.symbol : null) ? 'win' : 'loss',
          boardSize: game.boardSize || 3,
          createdAt: game.createdAt,
          duration: game.finishedAt ? (new Date(game.finishedAt) - new Date(game.createdAt)) / 1000 : null
        };
      });

    console.log('Final stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/create-private', auth, async (req, res) => {
  try {
    const { boardSize = 3, customInviteCode } = req.body;
    
    // Generate a unique room ID
    const roomId = customInviteCode || require('uuid').v4();
    
    // Check if custom invite code is already taken
    if (customInviteCode) {
      const existingGame = await Game.findOne({ 
        roomId: customInviteCode,
        gameStatus: { $in: ['waiting', 'playing'] }
      });
      
      if (existingGame) {
        return res.status(400).json({ error: 'Invite code already in use' });
      }
    }

    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const game = new Game({
      roomId,
      boardSize,
      isPrivate: true,
      gameStatus: 'waiting',
      players: [{
        userId: req.userId,
        username: user.username,
        symbol: 'X'
      }],
      spectators: [],
      moves: [],
      createdAt: new Date()
    });

    game.initializeBoard();
    await game.save();

    // Generate invite code (first 8 characters of room ID, uppercase)
    const inviteCode = roomId.substring(0, 8).toUpperCase();

    res.json({
      roomId: game.roomId,
      inviteCode,
      game: game.toObject()
    });
  } catch (error) {
    console.error('Create private room error:', error);
    res.status(500).json({ error: 'Failed to create private game' });
  }
});

// Join private game with invite code
router.post('/join-private', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Convert invite code back to room ID format
    // Try to find game by exact invite code first, then by room ID starting with invite code
    let game = await Game.findOne({ 
      roomId: inviteCode,
      isPrivate: true,
      gameStatus: 'waiting'
    });

    // If not found, try to find by room ID that starts with the invite code
    if (!game) {
      const games = await Game.find({
        isPrivate: true,
        gameStatus: 'waiting'
      });
      
      game = games.find(g => g.roomId.substring(0, 8).toUpperCase() === inviteCode.toUpperCase());
    }

    if (!game) {
      return res.status(404).json({ error: 'Invalid invite code or game not found' });
    }

    if (game.players.length >= 2) {
      return res.status(400).json({ error: 'Game is full' });
    }

    if (game.players.some(p => p.userId.toString() === req.userId)) {
      return res.status(400).json({ error: 'You are already in this game' });
    }

    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      roomId: game.roomId,
      inviteCode: game.roomId.substring(0, 8).toUpperCase(),
      game: game.toObject()
    });
  } catch (error) {
    console.error('Join private room error:', error);
    res.status(500).json({ error: 'Failed to join private game' });
  }
});

// Analyze game moves (for AI training/analysis)
router.get('/:roomId/analysis', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId })
      .populate('players.userId', 'username stats');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user was part of the game
    const isParticipant = game.players.some(p => p.userId._id.toString() === req.userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analysis = {
      gameId: game._id,
      roomId: game.roomId,
      boardSize: game.boardSize,
      totalMoves: game.moves.length,
      gameDuration: game.finishedAt ? (new Date(game.finishedAt) - new Date(game.createdAt)) / 1000 : null,
      winner: game.winner,
      winningCombination: game.winningCombination,
      moveAnalysis: [],
      playerStats: game.players.map(p => ({
        username: p.username,
        symbol: p.symbol,
        moves: game.moves.filter(m => m.player === p.symbol).length,
        avgMoveTime: 0 // Could be calculated if we store timestamps
      }))
    };

    // Analyze each move
    game.moves.forEach((move, index) => {
      const boardState = new Array(game.boardSize * game.boardSize).fill('');
      
      // Recreate board state up to this move
      for (let i = 0; i <= index; i++) {
        boardState[game.moves[i].position] = game.moves[i].player;
      }

      analysis.moveAnalysis.push({
        moveNumber: index + 1,
        player: move.player,
        position: move.position,
        timestamp: move.timestamp,
        boardState: [...boardState],
        wasWinningMove: index === game.moves.length - 1 && game.winner !== 'draw'
      });
    });

    res.json(analysis);
  } catch (error) {
    console.error('Game analysis error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;