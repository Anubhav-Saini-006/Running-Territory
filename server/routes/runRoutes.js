import express from 'express';
import Run from '../models/Run.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all run routes
router.use(protect);

// Haversine distance calculator helper (in meters)
const calculateHaversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @route   POST /api/runs
// @desc    Create a new completed run with Zero Trust Server-Side Telemetry & Anti-Cheat Validation
router.post('/', async (req, res) => {
  try {
    const { startedAt, endedAt, route } = req.body;

    if (!startedAt || !endedAt) {
      return res.status(400).json({ message: 'Missing run start or end time timestamps' });
    }

    if (!Array.isArray(route) || route.length < 2) {
      return res.status(400).json({ message: 'Route must contain at least 2 valid GPS coordinate points' });
    }

    // 1. Calculate Server-Side Duration (Seconds)
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(endedAt).getTime();
    const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

    // 2. Server-Side Route Processing & Anti-Cheat Analysis
    let serverTotalDistance = 0;
    let vehicleSegmentCount = 0;
    const sanitizedRoute = [route[0]];

    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];

      const distMeters = calculateHaversineMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

      const t1 = p1.timestamp ? new Date(p1.timestamp).getTime() : startTime + i * 1000;
      const t2 = p2.timestamp ? new Date(p2.timestamp).getTime() : startTime + (i + 1) * 1000;
      const deltaSec = Math.max(1, (t2 - t1) / 1000);

      // Instantaneous Speed in km/h
      const speedKmH = (distMeters / deltaSec) * 3.6;

      // Pillar 2: Reject GPS teleportation / noise jump (> 45 km/h instant jump)
      if (speedKmH > 45) {
        console.warn(`⚠️ GPS Teleport Spike Filtered: ${speedKmH.toFixed(1)} km/h between point ${i} and ${i + 1}`);
        continue;
      }

      // Pillar 1: High speed segment trigger (> 28 km/h peak speed limit for human running)
      if (speedKmH > 28) {
        vehicleSegmentCount++;
      }

      serverTotalDistance += distMeters;
      sanitizedRoute.push(p2);
    }

    // 3. Compute Server-Side Derived Metrics
    const distanceKm = serverTotalDistance / 1000;
    const durationMin = durationSec / 60;
    const durationHours = durationSec / 3600;

    const averageSpeedKmH = durationHours > 0 ? Number((distanceKm / durationHours).toFixed(2)) : 0;
    const averagePaceMinKm = distanceKm > 0 ? Number((durationMin / distanceKm).toFixed(2)) : 0;
    const caloriesBurned = Math.round(distanceKm * 65); // 65 kcal/km running average

    // 4. Anti-Cheat Validation Verdict
    let isVehicle = false;
    let isFlagged = false;
    let flagReason = null;

    // Trigger criteria:
    // a) Overall average speed > 22 km/h (Faster than elite human marathon record)
    // b) Sustained high-speed vehicle segments (> 28 km/h peak speed detected in multiple points)
    // c) Impossible fast pace < 2.15 min/km
    if (averageSpeedKmH > 22 || vehicleSegmentCount > 3 || (averagePaceMinKm > 0 && averagePaceMinKm < 2.15)) {
      isVehicle = true;
      isFlagged = true;
      flagReason = `Vehicle speed threshold exceeded (${averageSpeedKmH} km/h avg speed, ${vehicleSegmentCount} high-speed segments detected)`;
      console.warn(`🚨 Anti-Cheat Flagged Run for User ${req.user.id}: ${flagReason}`);
    }

    const newRun = await Run.create({
      userId: req.user.id,
      startedAt,
      endedAt,
      duration: durationSec,
      distance: Math.round(serverTotalDistance),
      averagePace: averagePaceMinKm,
      averageSpeed: averageSpeedKmH,
      calories: caloriesBurned,
      isFlagged,
      isVehicle,
      flagReason,
      route: sanitizedRoute
    });

    res.status(201).json(newRun);
  } catch (error) {
    console.error('Create run error:', error);
    res.status(500).json({ message: 'Server error while processing and validating run' });
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
// @desc    Get top 3 local area explorers based on 5km radius around provided lat/lng (excluding vehicle flagged runs)
router.get('/leaderboard', async (req, res) => {
  try {
    const centerLat = parseFloat(req.query.lat) || 51.505;
    const centerLng = parseFloat(req.query.lng) || -0.09;
    const radiusKm = parseFloat(req.query.radius) || 5;

    // Fetch ONLY legitimate, non-flagged runs from DB
    const allRuns = await Run.find({ isFlagged: { $ne: true }, isVehicle: { $ne: true } }).populate('userId', 'username email');

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

    // Filter out any user who has 0 active legitimate runs
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
            if (calculateHaversineMeters(centerLat, centerLng, cLat, cLng) <= radiusKm * 1000) {
              validCells++;
              const found = allUserPoints.some((pt) => calculateHaversineMeters(cLat, cLng, pt.latitude, pt.longitude) <= 75);
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
