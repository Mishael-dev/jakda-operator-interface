import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngTuple } from "leaflet"

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41] 
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function DashboardScreen() {
  // Define as LatLngTuple to satisfy the mutable [number, number] requirement
  const position: LatLngTuple = [20, 0];
  const markerPos: LatLngTuple = [20, 0];
   
  return (
    <MapContainer 
      center={position} 
      zoom={2} 
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png"
      />
      <Marker position={markerPos}>
        <Popup>
          A sample marker.
        </Popup>
      </Marker>
    </MapContainer>
  );
}