import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateTotalDistance, calculateAveragePace, formatDuration, formatPace } from '../utils/geo';

const LOCAL_STORAGE_SESSION_KEY = 'running_territory_active_run';

const RunTracker = ({ onRouteUpdate, onRunComplete }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [duration, setDuration] = useState(0);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [averagePace, setAveragePace] = useState(0);
  const [permissionError, setPermissionError] = useState('');
  const [isRestored, setIsRestored] = useState(false);

  const watchIdRef = useRef(null);
  const timerIdRef = useRef(null);

  // Helper to compute exact elapsed seconds based on startedAt timestamp
  const computeElapsedSeconds = useCallback((startTime) => {
    if (!startTime) return 0;
    const startMs = new Date(startTime).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
  }, []);

  // Stop location tracking and timers
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  // Start live GPS watchPosition stream
  const startGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date(position.timestamp).toISOString()
        };
        setRoute((prevRoute) => {
          const updatedRoute = [...prevRoute, newPoint];
          // Sync active run state to localStorage for page refresh / app-switch recovery
          try {
            const sessionData = {
              isTracking: true,
              startedAt: startedAt ? startedAt.toISOString() : new Date().toISOString(),
              route: updatedRoute
            };
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionData));
          } catch (e) {
            console.error('Failed to sync run session to localStorage:', e);
          }
          return updatedRoute;
        });
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
  }, [startedAt]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, [stopLocationTracking]);

  // Restore active run session from localStorage on mount (App-switch / tab-reload resilience)
  useEffect(() => {
    try {
      const savedSessionStr = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (savedSessionStr) {
        const savedSession = JSON.parse(savedSessionStr);
        if (savedSession && savedSession.isTracking && savedSession.startedAt) {
          const restoredStartTime = new Date(savedSession.startedAt);
          setStartedAt(restoredStartTime);
          const restoredRoute = savedSession.route || [];
          setRoute(restoredRoute);
          setIsTracking(true);
          setIsRestored(true);

          const initialDuration = Math.max(0, Math.floor((Date.now() - restoredStartTime.getTime()) / 1000));
          setDuration(initialDuration);

          if (restoredRoute.length >= 2) {
            const dist = calculateTotalDistance(restoredRoute);
            setDistance(dist);
            setAveragePace(calculateAveragePace(dist, initialDuration));
          }

          onRouteUpdate(restoredRoute);
          startGpsWatch();
        }
      }
    } catch (err) {
      console.error('Error recovering active run session:', err);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
  }, []); // Run once on mount

  // Live timer interval: recalculates from startedAt timestamp every second (immune to timer drift)
  useEffect(() => {
    if (isTracking && startedAt) {
      timerIdRef.current = setInterval(() => {
        setDuration(computeElapsedSeconds(startedAt));
      }, 1000);
    } else {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    }

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [isTracking, startedAt, computeElapsedSeconds]);

  // Recalculate duration & verify GPS stream whenever user switches back to app tab (visibilitychange event)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTracking && startedAt) {
        // App was brought back to foreground (e.g. after choosing music)
        const currentElapsed = computeElapsedSeconds(startedAt);
        setDuration(currentElapsed);

        // Ensure GPS watch is still active; re-establish if OS interrupted it
        if (!watchIdRef.current && 'geolocation' in navigator) {
          startGpsWatch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, startedAt, computeElapsedSeconds, startGpsWatch]);

  // Recalculate distance and pace whenever route or duration changes
  useEffect(() => {
    if (route.length >= 2) {
      const dist = calculateTotalDistance(route);
      setDistance(dist);
      const pace = calculateAveragePace(dist, duration);
      setAveragePace(pace);
    }
    onRouteUpdate(route);
  }, [route, duration, onRouteUpdate]);

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
    setIsRestored(false);

    // Initial localStorage seed
    try {
      localStorage.setItem(
        LOCAL_STORAGE_SESSION_KEY,
        JSON.stringify({ isTracking: true, startedAt: startTime.toISOString(), route: [] })
      );
    } catch (e) {
      console.error('Failed to initialize session in localStorage:', e);
    }

    startGpsWatch();
  };

  // Discard Run
  const handleDiscardRun = () => {
    if (window.confirm('Are you sure you want to discard this active run?')) {
      stopLocationTracking();
      setIsTracking(false);
      setStartedAt(null);
      setDuration(0);
      setDistance(0);
      setAveragePace(0);
      setRoute([]);
      setIsRestored(false);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      onRouteUpdate([]);
    }
  };

  // Stop & Save Run
  const handleStopRun = () => {
    setIsTracking(false);
    const endTime = new Date();

    stopLocationTracking();
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);

    if (route.length < 2) {
      alert('Run route is too short to save. Please track for a bit longer.');
      onRouteUpdate([]);
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

    setIsRestored(false);
    onRunComplete(finalRunData);
  };

  return (
    <div className="run-tracker-card">
      <div className="tracker-header">
        <h2>Live Run Telemetry</h2>
        {isTracking && <span className="live-badge">🔴 GPS Live</span>}
      </div>

      {isRestored && isTracking && (
        <div className="alert alert-info" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          ⚡ Restored active run session from background switch / tab reload.
        </div>
      )}

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
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button onClick={handleStopRun} className="btn btn-danger btn-lg" style={{ flex: 2 }}>
              ⏹ Stop & Save Run
            </button>
            <button onClick={handleDiscardRun} className="btn btn-secondary btn-lg" style={{ flex: 1 }}>
              🗑 Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunTracker;
