import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import axios from 'axios';
import RunMap from '../components/RunMap';
import RunTracker from '../components/RunTracker';
import RunList from '../components/RunList';
import AreaDiscoveryCard from '../components/AreaDiscoveryCard';
import TopExplorersWidget from '../components/TopExplorersWidget';
import { calculateDiscoveredArea } from '../utils/geo';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user: authUser } = useContext(AuthContext);
  const [runs, setRuns] = useState([]);
  const [activeRoute, setActiveRoute] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [topExplorers, setTopExplorers] = useState([]);
  const [focusedExplorer, setFocusedExplorer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [userCenter, setUserCenter] = useState({ latitude: 51.505, longitude: -0.09 });

  // Fetch initial browser location for centering discovery zone if possible
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCenter({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => console.log('Geolocation init notice:', err.message),
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch runs for the logged-in user
  const fetchRuns = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/runs');
      setRuns(response.data);
      // Keep selectedRun null by default so user's entire explored territory is shown on map
      if (response.data.length > 0 && response.data[0].route && response.data[0].route.length > 0) {
        const lastPt = response.data[0].route[response.data[0].route.length - 1];
        setUserCenter({ latitude: lastPt.latitude, longitude: lastPt.longitude });
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
      setError('Could not load running history.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Top 3 Nearby Explorers Leaderboard
  const fetchLeaderboard = useCallback(async (lat, lng) => {
    try {
      const response = await axios.get(`/api/runs/leaderboard?lat=${lat}&lng=${lng}&radius=5`);
      if (response.data && response.data.topExplorers) {
        setTopExplorers(response.data.topExplorers);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, []);

  // Refresh leaderboard when center updates
  useEffect(() => {
    if (userCenter.latitude && userCenter.longitude) {
      fetchLeaderboard(userCenter.latitude, userCenter.longitude);
    }
  }, [userCenter, fetchLeaderboard]);

  // Update active route from tracker
  const handleRouteUpdate = useCallback((newRoute) => {
    setActiveRoute(newRoute);
    if (newRoute.length > 0) {
      setSelectedRun(null);
      const currentPt = newRoute[newRoute.length - 1];
      setUserCenter({ latitude: currentPt.latitude, longitude: currentPt.longitude });
    }
  }, []);

  // Save completed run
  const handleRunComplete = async (runData) => {
    try {
      const response = await axios.post('/api/runs', runData);
      const savedRun = response.data;
      setRuns((prevRuns) => [savedRun, ...prevRuns]);
      setSelectedRun(savedRun);
      setActiveRoute([]);

      // Refresh leaderboard after saving run
      if (savedRun.route && savedRun.route.length > 0) {
        const lastPt = savedRun.route[savedRun.route.length - 1];
        fetchLeaderboard(lastPt.latitude, lastPt.longitude);
      }

      setToastMessage('🎉 Run saved! Territory updated.');
      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (err) {
      console.error('Failed to save run:', err);
      setToastMessage('❌ Error saving run to database.');
      setTimeout(() => {
        setToastMessage('');
      }, 3000);
    }
  };

  // Select historical run
  const handleSelectRun = (run) => {
    setSelectedRun(run);
    setActiveRoute([]);
    setFocusedExplorer(null);
    if (run.route && run.route.length > 0) {
      const pt = run.route[run.route.length - 1];
      setUserCenter({ latitude: pt.latitude, longitude: pt.longitude });
    }
  };

  // Focus on top explorer from leaderboard
  const handleSelectExplorer = (explorer) => {
    setFocusedExplorer(explorer);
  };

  const currentPosition = activeRoute.length > 0 ? activeRoute[activeRoute.length - 1] : null;

  // Calculate user's 5km Area Discovery stats
  const discoveryStats = useMemo(() => {
    // Combine saved runs and current active route
    const allUserRuns = [...runs];
    if (activeRoute.length > 0) {
      allUserRuns.push({ route: activeRoute });
    }
    return calculateDiscoveredArea(
      allUserRuns,
      userCenter.latitude,
      userCenter.longitude,
      5 // 5km radius
    );
  }, [runs, activeRoute, userCenter]);

  return (
    <div className="dashboard-container">
      {/* 3-Second Timed Toast Notification */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      <div className="dashboard-layout">
        {/* Left Panel: Tracker, Area Discovery Card, Top Explorers, Run History */}
        <div className="dashboard-sidebar">
          {/* Territory Area Discovery Percentage Card */}
          <AreaDiscoveryCard discoveryStats={discoveryStats} />

          {/* Run Tracker Telemetry Component */}
          <RunTracker
            onRouteUpdate={handleRouteUpdate}
            onRunComplete={handleRunComplete}
          />

          {/* Top 3 Local Explorers Leaderboard Widget */}
          <TopExplorersWidget
            topExplorers={topExplorers}
            onSelectExplorer={handleSelectExplorer}
            selectedExplorerId={focusedExplorer?.userId}
          />

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="loading-spinner">Loading running history...</div>
          ) : (
            <RunList
              runs={runs}
              selectedRun={selectedRun}
              onSelectRun={handleSelectRun}
            />
          )}
        </div>

        {/* Right Panel: Interactive Map with Discovery Zone & Top Explorers Overlay */}
        <div className="dashboard-main">
          <RunMap
            activeRoute={activeRoute}
            currentPosition={currentPosition}
            selectedRun={selectedRun}
            allRuns={runs}
            topExplorers={topExplorers}
            focusedExplorer={focusedExplorer}
            currentUserId={authUser?.id || authUser?._id}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
