import express from 'express';
import User from '../models/User.js';
import Run from '../models/Run.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/users/profile
// @desc    Get user profile with stats
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compute live stats from user's runs
    const runs = await Run.find({ userId: req.user.id }).sort({ startedAt: -1 });

    const totalRuns = runs.length;
    const totalDistance = runs.reduce((acc, r) => acc + (r.distance || 0), 0);
    const longestRun = runs.reduce((max, r) => Math.max(max, r.distance || 0), 0);
    const totalDurationSec = runs.reduce((acc, r) => acc + (r.duration || 0), 0);
    const averagePace = totalDistance > 0 ? (totalDurationSec / 60) / (totalDistance / 1000) : 0;
    const caloriesBurned = runs.reduce((acc, r) => acc + (r.calories || Math.round((r.distance / 1000) * 65)), 0);

    res.json({
      user: {
        id: user._id,
        name: user.name || user.username,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        totalDistance,
        totalRuns,
        longestRun,
        averagePace: Number(averagePace.toFixed(2)),
        caloriesBurned,
        currentStreak: user.currentStreak || (totalRuns > 0 ? 1 : 0)
      },
      recentRuns: runs.slice(0, 5)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error loading profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile details
router.put('/profile', async (req, res) => {
  try {
    const { name, bio, profilePicture } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

export default router;
