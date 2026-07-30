import React, { useState, useEffect, useRef } from 'react';
import { calculateTotalDistance, calculateAveragePace, formatDuration, formatPace } from '../utils/geo';

const RunTracker = ({ onRouteUpdate, onRunComplete }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [duration, setDuration] = useState(0);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [averagePace, setAveragePace] = useState(0);
  const [useSimulation, setUseSimulation] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const watchIdRef = useRef(null);
  const timerIdRef = useRef(null);
  const simIdRef = useRef(null);

  // Stop location tracking and timers on cleanup (respect privacy)
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Live timer interval when tracking
  useEffect(() => {
    if (isTracking) {
      timerIdRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIdRef.current);
    }

    return () => clearInterval(timerIdRef.current);
  }, [isTracking]);

  // Recalculate distance and pace whenever route changes
  useEffect(() => {
    if (route.length >= 2) {
      const dist = calculateTotalDistance(route);
      setDistance(dist);
      const pace = calculateAveragePace(dist, duration);
      setAveragePace(pace);
    }
    onRouteUpdate(route);
  }, [route, duration, onRouteUpdate]);

  // Stop tracking and turn off GPS hardware
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIdRef.current !== null) {
      clearInterval(simIdRef.current);
      simIdRef.current = null;
    }
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  // Helper to fetch road-snapped walking path using free OpenStreetMap OSRM API
  const fetchRoadSnappedPath = async (startLat, startLng) => {
    try {
      // Pick a destination point ~1km away along nearby roads
      const destLat = startLat + 0.008;
      const destLng = startLng + 0.008;
      const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        // Extract array of [lng, lat] coordinates from GeoJSON
        const coords = data.routes[0].geometry.coordinates;
        return coords.map((c) => ({
          latitude: c[1],
          longitude: c[0],
          timestamp: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn('OSRM routing fallback to local road path:', err);
    }
    return null;
  };

  // Start Run
  const handleStartRun = async () => {
    setPermissionError('');

    if (!('geolocation' in navigator)) {
      setPermissionError('Geolocation is not supported by your browser.');
      return;
    }

    // Step 1: Explicitly request/verify location permission before starting
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
    } catch (err) {
      if (err.code === err.PERMISSION_DENIED) {
        setPermissionError('Location permission denied. Please allow location access in your browser settings to track runs.');
      } else {
        setPermissionError(`Unable to acquire location: ${err.message}`);
      }
      return;
    }

    // Permission granted! Begin tracking session
    const startTime = new Date();
    setStartedAt(startTime);
    setDuration(0);
    setDistance(0);
    setAveragePace(0);
    setRoute([]);
    setIsTracking(true);

    if (useSimulation) {
      // Road-Following Simulation Mode
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const startLat = pos.coords.latitude;
        const startLng = pos.coords.longitude;

        // Fetch real road/bridge snapped path using OSRM foot routing
        const roadPoints = await fetchRoadSnappedPath(startLat, startLng);

        if (roadPoints && roadPoints.length > 0) {
          let stepIndex = 0;
          setRoute([roadPoints[0]]);

          simIdRef.current = setInterval(() => {
            stepIndex++;
            if (stepIndex < roadPoints.length) {
              setRoute((prev) => [...prev, { ...roadPoints[stepIndex], timestamp: new Date().toISOString() }]);
            } else {
              clearInterval(simIdRef.current);
            }
          }, 1500);
        } else {
          // Fallback simulation
          let currentLat = startLat;
          let currentLng = startLng;
          setRoute([{ latitude: currentLat, longitude: currentLng, timestamp: new Date().toISOString() }]);

          simIdRef.current = setInterval(() => {
            currentLat += 0.0001;
            currentLng += 0.0001;
            setRoute((prev) => [
              ...prev,
              { latitude: currentLat, longitude: currentLng, timestamp: new Date().toISOString() }
            ]);
          }, 1500);
        }
      });
    } else {
      // Live GPS tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date(position.timestamp).toISOString()
          };
          setRoute((prevRoute) => [...prevRoute, newPoint]);
        },
        (error) => {
          console.error('Geolocation tracking error:', error.message);
          setPermissionError(`Location error during run: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );
    }
  };

  // Stop Run
  const handleStopRun = () => {
    setIsTracking(false);
    const endTime = new Date();

    // Turn off GPS hardware immediately to respect privacy
    stopLocationTracking();

    if (route.length < 2) {
      alert('Run route is too short to save. Please track for a bit longer.');
      return;
    }

    const finalRunData = {
      startedAt: startedAt ? startedAt.toISOString() : new Date().toISOString(),
      endedAt: endTime.toISOString(),
      duration,
      distance: Math.round(distance), // in meters
      averagePace,
      route
    };

    onRunComplete(finalRunData);
  };

  return (
    <div className="run-tracker-card">
      <div className="tracker-header">
        <h2>Run Telemetry</h2>
        <label className="sim-toggle">
          <input
            type="checkbox"
            checked={useSimulation}
            onChange={(e) => setUseSimulation(e.target.checked)}
            disabled={isTracking}
          />
          Desktop Simulation Mode (Road Snapped)
        </label>
      </div>

      {permissionError && <div className="alert alert-danger">{permissionError}</div>}

      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="telemetry-label">Duration</span>
          <span className="telemetry-value">{formatDuration(duration)}</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Distance</span>
          <span className="telemetry-value">{(distance / 1000).toFixed(2)} km</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Avg Pace</span>
          <span className="telemetry-value">{formatPace(averagePace)}</span>
        </div>
      </div>

      <div className="tracker-actions">
        {!isTracking ? (
          <button onClick={handleStartRun} className="btn btn-success btn-lg">
            ▶ Start Run
          </button>
        ) : (
          <button onClick={handleStopRun} className="btn btn-danger btn-lg">
            ⏹ Stop Run
          </button>
        )}
      </div>
    </div>
  );
};

export default RunTracker;

