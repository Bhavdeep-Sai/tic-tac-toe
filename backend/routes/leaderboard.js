const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get leaderboard (no time filtering)
router.get('/', async (req, res) => {
  try {
    const { filter = 'overall', limit = 100 } = req.query;

    const users = await User.find()
      .select('username stats lastActive createdAt')
      .limit(parseInt(limit));

    const now = new Date();

    const leaderboard = users.map(user => {
      const stats = user.stats || { wins: 0, losses: 0, draws: 0, currentStreak: 0 };
      const totalGames = stats.wins + stats.losses + stats.draws;
      const winRate = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;
      const overallRating = stats.wins * 3 + stats.draws * 1 - stats.losses * 1;

      return {
        _id: user._id,
        username: user.username,
        stats: {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          currentStreak: stats.currentStreak,
          totalGames,
          winRate: parseFloat(winRate.toFixed(1)),
          overallRating
        },
        lastActive: user.lastActive,
        isOnline: user.lastActive && (now - user.lastActive) < 5 * 60 * 1000
      };
    });

    leaderboard.sort((a, b) => {
      switch (filter) {
        case 'wins':
          return b.stats.wins - a.stats.wins;
        case 'winRate':
          const aGames = a.stats.totalGames;
          const bGames = b.stats.totalGames;
          if (aGames < 5 && bGames < 5) return b.stats.wins - a.stats.wins;
          if (aGames < 5) return 1;
          if (bGames < 5) return -1;
          return b.stats.winRate - a.stats.winRate;
        case 'streak':
          return b.stats.currentStreak - a.stats.currentStreak;
        default:
          return b.stats.overallRating - a.stats.overallRating;
      }
    });

    res.json({
      success: true,
      leaderboard,
      filter,
      total: leaderboard.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank (no time filtering)
router.get('/rank', auth, async (req, res) => {
  try {
    const { filter = 'overall' } = req.query;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userStats = user.stats || { wins: 0, losses: 0, draws: 0, currentStreak: 0 };
    const totalGames = userStats.wins + userStats.losses + userStats.draws;
    const winRate = totalGames > 0 ? (userStats.wins / totalGames) * 100 : 0;
    const overallRating = userStats.wins * 3 + userStats.draws * 1 - userStats.losses * 1;

    let betterUsersCount = 0;

    switch (filter) {
      case 'wins':
        betterUsersCount = await User.countDocuments({
          'stats.wins': { $gt: userStats.wins }
        });
        break;
      case 'winRate':
        const allUsers = await User.find().select('stats');
        betterUsersCount = allUsers.filter(u => {
          const uStats = u.stats || { wins: 0, losses: 0, draws: 0 };
          const uTotal = uStats.wins + uStats.losses + uStats.draws;
          const uWinRate = uTotal > 0 ? (uStats.wins / uTotal) * 100 : 0;

          if (totalGames < 5 && uTotal >= 5) return true;
          if (totalGames >= 5 && uTotal < 5) return false;
          if (totalGames < 5 && uTotal < 5) return uStats.wins > userStats.wins;
          return uWinRate > winRate;
        }).length;
        break;
      case 'streak':
        betterUsersCount = await User.countDocuments({
          'stats.currentStreak': { $gt: userStats.currentStreak }
        });
        break;
      default:
        const allUsersForOverall = await User.find().select('stats');
        betterUsersCount = allUsersForOverall.filter(u => {
          const uStats = u.stats || { wins: 0, losses: 0, draws: 0 };
          const uRating = uStats.wins * 3 + uStats.draws - uStats.losses;
          return uRating > overallRating;
        }).length;
        break;
    }

    res.json({
      rank: betterUsersCount + 1,
      stats: {
        wins: userStats.wins,
        losses: userStats.losses,
        draws: userStats.draws,
        currentStreak: userStats.currentStreak,
        totalGames,
        winRate: parseFloat(winRate.toFixed(1)),
        overallRating
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
