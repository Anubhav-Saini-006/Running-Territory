import express from 'express';
import Run from '../models/Run.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all run routes
router.use(protect);

// @route   POST /api/runs
// @desc    Create a new completed run
router.post('/', async (req, res) => {
  try {
    const { startedAt, endedAt, duration, distance, averagePace, route } = req.body;

    if (!startedAt || !endedAt || duration === undefined || distance === undefined || averagePace === undefined) {
      return res.status(400).json({ message: 'Missing required run data fields' });
    }

    if (!Array.isArray(route)) {
      return res.status(400).json({ message: 'Route must be an array of GPS objects' });
    }

    const newRun = await Run.create({
      userId: req.user.id,
      startedAt,
      endedAt,
      duration,
      distance,
      averagePace,
      route
    });

    res.status(201).json(newRun);
  } catch (error) {
    console.error('Create run error:', error);
    res.status(500).json({ message: 'Server error while saving run' });
  }
});

// @route   GET /api/runs
// @desc    Get all runs for the logged-in user
router.get('/', async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.id }).sort({ startedAt: -1 });
    res.json(runs);
  } catch (error) {
    console.error('Get runs error:', error);
    res.status(500).json({ message: 'Server error while fetching runs' });
  }
});

// @route   GET /api/runs/:id
// @desc    Get single run by ID for logged-in user
router.get('/:id', async (req, res) => {
  try {
    const run = await Run.findOne({ _id: req.params.id, userId: req.user.id });
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }
    res.json(run);
  } catch (error) {
    console.error('Get single run error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
