import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface AlertMarkerProps {
  map: maplibregl.Map | null;
  alertId: string;
  lat: number;
  lng: number;
  isNew: boolean;
  onClick: () => void;
}

export function AlertMarker({ map, alertId, lat, lng, isNew, onClick }: AlertMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create marker element
    const el = document.createElement("div");
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.backgroundColor = "#FF4D4D";
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.cursor = "pointer";
    el.style.boxShadow = isNew
      ? "0 0 0 4px rgba(255, 77, 77, 0.5), 0 0 20px rgba(255, 77, 77, 0.8)"
      : "0 0 10px rgba(255, 77, 77, 0.6)";
    el.style.animation = isNew ? "alertPulse 1.5s ease-in-out infinite" : "";
    el.addEventListener("click", onClick);

    // Add pulsing ring for new alerts
    if (isNew) {
      const ring = document.createElement("div");
      ring.style.position = "absolute";
      ring.style.inset = "-8px";
      ring.style.border = "2px solid rgba(255, 77, 77, 0.4)";
      ring.style.borderRadius = "50%";
      ring.style.animation = "alertRipple 2s ease-out infinite";
      el.appendChild(ring);
    }

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([lng, lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, alertId, lat, lng, isNew, onClick]);

  return null;
}
