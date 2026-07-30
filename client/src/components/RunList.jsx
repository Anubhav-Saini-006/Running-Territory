import React from 'react';
import { formatDuration, formatPace } from '../utils/geo';

const RunList = ({ runs = [], selectedRun = null, onSelectRun }) => {
  if (!runs || runs.length === 0) {
    return (
      <div className="run-list-card">
        <h3>Previous Runs</h3>
        <p className="no-runs-message">No runs recorded yet. Start a run above!</p>
      </div>
    );
  }

  return (
    <div className="run-list-card">
      <h3>Previous Runs ({runs.length})</h3>
      <div className="runs-scroll-container">
        {runs.map((run) => {
          const isSelected = selectedRun && selectedRun._id === run._id;
          const dateStr = new Date(run.startedAt).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short'
          });

          return (
            <div
              key={run._id}
              className={`run-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectRun(run)}
            >
              <div className="run-item-header">
                <span className="run-date">📅 {dateStr}</span>
                <span className="run-points-count">{run.route ? run.route.length : 0} GPS points</span>
              </div>
              <div className="run-item-stats">
                <div>
                  <strong>Distance:</strong> {(run.distance / 1000).toFixed(2)} km
                </div>
                <div>
                  <strong>Duration:</strong> {formatDuration(run.duration)}
                </div>
                <div>
                  <strong>Avg Pace:</strong> {formatPace(run.averagePace)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RunList;
