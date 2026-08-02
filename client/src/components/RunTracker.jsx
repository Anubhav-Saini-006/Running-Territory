import React, { useState, useEffect, useRef } from 'react';
import { calculateTotalDistance, calculateAveragePace, formatDuration, formatPace } from '../utils/geo';

const RunTracker = ({ onRouteUpdate, onRunComplete }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [duration, setDuration] = useState(0);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [averagePace, setAveragePace] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  const watchIdRef = useRef(null);
  const timerIdRef = useRef(null);

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
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
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

    // Permission granted! Begin live GPS tracking session
    const startTime = new Date();
    setStartedAt(startTime);
    setDuration(0);
    setDistance(0);
    setAveragePace(0);
    setRoute([]);
    setIsTracking(true);

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
        <h2>Live Run Telemetry</h2>
        {isTracking && <span className="live-badge">🔴 GPS Live</span>}
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
          <button onClick={handleStartRun} className="btn btn-success btn-lg btn-block">
            ▶ Start Run
          </button>
        ) : (
          <button onClick={handleStopRun} className="btn btn-danger btn-lg btn-block">
            ⏹ Stop Run
          </button>
        )}
      </div>
    </div>
  );
};

export default RunTracker;
