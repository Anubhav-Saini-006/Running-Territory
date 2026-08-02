import React from 'react';

const TopExplorersWidget = ({ topExplorers = [], onSelectExplorer, selectedExplorerId }) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  return (
    <div className="top-explorers-card">
      <div className="explorers-header">
        <div className="explorers-header-title">
          <h3>Top Nearby Explorers</h3>
          <span className="explorers-subtitle">Top 3 in your 5km zone</span>
        </div>
        <span className="live-pulse-badge">● Live</span>
      </div>

      <div className="explorers-list">
        {topExplorers.length === 0 ? (
          <div className="no-explorers-msg">
            🌐 No other explorers in this 5km zone yet. You're the local pioneer!
          </div>
        ) : (
          topExplorers.map((explorer) => {
            const isSelected = selectedExplorerId === explorer.userId;
            return (
              <div
                key={explorer.userId}
                className={`explorer-item rank-${explorer.rank} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectExplorer && onSelectExplorer(explorer)}
              >
                <div className="explorer-rank-icon">{getRankIcon(explorer.rank)}</div>

                <div className="explorer-info">
                  <div className="explorer-name-row">
                    <span className="explorer-username">{explorer.username}</span>
                    <span className="explorer-tag">{explorer.badge}</span>
                  </div>
                  <div className="explorer-stats-row">
                    <span>
                      <strong className="pct-accent">{explorer.percentage}%</strong> area
                    </span>
                    <span className="dot-sep">•</span>
                    <span>{explorer.discoveredKm2} km²</span>
                    <span className="dot-sep">•</span>
                    <span>{explorer.totalDistanceKm} km run</span>
                  </div>
                </div>

                <button className="explorer-focus-btn" title="View on map">
                  📍
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopExplorersWidget;
