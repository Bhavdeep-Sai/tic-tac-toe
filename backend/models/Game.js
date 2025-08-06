const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Allow null for guest players
    },
    username: String,
    symbol: {
      type: String,
      enum: ['X', 'O']
    },
    socketId: String,
    isGuest: {
      type: Boolean,
      default: false
    }
  }],
  boardSize: {
    type: Number,
    default: 3,
    enum: [3, 4, 5]
  },
  board: [{
    type: String,
    default: ''
  }],
  currentPlayer: {
    type: String,
    enum: ['X', 'O'],
    default: 'X'
  },
  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: String,
    enum: ['X', 'O', 'draw', null],
    default: null
  },
  winningCombination: [Number],
  moves: [{
    player: String,
    position: Number,
    timestamp: Date
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  finishedAt: Date
}, {
  timestamps: true
});

gameSchema.methods.initializeBoard = function() {
  const size = this.boardSize;
  this.board = new Array(size * size).fill('');
};

gameSchema.methods.makeMove = function(position, player) {
  if (this.board[position] === '' && this.currentPlayer === player) {
    this.board[position] = player;
    this.moves.push({
      player,
      position,
      timestamp: new Date()
    });
    this.currentPlayer = player === 'X' ? 'O' : 'X';
    return true;
  }
  return false;
};

module.exports = mongoose.model('Game', gameSchema);