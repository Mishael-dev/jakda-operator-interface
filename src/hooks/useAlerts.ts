import { useState, useEffect, useCallback, useRef } from "react";

const BASE_URL = "https://jakada-server.onrender.com";

export interface Alert {
  id: string;
  user_id: string;
  status: "pending" | "active" | "dispatched" | "resolved" | "ignored";
  lat: number;
  lng: number;
  triggered_at: string;
  user_name?: string;
  phone?: string;
}

const POLL_INTERVAL_MS = 3000;

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const userId = localStorage.getItem("jakada_user_id") || "";
      const res = await fetch(`${BASE_URL}/alerts/unassigned`, {
        headers: { "user-id": userId },
      });

      if (!res.ok) throw new Error("Failed to fetch alerts");

      const data = await res.json();
      const list: Alert[] = data.alerts || [];

      // Detect new alerts
      const currentIds = new Set(list.map((a) => a.id));
      const newIds = new Set<string>();

      currentIds.forEach((id) => {
        if (!prevAlertIdsRef.current.has(id)) {
          newIds.add(id);
        }
      });

      if (newIds.size > 0) {
        setNewAlertIds(newIds);
      }

      prevAlertIdsRef.current = currentIds;
      setAlerts(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledgeNewAlert = useCallback((alertId: string) => {
    setNewAlertIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  }, []);

  const hasNewAlerts = newAlertIds.size > 0;

  return {
    alerts,
    loading,
    error,
    hasNewAlerts,
    newAlertIds,
    acknowledgeNewAlert,
    refetch: fetchAlerts,
  };
}
