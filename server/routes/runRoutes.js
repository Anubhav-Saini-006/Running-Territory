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

// @route   GET /api/runs/leaderboard
// @desc    Get top 3 local area explorers based on 5km radius around provided lat/lng
router.get('/leaderboard', async (req, res) => {
  try {
    const centerLat = parseFloat(req.query.lat) || 51.505;
    const centerLng = parseFloat(req.query.lng) || -0.09;
    const radiusKm = parseFloat(req.query.radius) || 5;

    // Fetch runs from DB with populated user details
    const allRuns = await Run.find().populate('userId', 'username email');

    // Aggregate user runs
    const userStatsMap = {};

    allRuns.forEach((run) => {
      if (!run.userId) return;
      const uId = run.userId._id.toString();
      const uName = run.userId.username || 'Explorer';

      if (!userStatsMap[uId]) {
        userStatsMap[uId] = {
          userId: uId,
          username: uName,
          totalDistance: 0,
          runsCount: 0,
          routes: [],
          lastPoint: null
        };
      }

      userStatsMap[uId].totalDistance += run.distance || 0;
      userStatsMap[uId].runsCount += 1;

      if (run.route && run.route.length > 0) {
        userStatsMap[uId].routes.push(run.route);
        userStatsMap[uId].lastPoint = run.route[run.route.length - 1];
      }
    });

    // Haversine distance helper inside route
    const calcDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Filter out any user who has 0 active runs or no routes (e.g. deleted from Compass)
    const leaderboardList = Object.values(userStatsMap)
      .filter((user) => user.runsCount > 0 && user.routes.length > 0 && user.totalDistance > 0)
      .map((user) => {
        const allUserPoints = user.routes.flat();
        let discoveredCount = 0;

        // 30x30 grid sample within 5km circle
        const steps = 30;
        const latDelta = (radiusKm / 111.32) * 2;
        const lngDelta = (radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * 2;
        const minLat = centerLat - latDelta / 2;
        const minLng = centerLng - lngDelta / 2;
        const latStep = latDelta / steps;
        const lngStep = lngDelta / steps;

        let validCells = 0;
        for (let i = 0; i <= steps; i++) {
          for (let j = 0; j <= steps; j++) {
            const cLat = minLat + i * latStep;
            const cLng = minLng + j * lngStep;
            if (calcDist(centerLat, centerLng, cLat, cLng) <= radiusKm * 1000) {
              validCells++;
              const found = allUserPoints.some((pt) => calcDist(cLat, cLng, pt.latitude, pt.longitude) <= 75);
              if (found) discoveredCount++;
            }
          }
        }

        const ratio = validCells > 0 ? discoveredCount / validCells : 0;
        const totalCircleAreaKm2 = Math.PI * radiusKm * radiusKm;

        return {
          userId: user.userId,
          username: user.username,
          percentage: Number((ratio * 100).toFixed(1)),
          discoveredKm2: Number((ratio * totalCircleAreaKm2).toFixed(2)),
          totalDistanceKm: Number((user.totalDistance / 1000).toFixed(2)),
          lastLocation: user.lastPoint || { latitude: centerLat, longitude: centerLng },
          routes: user.routes
        };
      });

    // Filter only active users with >0 discovery
    let combined = leaderboardList.filter((item) => item.discoveredKm2 > 0 || item.totalDistanceKm > 0);

    // Sort descending by percentage
    combined.sort((a, b) => b.percentage - a.percentage);

    // Assign top 3 ranks & badges for real users
    const top3 = combined.slice(0, 3).map((item, index) => {
      const rankBadges = ['🥇 #1 Top Explorer', '🥈 #2 Nearby Explorer', '🥉 #3 Local Pioneer'];
      const rankColors = ['#eab308', '#94a3b8', '#b45309'];
      return {
        ...item,
        rank: index + 1,
        badge: rankBadges[index],
        avatarColor: item.avatarColor || rankColors[index]
      };
    });

    res.json({
      center: { latitude: centerLat, longitude: centerLng },
      radiusKm,
      topExplorers: top3
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
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

// @route   DELETE /api/runs/:id
// @desc    Delete a run by ID for logged-in user
router.delete('/:id', async (req, res) => {
  try {
    const run = await Run.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!run) {
      return res.status(404).json({ message: 'Run not found or unauthorized' });
    }
    res.json({ message: 'Run successfully deleted', id: req.params.id });
  } catch (error) {
    console.error('Delete run error:', error);
    res.status(500).json({ message: 'Server error deleting run' });
  }
});

export default router;


