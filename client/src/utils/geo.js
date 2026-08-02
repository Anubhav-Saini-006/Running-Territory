// Calculate distance between two GPS coordinates using Haversine formula (in meters)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Calculate total distance for an array of route points
export const calculateTotalDistance = (route) => {
  if (!route || route.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 1; i < route.length; i++) {
    totalMeters += calculateDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );
  }
  return totalMeters;
};

// Format duration from seconds to MM:SS or HH:MM:SS
export const formatDuration = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

// Calculate Average Pace (minutes per kilometer)
export const calculateAveragePace = (distanceMeters, durationSeconds) => {
  if (!distanceMeters || distanceMeters <= 0 || !durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  const distanceKm = distanceMeters / 1000;
  const durationMinutes = durationSeconds / 60;
  const pace = durationMinutes / distanceKm;
  return Number(pace.toFixed(2));
};

// Format pace (e.g. 5.5 min/km => "5:30 /km")
export const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || isNaN(paceMinPerKm) || paceMinPerKm === 0 || !isFinite(paceMinPerKm)) {
    return '0:00 /km';
  }
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
};

/**
 * Calculate the percentage and total area discovered within a 5km radius circle
 * from (centerLat, centerLng) based on user's route history.
 */
export const calculateDiscoveredArea = (runs = [], centerLat, centerLng, radiusKm = 5, pathBufferMeters = 60) => {
  if (!centerLat || !centerLng) {
    return { percentage: 0, discoveredKm2: 0, totalKm2: Number((Math.PI * radiusKm * radiusKm).toFixed(2)), totalRuns: 0 };
  }

  const radiusMeters = radiusKm * 1000;
  const totalCircleAreaKm2 = Math.PI * radiusKm * radiusKm;

  // Flatten all GPS points from all user runs
  const allPoints = [];
  runs.forEach((run) => {
    if (run.route && Array.isArray(run.route)) {
      run.route.forEach((pt) => {
        allPoints.push(pt);
      });
    }
  });

  if (allPoints.length === 0) {
    return {
      percentage: 0,
      discoveredKm2: 0,
      totalKm2: Number(totalCircleAreaKm2.toFixed(2)),
      totalRuns: runs.length
    };
  }

  // Pre-filter points within (radius + buffer) from center
  const nearbyPoints = allPoints.filter((pt) => {
    const dist = calculateDistance(centerLat, centerLng, pt.latitude, pt.longitude);
    return dist <= radiusMeters + pathBufferMeters;
  });

  if (nearbyPoints.length === 0) {
    return {
      percentage: 0,
      discoveredKm2: 0,
      totalKm2: Number(totalCircleAreaKm2.toFixed(2)),
      totalRuns: runs.length
    };
  }

  // Grid resolution sampling: 60 x 60 grid over 10km x 10km bounding box (~166m cell size)
  const steps = 50;
  const latDelta = (radiusKm / 111.32) * 2; // ~1 deg lat = 111.32 km
  const lngDelta = (radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * 2;

  const minLat = centerLat - latDelta / 2;
  const maxLat = centerLat + latDelta / 2;
  const minLng = centerLng - lngDelta / 2;
  const maxLng = centerLng + lngDelta / 2;

  const latStep = (maxLat - minLat) / steps;
  const lngStep = (maxLng - minLng) / steps;

  let totalValidGridCells = 0;
  let discoveredGridCells = 0;

  for (let i = 0; i <= steps; i++) {
    const cellLat = minLat + i * latStep;
    for (let j = 0; j <= steps; j++) {
      const cellLng = minLng + j * lngStep;

      // Check if grid cell is within 5km radius of center
      const distFromCenter = calculateDistance(centerLat, centerLng, cellLat, cellLng);
      if (distFromCenter <= radiusMeters) {
        totalValidGridCells++;

        // Check if cell is covered by any route point within pathBufferMeters
        const isDiscovered = nearbyPoints.some((pt) => {
          return calculateDistance(cellLat, cellLng, pt.latitude, pt.longitude) <= pathBufferMeters;
        });

        if (isDiscovered) {
          discoveredGridCells++;
        }
      }
    }
  }

  const ratio = totalValidGridCells > 0 ? discoveredGridCells / totalValidGridCells : 0;
  const percentage = Number((ratio * 100).toFixed(1));
  const discoveredKm2 = Number((ratio * totalCircleAreaKm2).toFixed(2));

  return {
    percentage,
    discoveredKm2,
    totalKm2: Number(totalCircleAreaKm2.toFixed(2)),
    totalRuns: runs.length
  };
};

