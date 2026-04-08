import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import { generateCircleGeoJSON } from "../../utils/geo";

interface RadiusCircleProps {
  map: maplibregl.Map | null;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  visible: boolean;
}

export function RadiusCircle({ map, centerLat, centerLng, radiusKm, visible }: RadiusCircleProps) {
  useEffect(() => {
    if (!map || !visible) return;

    const sourceId = "radius-circle-source";
    const layerId = "radius-circle-layer";

    // Remove existing if any
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: "geojson",
      data: generateCircleGeoJSON(centerLat, centerLng, radiusKm),
    });

    // Add fill layer
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#00E5A0",
        "fill-opacity": 0.08,
      },
    });

    // Add outline layer
    map.addLayer({
      id: `${layerId}-outline`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#00E5A0",
        "line-width": 2,
        "line-dasharray": [4, 4],
        "line-opacity": 0.6,
      },
    });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, centerLat, centerLng, radiusKm, visible]);

  return null;
}
