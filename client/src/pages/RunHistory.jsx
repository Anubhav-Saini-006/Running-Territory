import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RunMap from '../components/RunMap';
import ConfirmModal from '../components/ConfirmModal';
import { formatDuration, formatPace } from '../utils/geo';

const RunHistory = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [deletingRunId, setDeletingRunId] = useState(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/runs');
      setRuns(res.data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
      setError('Error loading run history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingRunId) return;
    try {
      await axios.delete(`/api/runs/${deletingRunId}`);
      setRuns((prev) => prev.filter((r) => r._id !== deletingRunId));
      if (selectedRun?._id === deletingRunId) {
        setSelectedRun(null);
      }
      setToastMessage('🗑️ Run removed successfully');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Error deleting run.');
    } finally {
      setDeletingRunId(null);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading running history...</div>;
  }

  return (
    <div className="run-history-container">
      <ConfirmModal
        isOpen={Boolean(deletingRunId)}
        title="Delete Run Record?"
        message="Are you sure you want to delete this recorded run? This action cannot be undone."
        confirmText="Yes, Delete Run"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingRunId(null)}
      />

      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      <div className="history-header">
        <h2>Run History</h2>
        <span className="history-count">{runs.length} Runs Recorded</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {runs.length === 0 ? (
        <div className="empty-history-card">
          <h3>No Runs Logged Yet</h3>
          <p>Start a run session on the dashboard to record your territory exploration routes!</p>
        </div>
      ) : (
        <div className="history-grid-layout">
          {/* List of Run Cards */}
          <div className="history-runs-list">
            {runs.map((run) => {
              const isSelected = selectedRun?._id === run._id;
              const dateStr = new Date(run.startedAt).toLocaleString();
              const distKm = (run.distance / 1000).toFixed(2);

              return (
                <div
                  key={run._id}
                  className={`history-card-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="history-card-header">
                    <span className="history-date">📅 {dateStr}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingRunId(run._id);
                      }}
                      className="delete-run-btn"
                      title="Delete run"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="history-metrics-row">
                    <div className="metric">
                      <span className="m-val">{distKm} km</span>
                      <span className="m-lbl">Distance</span>
                    </div>
                    <div className="metric">
                      <span className="m-val">{formatDuration(run.duration)}</span>
                      <span className="m-lbl">Time</span>
                    </div>
                    <div className="metric">
                      <span className="m-val">{formatPace(run.averagePace)}</span>
                      <span className="m-lbl">Avg Pace</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Run Detail & Interactive Route Map */}
          <div className="history-detail-panel">
            {selectedRun ? (
              <div className="detail-card">
                <div className="detail-header">
                  <h3>Route Telemetry Snapshot</h3>
                  <span className="detail-date">{new Date(selectedRun.startedAt).toLocaleString()}</span>
                </div>

                <div className="detail-map-wrapper">
                  <RunMap key={selectedRun?._id || 'history-map'} selectedRun={selectedRun} allRuns={runs} isHistoryPage={true} />
                </div>

                <div className="detail-stats-summary">
                  <div className="d-stat">
                    <span>Total Distance:</span>
                    <strong>{(selectedRun.distance / 1000).toFixed(2)} km</strong>
                  </div>
                  <div className="d-stat">
                    <span>Duration:</span>
                    <strong>{formatDuration(selectedRun.duration)}</strong>
                  </div>
                  <div className="d-stat">
                    <span>Average Pace:</span>
                    <strong>{formatPace(selectedRun.averagePace)}</strong>
                  </div>
                  <div className="d-stat">
                    <span>Average Speed:</span>
                    <strong>{selectedRun.averageSpeed || ((selectedRun.distance / 1000) / (selectedRun.duration / 3600)).toFixed(2)} km/h</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="select-prompt">
                <p>👉 Select a run card from the list to view its interactive route map & full statistics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RunHistory;
