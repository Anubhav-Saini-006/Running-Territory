import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix standard Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to recenter map view dynamically
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
};

const RunMap = ({ activeRoute = [], currentPosition = null, selectedRun = null }) => {
  // Determine route coordinates array [lat, lng]
  const displayRoute = selectedRun
    ? selectedRun.route.map((p) => [p.latitude, p.longitude])
    : activeRoute.map((p) => [p.latitude, p.longitude]);

  // Determine center point
  let center = [51.505, -0.09]; // Default London fallback
  if (currentPosition) {
    center = [currentPosition.latitude, currentPosition.longitude];
  } else if (displayRoute.length > 0) {
    center = displayRoute[displayRoute.length - 1];
  }

  const startPoint = displayRoute.length > 0 ? displayRoute[0] : null;
  const endPoint = displayRoute.length > 0 ? displayRoute[displayRoute.length - 1] : null;

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} zoom={15} />

        {/* Draw recorded run polyline path */}
        {displayRoute.length > 1 && (
          <Polyline
            positions={displayRoute}
            color="#2563eb"
            weight={5}
            opacity={0.8}
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

        {/* Current / End Position Marker */}
        {currentPosition && (
          <Marker position={[currentPosition.latitude, currentPosition.longitude]}>
            <Popup>
              <strong>Current GPS Location</strong>
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
      </MapContainer>
    </div>
  );
};

export default RunMap;
