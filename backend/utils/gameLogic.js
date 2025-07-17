// Game logic utilities for Tic-Tac-Toe

/**
 * Check if there's a winner on the board
 * @param {Array} board - The game board array
 * @param {number} size - Board size (3x3, 4x4, or 5x5)
 * @returns {string|null} - Winner ('X' or 'O') or null if no winner
 */
function checkWinner(board, size = 3) {
  // Check rows
  for (let row = 0; row < size; row++) {
    let count = 1;
    let currentPlayer = board[row * size];
    
    if (!currentPlayer) continue;
    
    for (let col = 1; col < size; col++) {
      if (board[row * size + col] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return currentPlayer;
    }
  }

  // Check columns
  for (let col = 0; col < size; col++) {
    let count = 1;
    let currentPlayer = board[col];
    
    if (!currentPlayer) continue;
    
    for (let row = 1; row < size; row++) {
      if (board[row * size + col] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return currentPlayer;
    }
  }

  // Check main diagonal (top-left to bottom-right)
  let count = 1;
  let currentPlayer = board[0];
  
  if (currentPlayer) {
    for (let i = 1; i < size; i++) {
      if (board[i * size + i] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return currentPlayer;
    }
  }

  // Check anti-diagonal (top-right to bottom-left)
  count = 1;
  currentPlayer = board[size - 1];
  
  if (currentPlayer) {
    for (let i = 1; i < size; i++) {
      if (board[i * size + (size - 1 - i)] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return currentPlayer;
    }
  }

  return null;
}

/**
 * Get the winning combination positions
 * @param {Array} board - The game board array
 * @param {number} size - Board size
 * @returns {Array} - Array of winning position indices
 */
function getWinningCombination(board, size = 3) {
  // Check rows
  for (let row = 0; row < size; row++) {
    let count = 1;
    let currentPlayer = board[row * size];
    
    if (!currentPlayer) continue;
    
    for (let col = 1; col < size; col++) {
      if (board[row * size + col] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return Array.from({ length: size }, (_, i) => row * size + i);
    }
  }

  // Check columns
  for (let col = 0; col < size; col++) {
    let count = 1;
    let currentPlayer = board[col];
    
    if (!currentPlayer) continue;
    
    for (let row = 1; row < size; row++) {
      if (board[row * size + col] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return Array.from({ length: size }, (_, i) => i * size + col);
    }
  }

  // Check main diagonal
  let count = 1;
  let currentPlayer = board[0];
  
  if (currentPlayer) {
    for (let i = 1; i < size; i++) {
      if (board[i * size + i] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return Array.from({ length: size }, (_, i) => i * size + i);
    }
  }

  // Check anti-diagonal
  count = 1;
  currentPlayer = board[size - 1];
  
  if (currentPlayer) {
    for (let i = 1; i < size; i++) {
      if (board[i * size + (size - 1 - i)] === currentPlayer) {
        count++;
      } else {
        break;
      }
    }
    
    if (count === size) {
      return Array.from({ length: size }, (_, i) => i * size + (size - 1 - i));
    }
  }

  return [];
}

/**
 * Check if the board is full (draw condition)
 * @param {Array} board - The game board array
 * @returns {boolean} - True if board is full, false otherwise
 */
function isBoardFull(board) {
  return board.every(cell => cell !== '');
}

/**
 * Get available moves on the board
 * @param {Array} board - The game board array
 * @returns {Array} - Array of available position indices
 */
function getAvailableMoves(board) {
  const availableMoves = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') {
      availableMoves.push(i);
    }
  }
  return availableMoves;
}

/**
 * Validate if a move is legal
 * @param {Array} board - The game board array
 * @param {number} position - Position to check
 * @returns {boolean} - True if move is valid, false otherwise
 */
function isValidMove(board, position) {
  return position >= 0 && position < board.length && board[position] === '';
}

/**
 * Make a move on the board (returns new board, doesn't mutate original)
 * @param {Array} board - The game board array
 * @param {number} position - Position to place the symbol
 * @param {string} player - Player symbol ('X' or 'O')
 * @returns {Array} - New board state after the move
 */
function makeMove(board, position, player) {
  if (!isValidMove(board, position)) {
    throw new Error('Invalid move');
  }
  
  const newBoard = [...board];
  newBoard[position] = player;
  return newBoard;
}

/**
 * Get the current game state
 * @param {Array} board - The game board array
 * @param {number} size - Board size
 * @returns {Object} - Game state object
 */
function getGameState(board, size = 3) {
  const winner = checkWinner(board, size);
  const isFull = isBoardFull(board);
  const availableMoves = getAvailableMoves(board);
  
  let status = 'playing';
  if (winner) {
    status = 'finished';
  } else if (isFull) {
    status = 'draw';
  }
  
  return {
    status,
    winner,
    isFull,
    availableMoves,
    winningCombination: winner ? getWinningCombination(board, size) : []
  };
}

/**
 * Simple AI move calculation (for single-player mode)
 * @param {Array} board - The game board array
 * @param {number} size - Board size
 * @param {string} aiPlayer - AI player symbol
 * @param {string} humanPlayer - Human player symbol
 * @returns {number} - Best move position for AI
 */
function getAIMove(board, size = 3, aiPlayer = 'O', humanPlayer = 'X') {
  // Check if AI can win
  const availableMoves = getAvailableMoves(board);
  
  for (const move of availableMoves) {
    const testBoard = makeMove(board, move, aiPlayer);
    if (checkWinner(testBoard, size) === aiPlayer) {
      return move;
    }
  }
  
  // Check if AI needs to block human from winning
  for (const move of availableMoves) {
    const testBoard = makeMove(board, move, humanPlayer);
    if (checkWinner(testBoard, size) === humanPlayer) {
      return move;
    }
  }
  
  // Take center if available (for 3x3 board)
  if (size === 3) {
    const center = Math.floor(size * size / 2);
    if (availableMoves.includes(center)) {
      return center;
    }
  }
  
  // Take corners if available
  const corners = [];
  if (size === 3) {
    corners.push(0, 2, 6, 8);
  } else if (size === 4) {
    corners.push(0, 3, 12, 15);
  } else if (size === 5) {
    corners.push(0, 4, 20, 24);
  }
  
  const availableCorners = corners.filter(corner => availableMoves.includes(corner));
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }
  
  // Take any available move
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

/**
 * Advanced AI using minimax algorithm
 * @param {Array} board - The game board array
 * @param {number} size - Board size
 * @param {string} aiPlayer - AI player symbol
 * @param {string} humanPlayer - Human player symbol
 * @param {number} depth - Maximum search depth
 * @returns {number} - Best move position for AI
 */
function getAIMoveMinimax(board, size = 3, aiPlayer = 'O', humanPlayer = 'X', depth = 6) {
  const minimax = (currentBoard, currentDepth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const winner = checkWinner(currentBoard, size);
    
    if (winner === aiPlayer) return 10 - currentDepth;
    if (winner === humanPlayer) return currentDepth - 10;
    if (isBoardFull(currentBoard) || currentDepth >= depth) return 0;
    
    const availableMoves = getAvailableMoves(currentBoard);
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of availableMoves) {
        const newBoard = makeMove(currentBoard, move, aiPlayer);
        const eval = minimax(newBoard, currentDepth + 1, false, alpha, beta);
        maxEval = Math.max(maxEval, eval);
        alpha = Math.max(alpha, eval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of availableMoves) {
        const newBoard = makeMove(currentBoard, move, humanPlayer);
        const eval = minimax(newBoard, currentDepth + 1, true, alpha, beta);
        minEval = Math.min(minEval, eval);
        beta = Math.min(beta, eval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  };
  
  const availableMoves = getAvailableMoves(board);
  let bestMove = availableMoves[0];
  let bestScore = -Infinity;
  
  for (const move of availableMoves) {
    const newBoard = makeMove(board, move, aiPlayer);
    const score = minimax(newBoard, 0, false);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

/**
 * Convert position to row/column coordinates
 * @param {number} position - Board position index
 * @param {number} size - Board size
 * @returns {Object} - {row, col} coordinates
 */
function positionToCoords(position, size = 3) {
  return {
    row: Math.floor(position / size),
    col: position % size
  };
}

/**
 * Convert row/column coordinates to position
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} size - Board size
 * @returns {number} - Board position index
 */
function coordsToPosition(row, col, size = 3) {
  return row * size + col;
}

/**
 * Generate all possible winning combinations for a given board size
 * @param {number} size - Board size
 * @returns {Array} - Array of winning combinations
 */
function generateWinningCombinations(size = 3) {
  const combinations = [];
  
  // Rows
  for (let row = 0; row < size; row++) {
    const combination = [];
    for (let col = 0; col < size; col++) {
      combination.push(row * size + col);
    }
    combinations.push(combination);
  }
  
  // Columns
  for (let col = 0; col < size; col++) {
    const combination = [];
    for (let row = 0; row < size; row++) {
      combination.push(row * size + col);
    }
    combinations.push(combination);
  }
  
  // Main diagonal
  const mainDiagonal = [];
  for (let i = 0; i < size; i++) {
    mainDiagonal.push(i * size + i);
  }
  combinations.push(mainDiagonal);
  
  // Anti-diagonal
  const antiDiagonal = [];
  for (let i = 0; i < size; i++) {
    antiDiagonal.push(i * size + (size - 1 - i));
  }
  combinations.push(antiDiagonal);
  
  return combinations;
}

module.exports = {
  checkWinner,
  getWinningCombination,
  isBoardFull,
  getAvailableMoves,
  isValidMove,
  makeMove,
  getGameState,
  getAIMove,
  getAIMoveMinimax,
  positionToCoords,
  coordsToPosition,
  generateWinningCombinations
};