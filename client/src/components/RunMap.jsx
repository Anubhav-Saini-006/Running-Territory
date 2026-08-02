import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ThemeContext } from '../context/ThemeContext';

// Fix standard Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to recenter map view dynamically and fix grey background layout gaps
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, map]);
  return null;
};

// Create custom badge icons for Top 3 Explorers
const createExplorerIcon = (rank, username, color) => {
  const rankBadge = rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : '🥉 #3';
  const badgeBg = color || (rank === 1 ? '#dc2626' : '#2563eb');
  return L.divIcon({
    className: 'custom-explorer-marker',
    html: `
      <div style="
        background-color: ${badgeBg};
        color: #ffffff;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 4px;
        border: 2px solid #ffffff;
      ">
        <span>${rankBadge}</span>
        <span>${username}</span>
      </div>
    `,
    iconSize: [110, 30],
    iconAnchor: [55, 15]
  });
};

const RunMap = ({
  activeRoute = [],
  currentPosition = null,
  selectedRun = null,
  allRuns = [],
  topExplorers = [],
  focusedExplorer = null,
  currentUserId = null,
  isHistoryPage = false
}) => {
  const { theme } = useContext(ThemeContext);

  const [showUserTerritory, setShowUserTerritory] = useState(true);
  const [showTopCandidateRoute, setShowTopCandidateRoute] = useState(true);
  const [showDiscoveryRadius, setShowDiscoveryRadius] = useState(true);
  const [showTopExplorers, setShowTopExplorers] = useState(true);

  // Identify Top #1 Explorer (or top candidate near current position)
  const top1Explorer = topExplorers.find((e) => e.rank === 1 && e.userId !== currentUserId) ||
                       topExplorers.find((e) => e.rank === 2 && e.userId !== currentUserId) ||
                       (topExplorers.length > 0 && topExplorers[0].userId !== currentUserId ? topExplorers[0] : null);

  // Active or selected route path
  const selectedRouteCoords = selectedRun
    ? selectedRun.route.map((p) => [p.latitude, p.longitude])
    : [];

  const activeRouteCoords = activeRoute.map((p) => [p.latitude, p.longitude]);

  // Map center calculation
  let center = [51.505, -0.09]; // Fallback center
  if (focusedExplorer && focusedExplorer.lastLocation) {
    center = [focusedExplorer.lastLocation.latitude, focusedExplorer.lastLocation.longitude];
  } else if (currentPosition) {
    center = [currentPosition.latitude, currentPosition.longitude];
  } else if (selectedRouteCoords.length > 0) {
    center = selectedRouteCoords[selectedRouteCoords.length - 1];
  } else if (allRuns.length > 0 && allRuns[0].route && allRuns[0].route.length > 0) {
    center = [allRuns[0].route[0].latitude, allRuns[0].route[0].longitude];
  }

  const [mapCenterPos, setMapCenterPos] = useState(center);
  const [recenterCount, setRecenterCount] = useState(0);

  useEffect(() => {
    setMapCenterPos(center);
  }, [center]);

  const handleManualRecenter = () => {
    setMapCenterPos([...center]);
    setRecenterCount((prev) => prev + 1);
  };

  const startPoint = selectedRouteCoords.length > 0 ? selectedRouteCoords[0] : null;
  const endPoint = selectedRouteCoords.length > 0 ? selectedRouteCoords[selectedRouteCoords.length - 1] : null;

  // Tile URL based on Dark/Light Mode Theme Context
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="map-container relative-container">
      {/* Floating Recenter Button (Zomato/Swiggy style) */}
      <button
        type="button"
        className="map-recenter-btn"
        onClick={handleManualRecenter}
        title="Recenter Map"
      >
        🎯 Center Location
      </button>

      {/* Map Interactive Layer Toggles (Dashboard ONLY) */}
      {!isHistoryPage && (
        <div className="map-layer-controls">
          <label className="map-control-chip green-chip">
            <input
              type="checkbox"
              checked={showUserTerritory}
              onChange={(e) => setShowUserTerritory(e.target.checked)}
            />
            <span className="color-dot green-dot"></span> Your Territory
          </label>

          {top1Explorer && (
            <label className="map-control-chip red-chip">
              <input
                type="checkbox"
                checked={showTopCandidateRoute}
                onChange={(e) => setShowTopCandidateRoute(e.target.checked)}
              />
              <span className="color-dot red-dot"></span> Top Explorer (#1 {top1Explorer.username})
            </label>
          )}

          <label className="map-control-chip">
            <input
              type="checkbox"
              checked={showDiscoveryRadius}
              onChange={(e) => setShowDiscoveryRadius(e.target.checked)}
            />
            ⭕ 5km Zone
          </label>

          <label className="map-control-chip">
            <input
              type="checkbox"
              checked={showTopExplorers}
              onChange={(e) => setShowTopExplorers(e.target.checked)}
            />
            🏆 Markers
          </label>
        </div>
      )}

      <MapContainer
        center={mapCenterPos}
        zoom={14}
        scrollWheelZoom={isHistoryPage}
        zoomControl={isHistoryPage}
        doubleClickZoom={isHistoryPage}
        touchZoom={isHistoryPage}
        dragging={true}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
        />

        <MapRecenter center={mapCenterPos} zoom={14} key={recenterCount} />

        {/* 5km Radius Discovery Circle Boundary */}
        {!isHistoryPage && showDiscoveryRadius && (
          <Circle
            center={mapCenterPos}
            radius={5000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.06,
              weight: 2,
              dashArray: '8, 8'
            }}
          />
        )}

        {/* 🟢 RENDER USER'S ENTIRE EXPLORED TERRITORY IN VIBRANT GREEN */}
        {(isHistoryPage || showUserTerritory) &&
          allRuns.map((run, idx) => {
            if (!run.route || run.route.length < 2) return null;
            const points = run.route.map((p) => [p.latitude, p.longitude]);
            return (
              <Polyline
                key={`user-run-${run._id || idx}`}
                positions={points}
                color="#10b981"
                weight={6}
                opacity={0.85}
              />
            );
          })}

        {/* 🔴 RENDER TOP CANDIDATE / EXPLORER'S COVERED ROUTES IN CRIMSON RED */}
        {!isHistoryPage &&
          showTopCandidateRoute &&
          top1Explorer &&
          top1Explorer.routes &&
          top1Explorer.routes.map((route, idx) => {
            if (!route || route.length < 2) return null;
            const points = route.map((p) => [p.latitude, p.longitude]);
            return (
              <Polyline
                key={`top-explorer-route-${top1Explorer.userId}-${idx}`}
                positions={points}
                color="#ef4444"
                weight={6}
                opacity={0.85}
                dashArray="4, 4"
              />
            );
          })}

        {/* Active live recording run polyline (Bright Lime Green) */}
        {activeRouteCoords.length > 1 && (
          <Polyline
            positions={activeRouteCoords}
            color="#22c55e"
            weight={7}
            opacity={0.95}
          />
        )}

        {/* Highlight explicitly selected single historical run if clicked */}
        {selectedRouteCoords.length > 1 && (
          <Polyline
            positions={selectedRouteCoords}
            color="#06b6d4"
            weight={8}
            opacity={0.9}
          />
        )}

        {/* Start Point Marker */}
        {startPoint && (
          <Marker position={startPoint}>
            <Popup>
              <strong>Start Position</strong>
            </Popup>
          </Marker>
        )}

        {/* Current GPS Position Marker */}
        {currentPosition && (
          <Marker position={[currentPosition.latitude, currentPosition.longitude]}>
            <Popup>
              <strong>📍 Current Location</strong><br />
              5km Discovery Zone Centered Here
            </Popup>
          </Marker>
        )}

        {/* Selected Run End Marker */}
        {selectedRun && endPoint && (
          <Marker position={endPoint}>
            <Popup>
              <strong>Finish Position</strong><br />
              Distance: {(selectedRun.distance / 1000).toFixed(2)} km
            </Popup>
          </Marker>
        )}

        {/* Render Top 3 Local Explorers Markers on Map */}
        {!isHistoryPage &&
          showTopExplorers &&
          topExplorers.map((explorer) => {
            if (!explorer.lastLocation) return null;
            const pos = [explorer.lastLocation.latitude, explorer.lastLocation.longitude];
            const markerColor = explorer.rank === 1 ? '#dc2626' : explorer.avatarColor;
            const icon = createExplorerIcon(explorer.rank, explorer.username, markerColor);

            return (
              <Marker key={`explorer-marker-${explorer.userId}`} position={pos} icon={icon}>
                <Popup>
                  <div className="explorer-map-popup">
                    <h4>{explorer.badge}</h4>
                    <p className="popup-username">{explorer.username}</p>
                    <div className="popup-stats-grid">
                      <div>
                        <span>Territory:</span>
                        <strong>{explorer.percentage}%</strong>
                      </div>
                      <div>
                        <span>Discovered:</span>
                        <strong>{explorer.discoveredKm2} km²</strong>
                      </div>
                      <div>
                        <span>Total Run:</span>
                        <strong>{explorer.totalDistanceKm} km</strong>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default RunMap;
