import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RunMap from '../components/RunMap';
import RunTracker from '../components/RunTracker';
import RunList from '../components/RunList';

const Dashboard = () => {
  const [runs, setRuns] = useState([]);
  const [activeRoute, setActiveRoute] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Fetch runs for the logged-in user
  const fetchRuns = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/runs');
      setRuns(response.data);
      if (response.data.length > 0) {
        setSelectedRun(response.data[0]); // Select most recent run by default
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
      setError('Could not load running history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Update active route from tracker
  const handleRouteUpdate = useCallback((newRoute) => {
    setActiveRoute(newRoute);
    if (newRoute.length > 0) {
      setSelectedRun(null); // Deselect historical run when active tracking is running
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
      
      // Trigger timed 3-second pop-up notification
      setToastMessage('🎉 Run successfully saved!');
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
  };

  const currentPosition = activeRoute.length > 0 ? activeRoute[activeRoute.length - 1] : null;

  return (
    <div className="dashboard-container">
      {/* 3-Second Timed Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      <div className="dashboard-layout">
        {/* Left Panel: Run Tracker & History */}
        <div className="dashboard-sidebar">
          <RunTracker
            onRouteUpdate={handleRouteUpdate}
            onRunComplete={handleRunComplete}
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

        {/* Right Panel: Interactive Map */}
        <div className="dashboard-main">
          <RunMap
            activeRoute={activeRoute}
            currentPosition={currentPosition}
            selectedRun={selectedRun}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
