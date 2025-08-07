const express = require("express");
const Game = require("../models/Game");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { checkWinner, getWinningCombination } = require("../utils/gameLogic");

const router = express.Router();

// Get specific game details
router.get("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId })
      .populate("players.userId", "username stats")
      .populate("spectators.userId", "username");

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const isParticipant =
      game.players.some((p) => p.userId._id.toString() === req.user.id) ||
      game.spectators.some((s) => s.userId._id.toString() === req.user.id);

    if (!isParticipant && game.isPrivate) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(game);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get active games (public games only)
router.get("/active/list", async (req, res) => {
  try {
    const { boardSize, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const gameFilter = {
      gameStatus: "waiting",
      isPrivate: false,
    };

    if (boardSize) {
      gameFilter.boardSize = parseInt(boardSize);
    }

    const activeGames = await Game.find(gameFilter)
      .select("roomId boardSize players createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("players.userId", "username stats");

    const totalActiveGames = await Game.countDocuments(gameFilter);

    res.json({
      games: activeGames,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalActiveGames,
        pages: Math.ceil(totalActiveGames / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get comprehensive game statistics for authenticated user
router.get("/stats/overview", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("Fetching stats for user ID:", userId);

    // Find all finished games for this user
    const finishedGames = await Game.find({
      "players.userId": userId,
      gameStatus: "finished"
    })
      .populate({
        path: "players.userId",
        select: "username stats",
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log("Finished games found:", finishedGames.length);

    const gameStatistics = {
      totalGames: finishedGames.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winsByBoardSize: { 3: 0, 4: 0, 5: 0 },
      averageGameDuration: 0,
      longestGame: 0,
      shortestGame: Infinity,
      recentGames: [],
    };

    let totalGameDurationMs = 0;
    let validDurationCount = 0;

    finishedGames.forEach((game) => {
      const currentUserPlayer = game.players.find(
        (p) =>
          p.userId && p.userId._id && p.userId._id.toString() === userId
      );

      if (!currentUserPlayer) {
        return;
      }

      // Calculate game result
      if (game.winner === "draw") {
        gameStatistics.draws++;
      } else if (game.winner === currentUserPlayer.symbol) {
        gameStatistics.wins++;
        const boardSize = game.boardSize || 3;
        if (gameStatistics.winsByBoardSize[boardSize] !== undefined) {
          gameStatistics.winsByBoardSize[boardSize]++;
        }
      } else if (game.winner && game.winner !== currentUserPlayer.symbol) {
        gameStatistics.losses++;
      }

      // Calculate game duration
      if (game.finishedAt && game.createdAt) {
        const gameDurationMs =
          new Date(game.finishedAt) - new Date(game.createdAt);
        totalGameDurationMs += gameDurationMs;
        validDurationCount++;

        if (gameDurationMs > gameStatistics.longestGame) {
          gameStatistics.longestGame = gameDurationMs;
        }
        if (gameDurationMs < gameStatistics.shortestGame) {
          gameStatistics.shortestGame = gameDurationMs;
        }
      }

      // Build recent games data
      if (gameStatistics.recentGames.length < 10) {
        let opponentPlayer = null;
        for (const player of game.players) {
          const isCurrentUser =
            player.userId &&
            player.userId._id &&
            player.userId._id.toString() === userId;

          if (!isCurrentUser) {
            opponentPlayer = player;
            break;
          }
        }

        let opponentName = "Unknown";
        if (opponentPlayer) {
          if (opponentPlayer.isGuest || !opponentPlayer.userId) {
            opponentName = opponentPlayer.username || "Guest";
          } else if (
            opponentPlayer.userId &&
            typeof opponentPlayer.userId === "object" &&
            opponentPlayer.userId.username
          ) {
            opponentName = opponentPlayer.userId.username;
          } else if (opponentPlayer.username) {
            opponentName = opponentPlayer.username;
          } else {
            opponentName = "Unknown Player";
          }
        }

        const gameResult =
          game.winner === "draw"
            ? "draw"
            : game.winner ===
              (currentUserPlayer ? currentUserPlayer.symbol : null)
            ? "win"
            : "loss";

        const playerDetails = game.players.map((p) => ({
          username:
            p.isGuest || !p.userId
              ? p.username || "Guest"
              : p.userId && typeof p.userId === "object" && p.userId.username
              ? p.userId.username
              : p.username || "Unknown",
          symbol: p.symbol,
          isCurrentUser:
            p.userId && p.userId._id && p.userId._id.toString() === userId,
          isGuest: p.isGuest || !p.userId,
          userId: p.userId ? p.userId._id?.toString() : null,
        }));

        let winnerPlayer = null;
        let gameEndReason = "normal";
        let totalMoves = game.moves ? game.moves.length : 0;

        if (game.gameResult) {
          winnerPlayer = game.gameResult.winnerUsername
            ? {
                username: game.gameResult.winnerUsername,
                isCurrentUser:
                  game.gameResult.winnerUserId &&
                  game.gameResult.winnerUserId.toString() === userId,
              }
            : null;
          gameEndReason = game.gameResult.gameEndReason || "normal";
          totalMoves = game.gameResult.totalMoves || totalMoves;
        } else if (game.winner !== "draw") {
          winnerPlayer = playerDetails.find((p) => p.symbol === game.winner);
        }

        gameStatistics.recentGames.push({
          roomId: game.roomId,
          opponent: opponentName,
          result: gameResult,
          boardSize: game.boardSize || 3,
          createdAt: game.createdAt,
          duration: game.finishedAt
            ? (new Date(game.finishedAt) - new Date(game.createdAt)) / 1000
            : null,
          gameDetails: {
            winner: game.winner,
            players: playerDetails,
            winnerPlayer: winnerPlayer,
            currentUserSymbol: currentUserPlayer
              ? currentUserPlayer.symbol
              : null,
            moves: totalMoves,
            gameStatus: game.gameStatus,
            gameEndReason: gameEndReason,
            forfeitedBy: game.forfeitedBy,
            winningCombination: game.winningCombination,
          },
        });
      }
    });

    // Calculate averages
    if (validDurationCount > 0) {
      gameStatistics.averageGameDuration =
        totalGameDurationMs / validDurationCount;
    }

    if (gameStatistics.shortestGame === Infinity) {
      gameStatistics.shortestGame = 0;
    }

    res.json(gameStatistics);
  } catch (error) {
    res.status(500).json({
      error: "Server error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Create private game room
router.post("/create-private", auth, async (req, res) => {
  try {
    const { boardSize = 3, customInviteCode } = req.body;

    const roomId = customInviteCode || require("uuid").v4();

    if (customInviteCode) {
      const existingGame = await Game.findOne({
        roomId: customInviteCode,
        gameStatus: { $in: ["waiting", "playing"] },
      });

      if (existingGame) {
        return res.status(400).json({ error: "Invite code already in use" });
      }
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newGame = new Game({
      roomId,
      boardSize,
      isPrivate: true,
      gameStatus: "waiting",
      players: [
        {
          userId: req.user.id,
          username: user.username,
          symbol: "X",
        },
      ],
      spectators: [],
      moves: [],
      createdAt: new Date(),
    });

    newGame.initializeBoard();
    await newGame.save();

    const inviteCode = roomId.substring(0, 8).toUpperCase();

    res.json({
      roomId: newGame.roomId,
      inviteCode,
      game: newGame.toObject(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create private game" });
  }
});

// Join private game with invite code
router.post("/join-private", auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    let targetGame = await Game.findOne({
      roomId: inviteCode,
      isPrivate: true,
      gameStatus: "waiting",
    });

    if (!targetGame) {
      const allPrivateGames = await Game.find({
        isPrivate: true,
        gameStatus: "waiting",
      });
      targetGame = allPrivateGames.find(
        (g) =>
          g.roomId.substring(0, 8).toUpperCase() === inviteCode.toUpperCase()
      );
    }

    if (!targetGame) {
      return res
        .status(404)
        .json({ error: "Invalid invite code or game not found" });
    }

    if (targetGame.players.length >= 2) {
      return res.status(400).json({ error: "Game is full" });
    }

    if (targetGame.players.some((p) => p.userId.toString() === req.user.id)) {
      return res.status(400).json({ error: "You are already in this game" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      roomId: targetGame.roomId,
      inviteCode: targetGame.roomId.substring(0, 8).toUpperCase(),
      game: targetGame.toObject(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to join private game" });
  }
});

// Analyze game moves for educational purposes
router.get("/:roomId/analysis", auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId }).populate(
      "players.userId",
      "username stats"
    );

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const isParticipant = game.players.some(
      (p) => p.userId._id.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    const gameAnalysis = {
      gameId: game._id,
      roomId: game.roomId,
      boardSize: game.boardSize,
      totalMoves: game.moves.length,
      gameDuration: game.finishedAt
        ? (new Date(game.finishedAt) - new Date(game.createdAt)) / 1000
        : null,
      winner: game.winner,
      winningCombination: game.winningCombination,
      moveAnalysis: [],
      playerStats: game.players.map((p) => ({
        username: p.username,
        symbol: p.symbol,
        moves: game.moves.filter((m) => m.player === p.symbol).length,
        avgMoveTime: 0,
      })),
    };

    // Analyze each move
    game.moves.forEach((move, index) => {
      const boardState = new Array(game.boardSize * game.boardSize).fill("");

      for (let i = 0; i <= index; i++) {
        boardState[game.moves[i].position] = game.moves[i].player;
      }

      gameAnalysis.moveAnalysis.push({
        moveNumber: index + 1,
        player: move.player,
        position: move.position,
        timestamp: move.timestamp,
        boardState: [...boardState],
        wasWinningMove:
          index === game.moves.length - 1 && game.winner !== "draw",
      });
    });

    res.json(gameAnalysis);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
