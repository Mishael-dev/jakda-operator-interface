import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const PLATEAU_CENTER: [number, number] = [9.8965, 8.8583]; // [lng, lat]

interface OperatorMapProps {
  onMapReady: (map: maplibregl.Map) => void;
}

export function OperatorMap({ onMapReady }: OperatorMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: PLATEAU_CENTER,
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
    });

    mapRef.current = map;

    map.on("load", () => {
      onMapReady(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapReady]);

  return (
    <div
      ref={mapContainer}
      style={{
        position: "absolute",
        inset: 0,
        background: "#0D0D0D",
      }}
    />
  );
}
