const Game = require("../models/Game");
const User = require("../models/User");
const { checkWinner, getWinningCombination } = require("../utils/gameLogic");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// Store active games and queues in memory
const activeGames = new Map();
const matchmakingQueue = [];

const gameSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Authenticate socket connection for regular users
    socket.on("authenticate", async (token) => {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );
        const user = await User.findById(decoded.userId);

        if (user) {
          socket.userId = user._id.toString();
          socket.username = user.username;
          socket.isGuest = false;
          user.isOnline = true;
          await user.save();
          socket.emit("authenticated", {
            user: { id: user._id, username: user.username },
          });
        }
      } catch (error) {
        socket.emit("auth_error", { error: "Invalid token" });
      }
    });

    // Authenticate guest users
    socket.on("authenticate_guest", (data) => {
      socket.userId = data.userId;
      socket.username = data.username;
      socket.isGuest = true;
      socket.emit("guest_authenticated", {
        user: { id: data.userId, username: data.username },
      });
    });

    // Create room
    socket.on("create_room", async (data) => {
      try {
        const { boardSize = 3, isPrivate = false } = data;
        const roomId = uuidv4();

        const gameData = {
          roomId,
          boardSize,
          isPrivate,
          players: [
            {
              userId: socket.userId,
              username: socket.username,
              symbol: "X",
              socketId: socket.id,
            },
          ],
        };

        // Only save to database if not a guest
        if (!socket.isGuest) {
          const game = new Game(gameData);
          game.initializeBoard();
          await game.save();
        }

        // Store in memory for quick access
        activeGames.set(roomId, {
          ...gameData,
          board: new Array(boardSize * boardSize).fill(""),
          currentPlayer: "X",
          gameStatus: "waiting",
          moves: [],
          spectators: [],
          sockets: [socket.id],
        });

        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit("room_created", {
          roomId,
          game: activeGames.get(roomId),
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to create room" });
      }
    });

    // Join room
    socket.on("join_room", async (data) => {
      try {
        const { roomId, asSpectator = false } = data;

        let game = activeGames.get(roomId);
        if (!game) {
          const dbGame = await Game.findOne({ roomId });
          if (!dbGame) {
            return socket.emit("error", { message: "Room not found" });
          }
          game = {
            ...dbGame.toObject(),
            sockets: [],
            spectators: dbGame.spectators || [],
          };
          activeGames.set(roomId, game);
        }

        socket.join(roomId);
        socket.roomId = roomId;

        if (asSpectator) {
          game.spectators = game.spectators || [];
          game.spectators.push({
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id,
          });

          socket.emit("joined_as_spectator", { game });
          socket.to(roomId).emit("spectator_joined", {
            username: socket.username,
          });
        } else {
          if (game.players.length >= 2) {
            return socket.emit("error", { message: "Room is full" });
          }

          // Check if user is already in the game (reconnection case)
          const existingPlayerIndex = game.players.findIndex(
            (p) => p.userId === socket.userId
          );
          if (existingPlayerIndex !== -1) {
            // Update existing player's socket ID
            game.players[existingPlayerIndex].socketId = socket.id;
            game.players[existingPlayerIndex].disconnected = false;

            socket.emit("room_joined", { game, roomId });
            socket.to(roomId).emit("player_reconnected", {
              username: socket.username,
            });
          } else {
            // Add new player
            game.players.push({
              userId: socket.userId,
              username: socket.username,
              symbol: "O",
              socketId: socket.id,
            });

            // Only start game if we have 2 players
            if (game.players.length === 2) {
              game.gameStatus = "playing";
            }

            // Update database only if not guest
            if (!socket.isGuest) {
              await Game.findOneAndUpdate(
                { roomId },
                {
                  players: game.players,
                  gameStatus: game.gameStatus,
                }
              );
            }

            socket.emit("room_joined", { game, roomId });

            if (game.gameStatus === "playing") {
              io.to(roomId).emit("game_started", { game });
            } else {
              socket.to(roomId).emit("player_joined", {
                username: socket.username,
                playersCount: game.players.length,
              });
            }
          }
        }

        activeGames.set(roomId, game);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Make move
    socket.on("make_move", async (data) => {
      try {
        const { roomId, position } = data;
        const game = activeGames.get(roomId);

        if (!game || game.gameStatus !== "playing") {
          return socket.emit("error", { message: "Invalid game state" });
        }

        const player = game.players.find((p) => p.socketId === socket.id);
        if (!player || player.symbol !== game.currentPlayer) {
          return socket.emit("error", { message: "Not your turn" });
        }

        if (game.board[position] !== "") {
          return socket.emit("error", { message: "Invalid move" });
        }

        // Make move
        game.board[position] = player.symbol;
        game.moves = game.moves || [];
        game.moves.push({
          player: player.symbol,
          position,
          timestamp: new Date(),
        });

        // Check for winner
        const winner = checkWinner(game.board, game.boardSize);
        if (winner) {
          game.gameStatus = "finished";
          game.winner = winner;
          game.winningCombination = getWinningCombination(
            game.board,
            game.boardSize
          );
          game.finishedAt = new Date();

          // Update player stats only for non-guest players
          await updatePlayerStats(game.players, winner);
        } else if (game.board.every((cell) => cell !== "")) {
          game.gameStatus = "finished";
          game.winner = "draw";
          game.finishedAt = new Date();

          // Update player stats for draw only for non-guest players
          await updatePlayerStats(game.players, "draw");
        } else {
          game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
        }

        // Update database only if not guest
        if (!socket.isGuest) {
          await Game.findOneAndUpdate({ roomId }, game);
        }

        activeGames.set(roomId, game);

        // Emit to all clients in room
        io.to(roomId).emit("move_made", {
          game,
          move: {
            player: player.symbol,
            position,
            username: player.username,
          },
        });

        if (game.gameStatus === "finished") {
          io.to(roomId).emit("game_finished", {
            winner: game.winner,
            winningCombination: game.winningCombination,
          });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to make move" });
      }
    });

    // Find match (matchmaking)
    socket.on("find_match", async (data) => {
      try {
        const { boardSize = 3 } = data;

        // Check if already in queue
        const existingIndex = matchmakingQueue.findIndex(
          (p) => p.socketId === socket.id
        );
        if (existingIndex !== -1) {
          return socket.emit("error", { message: "Already in queue" });
        }

        // Look for a match
        const matchIndex = matchmakingQueue.findIndex(
          (p) => p.boardSize === boardSize
        );

        if (matchIndex !== -1) {
          // Found a match
          const opponent = matchmakingQueue.splice(matchIndex, 1)[0];
          const roomId = uuidv4();

          const gameData = {
            roomId,
            boardSize,
            players: [
              {
                userId: opponent.userId,
                username: opponent.username,
                symbol: "X",
                socketId: opponent.socketId,
              },
              {
                userId: socket.userId,
                username: socket.username,
                symbol: "O",
                socketId: socket.id,
              },
            ],
            gameStatus: "playing",
            board: new Array(boardSize * boardSize).fill(""),
            currentPlayer: "X",
            moves: [],
            spectators: [],
          };

          // Save to database only if both players are not guests
          if (!socket.isGuest && !opponent.isGuest) {
            const game = new Game(gameData);
            game.initializeBoard();
            await game.save();
          }

          // Join both players to room
          socket.join(roomId);
          socket.roomId = roomId;
          const opponentSocket = io.sockets.sockets.get(opponent.socketId);
          if (opponentSocket) {
            opponentSocket.join(roomId);
            opponentSocket.roomId = roomId;
          }

          activeGames.set(roomId, gameData);

          io.to(roomId).emit("match_found", {
            roomId,
            game: gameData,
          });
        } else {
          // Add to queue
          matchmakingQueue.push({
            socketId: socket.id,
            userId: socket.userId,
            username: socket.username,
            boardSize,
            isGuest: socket.isGuest,
          });

          socket.emit("queued", { position: matchmakingQueue.length });
        }
      } catch (error) {
        socket.emit("error", { message: "Matchmaking failed" });
      }
    });

    // Cancel matchmaking
    socket.on("cancel_matchmaking", () => {
      const index = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        socket.emit("matchmaking_cancelled");
      }
    });

    // Leave game
    socket.on("leave_game", (data) => {
      const { roomId } = data;
      if (socket.roomId === roomId) {
        socket.leave(roomId);
        socket.roomId = null;
        socket.to(roomId).emit("player_left", {
          username: socket.username,
        });
      }
    });

    // Reconnect to game
    socket.on("reconnect_game", async (data) => {
      try {
        const { roomId } = data;

        let game = activeGames.get(roomId);
        if (!game) {
          const dbGame = await Game.findOne({ roomId });
          if (!dbGame) {
            return socket.emit("error", { message: "Game not found" });
          }
          game = {
            ...dbGame.toObject(),
            sockets: [],
            spectators: dbGame.spectators || [],
          };
          activeGames.set(roomId, game);
        }

        // Find player in game
        const playerIndex = game.players.findIndex(
          (p) => p.userId === socket.userId
        );
        const spectatorIndex =
          game.spectators?.findIndex((s) => s.userId === socket.userId) || -1;

        if (playerIndex !== -1) {
          // Update player socket ID
          game.players[playerIndex].socketId = socket.id;
          game.players[playerIndex].disconnected = false;
          socket.join(roomId);
          socket.roomId = roomId;

          socket.emit("reconnected_to_game", { game });
          socket.to(roomId).emit("player_reconnected", {
            username: socket.username,
          });
        } else if (spectatorIndex !== -1) {
          // Update spectator socket ID
          game.spectators[spectatorIndex].socketId = socket.id;
          socket.join(roomId);
          socket.roomId = roomId;

          socket.emit("reconnected_as_spectator", { game });
          socket.to(roomId).emit("spectator_reconnected", {
            username: socket.username,
          });
        } else {
          return socket.emit("error", {
            message: "Not authorized to rejoin this game",
          });
        }

        activeGames.set(roomId, game);
      } catch (error) {
        socket.emit("error", { message: "Failed to reconnect to game" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      // Remove from matchmaking queue
      const queueIndex = matchmakingQueue.findIndex(
        (p) => p.socketId === socket.id
      );
      if (queueIndex !== -1) {
        matchmakingQueue.splice(queueIndex, 1);
      }

      // Update user online status for authenticated users
      if (socket.userId && !socket.isGuest) {
        try {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false });
        } catch (error) {
          console.error("Failed to update user online status:", error);
        }
      }

      // Notify room about disconnection
      if (socket.roomId) {
        socket.to(socket.roomId).emit("player_disconnected", {
          username: socket.username,
        });
      }

      // Clean up active games if needed
      for (const [roomId, game] of activeGames.entries()) {
        const playerIndex = game.players.findIndex(
          (p) => p.socketId === socket.id
        );
        const spectatorIndex =
          game.spectators?.findIndex((s) => s.socketId === socket.id) || -1;

        if (playerIndex !== -1 || spectatorIndex !== -1) {
          // Mark player as disconnected but don't remove from game
          // They might reconnect
          if (playerIndex !== -1) {
            game.players[playerIndex].disconnected = true;
          }
          if (spectatorIndex !== -1) {
            game.spectators.splice(spectatorIndex, 1);
          }

          activeGames.set(roomId, game);
          break;
        }
      }
    });

    // Handle forfeit
    socket.on("forfeit_game", async (data) => {
      try {
        const { roomId } = data;
        const game = activeGames.get(roomId);

        if (!game || game.gameStatus !== "playing") {
          return socket.emit("error", { message: "Cannot forfeit this game" });
        }

        const player = game.players.find((p) => p.socketId === socket.id);
        if (!player) {
          return socket.emit("error", {
            message: "You are not a player in this game",
          });
        }

        // Set winner as opponent
        const opponent = game.players.find((p) => p.socketId !== socket.id);
        game.gameStatus = "finished";
        game.winner = opponent.symbol;
        game.finishedAt = new Date();
        game.forfeitedBy = player.userId;

        // Update player stats
        await updatePlayerStats(game.players, opponent.symbol, player.userId);

        // Update database
        if (!socket.isGuest) {
          await Game.findOneAndUpdate({ roomId }, game);
        }

        activeGames.set(roomId, game);

        io.to(roomId).emit("game_forfeited", {
          forfeitedBy: player.username,
          winner: opponent.symbol,
        });

        io.to(roomId).emit("game_finished", {
          winner: game.winner,
          winningCombination: null,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to forfeit game" });
      }
    });

    // Request rematch
    socket.on("request_rematch", async (data) => {
      try {
        const { roomId } = data;
        const game = activeGames.get(roomId);

        if (!game || game.gameStatus !== "finished") {
          return socket.emit("error", { message: "Cannot request rematch" });
        }

        const player = game.players.find((p) => p.socketId === socket.id);
        if (!player) {
          return socket.emit("error", {
            message: "You are not a player in this game",
          });
        }

        // Initialize rematch requests if not exists
        if (!game.rematchRequests) {
          game.rematchRequests = {};
        }

        game.rematchRequests[player.userId] = true;

        const allPlayersWantRematch = game.players.every(
          (p) => game.rematchRequests[p.userId] === true
        );

        if (allPlayersWantRematch) {
          // Create new game
          const newRoomId = uuidv4();
          const newGameData = {
            roomId: newRoomId,
            boardSize: game.boardSize,
            players: game.players.map((p) => ({
              ...p,
              // Switch symbols for rematch
              symbol: p.symbol === "X" ? "O" : "X",
            })),
            gameStatus: "playing",
            board: new Array(game.boardSize * game.boardSize).fill(""),
            currentPlayer: "X",
            moves: [],
            spectators: game.spectators || [],
          };

          // Save to database if not guest
          if (!socket.isGuest) {
            const newGame = new Game(newGameData);
            newGame.initializeBoard();
            await newGame.save();
          }

          // Move all players to new room
          const oldRoomId = roomId;
          game.players.forEach((p) => {
            const playerSocket = io.sockets.sockets.get(p.socketId);
            if (playerSocket) {
              playerSocket.leave(oldRoomId);
              playerSocket.join(newRoomId);
              playerSocket.roomId = newRoomId;
            }
          });

          // Move spectators to new room
          if (game.spectators) {
            game.spectators.forEach((s) => {
              const spectatorSocket = io.sockets.sockets.get(s.socketId);
              if (spectatorSocket) {
                spectatorSocket.leave(oldRoomId);
                spectatorSocket.join(newRoomId);
                spectatorSocket.roomId = newRoomId;
              }
            });
          }

          activeGames.set(newRoomId, newGameData);
          activeGames.delete(oldRoomId);

          io.to(newRoomId).emit("rematch_started", {
            roomId: newRoomId,
            game: newGameData,
          });
        } else {
          const responder = game.players.find(
            (p) => p.userId !== player.userId
          );
          socket.to(roomId).emit("rematch_requested", {
            requesterId: player.userId,
            requesterName: player.username,
            responderId: responder?.userId,
            responderName: responder?.username,
          });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to request rematch" });
      }
    });

    // Accept rematch
    socket.on("accept_rematch", (data) => {
      const { roomId } = data;
      const game = activeGames.get(roomId);
      if (!game || !game.rematchRequests) return;

      // Mark this user as accepted
      game.rematchRequests[socket.userId] = true;

      // Check if all players have accepted
      const allAccepted = game.players.every(
        (p) => game.rematchRequests[p.userId] === true
      );

      if (allAccepted) {
        // Start new game (same as in request_rematch)
        const newRoomId = uuidv4();
        const newGameData = {
          roomId: newRoomId,
          boardSize: game.boardSize,
          players: game.players.map((p) => ({
            ...p,
            symbol: p.symbol === "X" ? "O" : "X",
          })),
          gameStatus: "playing",
          board: new Array(game.boardSize * game.boardSize).fill(""),
          currentPlayer: "X",
          moves: [],
          spectators: game.spectators || [],
        };

        // Save to database if not guest
        if (!socket.isGuest) {
          const newGame = new Game(newGameData);
          newGame.initializeBoard();
          newGame.save();
        }

        // Move all players to new room
        const oldRoomId = roomId;
        game.players.forEach((p) => {
          const playerSocket = io.sockets.sockets.get(p.socketId);
          if (playerSocket) {
            playerSocket.leave(oldRoomId);
            playerSocket.join(newRoomId);
            playerSocket.roomId = newRoomId;
          }
        });

        // Move spectators to new room
        if (game.spectators) {
          game.spectators.forEach((s) => {
            const spectatorSocket = io.sockets.sockets.get(s.socketId);
            if (spectatorSocket) {
              spectatorSocket.leave(oldRoomId);
              spectatorSocket.join(newRoomId);
              spectatorSocket.roomId = newRoomId;
            }
          });
        }

        activeGames.set(newRoomId, newGameData);
        activeGames.delete(oldRoomId);

        io.to(newRoomId).emit("rematch_started", {
          roomId: newRoomId,
          game: newGameData,
        });
      } else {
        // Notify both players that rematch is accepted by one
        io.to(roomId).emit("rematch_accepted", {
          accepterId: socket.userId,
          accepterName: socket.username,
        });
      }
    });

    // Decline rematch
    socket.on("decline_rematch", (data) => {
      const { roomId } = data;
      const game = activeGames.get(roomId);
      if (!game) return;

      // Notify both players
      io.to(roomId).emit("rematch_declined", {
        declinerId: socket.userId,
        declinerName: socket.username,
      });

      // Reset rematch requests
      game.rematchRequests = {};
    });
  });
};

// Helper function to update player statistics
async function updatePlayerStats(players, winner, forfeitedBy = null) {
  for (const player of players) {
    if (player.userId && !player.isGuest) {
      try {
        const user = await User.findById(player.userId);
        if (user) {
          user.stats = user.stats || {
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
          };

          if (winner === "draw") {
            user.stats.draws += 1;
          } else if (winner === player.symbol) {
            user.stats.wins += 1;
          } else {
            user.stats.losses += 1;
          }

          user.stats.totalGames += 1;

          // Additional penalty for forfeit
          if (forfeitedBy === player.userId) {
            user.stats.forfeits = (user.stats.forfeits || 0) + 1;
          }

          await user.save();
        }
      } catch (error) {
        console.error(
          `Failed to update stats for user ${player.userId}:`,
          error
        );
      }
    }
  }
}

module.exports = gameSocket;
