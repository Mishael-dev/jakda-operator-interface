import { useState, useEffect, useCallback } from "react";
import { calculateDistance, calculateETA } from "../utils/geo";

const BASE_URL = "https://jakada-server.onrender.com";

export interface Responder {
  id: string;
  user_id: string;
  username: string;
  lat: number;
  lng: number;
  status: "available" | "busy" | "offline";
  distance_km?: number;
  eta_minutes?: number;
}

const POLL_INTERVAL_MS = 3000;

export function useResponders(alertLat: number | null, alertLng: number | null, radiusKm: number = 5) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponders = useCallback(async () => {
    if (alertLat == null || alertLng == null) {
      setResponders([]);
      return;
    }

    try {
      setLoading(true);
      const userId = localStorage.getItem("jakada_user_id") || "";

      // Use the nearby endpoint with lat/lng/radius
      const res = await fetch(
        `${BASE_URL}/responders/nearby?lat=${alertLat}&lng=${alertLng}&radius=${radiusKm}`,
        {
          headers: { "user-id": userId },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch responders");

      const data = await res.json();
      const list: Responder[] = (data.responders || []).map((r: Responder) => {
        const distance = calculateDistance(alertLat, alertLng, r.lat, r.lng);
        return {
          ...r,
          distance_km: distance,
          eta_minutes: calculateETA(distance),
        };
      });

      // Sort by distance
      list.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

      setResponders(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [alertLat, alertLng, radiusKm]);

  useEffect(() => {
    fetchResponders();
    const interval = setInterval(fetchResponders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResponders]);

  return { responders, loading, error, refetch: fetchResponders };
}
