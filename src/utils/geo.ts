const R = 6371; // Earth's radius in km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate ETA in minutes based on distance and average speed
 * Assumes average responder speed of 40 km/h
 */
export function calculateETA(distanceKm: number, averageSpeedKmh: number = 40): number {
  if (distanceKm <= 0) return 0;
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.round(timeHours * 60);
}

/**
 * Generate GeoJSON circle for MapLibre
 */
export function generateCircleGeoJSON(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: number[][] = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    // Convert km offset to lat/lng (approximate)
    const lat = centerLat + (dy / 111.32);
    const lng = centerLng + (dx / (111.32 * Math.cos(toRad(centerLat))));

    coords.push([lng, lat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}
