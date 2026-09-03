import express from 'express';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User.js';
import Run from '../models/Run.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Helper function to calculate active consecutive day running streak
const calculateRunningStreak = (runs) => {
  if (!runs || runs.length === 0) return 0;

  // Extract unique run dates formatted as YYYY-MM-DD in local time
  const dateStrings = Array.from(
    new Set(
      runs.map((r) => {
        const d = new Date(r.startedAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })
    )
  ).sort().reverse(); // Most recent dates first

  if (dateStrings.length === 0) return 0;

  const today = new Date();
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);

  // If user hasn't run today AND hasn't run yesterday, streak is broken (0)
  const hasRunToday = dateStrings.includes(todayStr);
  const hasRunYesterday = dateStrings.includes(yesterdayStr);

  if (!hasRunToday && !hasRunYesterday) {
    return 0;
  }

  // Count consecutive days going backwards starting from today or yesterday
  let streak = 0;
  let checkDate = hasRunToday ? today : yesterday;

  while (true) {
    const checkStr = formatYMD(checkDate);
    if (dateStrings.includes(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1); // Move back 1 day
    } else {
      break;
    }
  }

  return streak;
};

// @route   GET /api/users/profile
// @desc    Get user profile with accurate live telemetry stats & streak
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compute live stats from user's legitimate runs
    const allRuns = await Run.find({ userId: req.user.id }).sort({ startedAt: -1 });
    const validRuns = allRuns.filter((r) => !r.isFlagged && !r.isVehicle);

    const totalRuns = validRuns.length;
    const totalDistance = validRuns.reduce((acc, r) => acc + (r.distance || 0), 0);
    const longestRun = validRuns.reduce((max, r) => Math.max(max, r.distance || 0), 0);
    const totalDurationSec = validRuns.reduce((acc, r) => acc + (r.duration || 0), 0);
    const averagePace = totalDistance > 0 ? (totalDurationSec / 60) / (totalDistance / 1000) : 0;
    const currentStreak = calculateRunningStreak(validRuns);

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
        currentStreak
      },
      recentRuns: allRuns.slice(0, 5)
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

// @route   POST /api/users/profile/upload-photo
// @desc    Upload profile photo to Cloudinary with sanitized API credentials
router.post('/profile/upload-photo', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Please select an image file to upload' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim().replace(/^["']|["']$/g, '') : null;
    const apiKey = process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim().replace(/^["']|["']$/g, '') : null;
    const apiSecret = process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim().replace(/^["']|["']$/g, '') : null;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        message: 'Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or misconfigured in server settings.'
      });
    }

    // Configure Cloudinary dynamically with clean credentials
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'running_territory_profiles',
      resource_type: 'image'
    });

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    user.profilePicture = uploadResponse.secure_url;
    await user.save();

    res.json({
      message: 'Profile photo uploaded successfully!',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Cloudinary photo upload error:', error);
    res.status(400).json({
      message: error.message || 'Error uploading profile photo to Cloudinary. Please check Cloudinary API secret credentials.'
    });
  }
});

// @route   DELETE /api/users/profile
// @desc    Delete logged-in user account & all associated runs (Requires Password Authentication)
router.delete('/profile', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password to authorize account deletion' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Account deletion unauthorized.' });
    }

    // Cascading deletion: Delete user's runs and territory data
    await Run.deleteMany({ userId: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: 'Your account and all associated territory data have been permanently deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error while deleting account' });
  }
});

export default router;
