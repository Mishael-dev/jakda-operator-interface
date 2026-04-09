import { useState, useEffect, useCallback } from "react";
import { getActiveOperations, type Operation } from "../api/operations";

const POLL_INTERVAL_MS = 3000;

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActiveOperations();
      setOperations(data.operations || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
    const interval = setInterval(fetchOperations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOperations]);

  const getOperationForAlert = useCallback(
    (alertId: string): Operation | undefined => {
      return operations.find((op) => op.alert_id === alertId);
    },
    [operations]
  );

  return {
    operations,
    loading,
    error,
    refetch: fetchOperations,
    getOperationForAlert,
  };
}
