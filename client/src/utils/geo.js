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
