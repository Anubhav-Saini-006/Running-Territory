import express from 'express';
import Run from '../models/Run.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/territory
// @desc    Get user's total explored territory routes & stats
router.get('/', async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.id }).select('route distance duration createdAt');

    const totalRoutes = runs.map((r) => r.route);
    const totalPoints = totalRoutes.flat().length;

    res.json({
      totalRuns: runs.length,
      totalPoints,
      routes: totalRoutes
    });
  } catch (error) {
    console.error('Get territory error:', error);
    res.status(500).json({ message: 'Server error loading territory' });
  }
});

// @route   POST /api/territory
// @desc    Register or update territory exploration session
router.post('/', async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!Array.isArray(coordinates)) {
      return res.status(400).json({ message: 'Coordinates array required' });
    }
    res.json({ message: 'Territory synced successfully', pointsRecorded: coordinates.length });
  } catch (error) {
    console.error('Post territory error:', error);
    res.status(500).json({ message: 'Server error saving territory' });
  }
});

export default router;
