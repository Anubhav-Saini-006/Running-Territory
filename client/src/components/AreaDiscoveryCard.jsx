import React from 'react';

const AreaDiscoveryCard = ({ discoveryStats }) => {
  const { percentage = 0, discoveredKm2 = 0, totalKm2 = 78.54, totalRuns = 0 } = discoveryStats || {};

  // Milestone rank determination based on % territory discovered
  const getRankBadge = (pct) => {
    if (pct >= 50) return { title: '👑 Realm Conqueror', badgeClass: 'rank-conqueror' };
    if (pct >= 25) return { title: '🏆 Territory Veteran', badgeClass: 'rank-veteran' };
    if (pct >= 10) return { title: '⚡ District Explorer', badgeClass: 'rank-explorer' };
    if (pct > 0) return { title: '🧭 Local Pathfinder', badgeClass: 'rank-pathfinder' };
    return { title: '🌱 Fresh Adventurer', badgeClass: 'rank-novice' };
  };

  const rank = getRankBadge(percentage);

  return (
    <div className="discovery-card">
      <div className="discovery-card-header">
        <div className="discovery-title-group">
          <h3>5km Territory Discovery</h3>
          <span className={`discovery-rank-badge ${rank.badgeClass}`}>
            {rank.title}
          </span>
        </div>
        <span className="radius-tag">5km Radius Zone</span>
      </div>

      <div className="discovery-metric-main">
        <div className="discovery-percentage-display">
          <span className="percentage-number">{percentage}%</span>
          <span className="percentage-label">Territory Unlocked</span>
        </div>
        <div className="discovery-stats-split">
          <div className="stat-sub-item">
            <span className="stat-sub-value">{discoveredKm2} km²</span>
            <span className="stat-sub-label">Discovered Area</span>
          </div>
          <div className="stat-sub-divider">/</div>
          <div className="stat-sub-item">
            <span className="stat-sub-value">{totalKm2} km²</span>
            <span className="stat-sub-label">Total 5km Radius</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="discovery-progress-bar-container">
        <div
          className="discovery-progress-bar-fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="discovery-footer-meta">
        <span>Runs tracked in zone: <strong>{totalRuns}</strong></span>
        <span>Target: <strong>78.54 km²</strong></span>
      </div>
    </div>
  );
};

export default AreaDiscoveryCard;
