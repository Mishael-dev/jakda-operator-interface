import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface ResponderMarkerProps {
  map: maplibregl.Map | null;
  responderId: string;
  lat: number;
  lng: number;
  username: string;
}

export function ResponderMarker({ map, responderId, lat, lng, username }: ResponderMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create marker element - different from alert marker
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.backgroundColor = "#00E5A0"; // Primary teal color
    el.style.borderRadius = "50%";
    el.style.border = "2px solid white";
    el.style.cursor = "pointer";
    el.style.boxShadow = "0 0 8px rgba(0, 229, 160, 0.6)";
    el.title = username;

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([lng, lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, responderId, lat, lng, username]);

  return null;
}
