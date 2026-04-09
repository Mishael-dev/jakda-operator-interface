import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateDistance, calculateETA } from "../utils/geo";

const BASE_URL = "https://jakada-server.onrender.com";

export interface Responder {
  id: string;
  user_id: string;
  username: string;
  lat: number;
  lng: number;
  last_seen: string | null;
  status?: "available" | "busy" | "offline";
  distance_km?: number;
  eta_minutes?: number;
  is_offline?: boolean;
}

const POLL_INTERVAL_MS = 3000;
const OFFLINE_THRESHOLD_MS = 60000; // 60 seconds

// Check if responder is offline based on last_seen timestamp
function isOffline(lastSeen: string | null): boolean {
  if (!lastSeen) return true;
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  return now - lastSeenTime > OFFLINE_THRESHOLD_MS;
}

export function useResponders(alertLat: number | null, alertLng: number | null, radiusKm: number = 5) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
        const offline = isOffline(r.last_seen);
        return {
          ...r,
          distance_km: distance,
          eta_minutes: offline ? null : calculateETA(distance),
          is_offline: offline,
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

  // Search for responders by name (search any responder, not just nearby)
  const searchResponders = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    try {
      setLoading(true);
      const userId = localStorage.getItem("jakada_user_id") || "";

      // Fetch all responders and filter client-side
      // In production, this should be a dedicated search endpoint
      const res = await fetch(`${BASE_URL}/responders`, {
        headers: { "user-id": userId },
      });

      if (!res.ok) throw new Error("Failed to search responders");

      const data = await res.json();
      const allResponders: Responder[] = (data.responders || [])
        .filter((r: Responder) =>
          r.username.toLowerCase().includes(query.toLowerCase())
        )
        .map((r: Responder) => {
          const distance = alertLat && alertLng
            ? calculateDistance(alertLat, alertLng, r.lat, r.lng)
            : null;
          const offline = isOffline(r.last_seen);
          return {
            ...r,
            distance_km: distance,
            eta_minutes: distance && !offline ? calculateETA(distance) : null,
            is_offline: offline,
          };
        });

      setResponders(allResponders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [alertLat, alertLng]);

  useEffect(() => {
    fetchResponders();
    const interval = setInterval(fetchResponders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResponders]);

  // Filter responders based on search query
  const filteredResponders = useMemo(() => {
    if (!searchQuery.trim()) return responders;
    return responders.filter(r =>
      r.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [responders, searchQuery]);

  return {
    responders: filteredResponders,
    allResponders: responders,
    searchQuery,
    setSearchQuery,
    searchResponders,
    loading,
    error,
    refetch: fetchResponders
  };
}
