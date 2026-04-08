import { useState, useEffect } from "react";
import type { Responder } from "../hooks/useResponders";
import { getUser, createOperation } from "../api/operations";

interface User {
  id: string;
  username: string;
  phone: string;
  role: string;
}

interface AlertDetailsPanelProps {
  alertId: string;
  userId: string;
  lat: number;
  lng: number;
  triggeredAt: string;
  responders: Responder[];
  onClose: () => void;
  onAssign: () => void;
}

export function AlertDetailsPanel({
  alertId,
  userId,
  lat,
  lng,
  triggeredAt,
  responders,
  onClose,
  onAssign,
}: AlertDetailsPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getUser(userId);
        setUser(data);
      } catch (e) {
        console.error("Failed to load user:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  const handleSelectResponder = (responderId: string) => {
    setSelectedResponderIds((prev) => {
      const next = new Set(prev);
      if (next.has(responderId)) {
        next.delete(responderId);
      } else {
        next.add(responderId);
      }
      return next;
    });
  };

  const handleAssignSelected = async () => {
    if (selectedResponderIds.size === 0) return;
    setAssigning(true);
    try {
      await createOperation({
        alert_id: alertId,
        responder_ids: Array.from(selectedResponderIds),
      });
      onAssign();
    } catch (e) {
      console.error("Failed to assign:", e);
      alert("Failed to assign responders. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignAll = async () => {
    if (responders.length === 0) return;
    setAssigning(true);
    try {
      await createOperation({
        alert_id: alertId,
        responder_ids: responders.map((r) => r.id),
      });
      onAssign();
    } catch (e) {
      console.error("Failed to assign all:", e);
      alert("Failed to assign responders. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        right: 16,
        width: 360,
        maxHeight: "calc(100vh - 100px)",
        background: "rgba(20, 20, 20, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(42, 42, 42, 1)",
        borderRadius: 12,
        padding: 20,
        zIndex: 20,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(42, 42, 42, 1)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#FF4D4D",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Active Alert
          </div>
          <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 4 }}>
            {timeAgo(triggeredAt)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#8A8A8A",
            fontSize: 20,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      {/* User Info */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            color: "#8A8A8A",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          Civilian
        </div>
        {loading ? (
          <div style={{ color: "#8A8A8A", fontSize: 14 }}>Loading...</div>
        ) : user ? (
          <div>
            <div style={{ fontSize: 16, color: "#FFFFFF", fontWeight: 500 }}>
              {user.username}
            </div>
            <div style={{ fontSize: 14, color: "#8A8A8A", marginTop: 4 }}>
              {user.phone}
            </div>
          </div>
        ) : (
          <div style={{ color: "#8A8A8A", fontSize: 14 }}>User not found</div>
        )}
      </div>

      {/* Location */}
      <div
        style={{
          marginBottom: 20,
          padding: 12,
          background: "rgba(26, 26, 26, 1)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#8A8A8A",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          Location
        </div>
        <div style={{ fontSize: 14, color: "#FFFFFF", fontFamily: "monospace" }}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>
      </div>

      {/* Responders Section */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#8A8A8A",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Nearby Responders ({responders.length})
          </div>
          {responders.length > 0 && (
            <button
              onClick={handleAssignAll}
              disabled={assigning}
              style={{
                background: "rgba(0, 229, 160, 0.15)",
                border: "1px solid #00E5A0",
                color: "#00E5A0",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {assigning ? "Assigning..." : "Assign All"}
            </button>
          )}
        </div>

        {responders.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "#8A8A8A",
              fontSize: 14,
              background: "rgba(26, 26, 26, 1)",
              borderRadius: 8,
            }}
          >
            No responders within 5km
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {responders.map((responder) => (
              <div
                key={responder.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  background: "rgba(26, 26, 26, 1)",
                  borderRadius: 8,
                  border: selectedResponderIds.has(responder.id)
                    ? "1px solid #00E5A0"
                    : "1px solid transparent",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: "#FFFFFF" }}>
                    {responder.username}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8A8A8A",
                      marginTop: 4,
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <span>{responder.distance_km?.toFixed(1)} km</span>
                    <span>ETA: {responder.eta_minutes} min</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectResponder(responder.id)}
                  disabled={assigning}
                  style={{
                    background: selectedResponderIds.has(responder.id)
                      ? "#00E5A0"
                      : "transparent",
                    border: "1px solid #00E5A0",
                    color: selectedResponderIds.has(responder.id)
                      ? "#0D0D0D"
                      : "#00E5A0",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    minWidth: 70,
                  }}
                >
                  {selectedResponderIds.has(responder.id) ? "Selected" : "Assign"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Assign Selected Button */}
        {selectedResponderIds.size > 0 && (
          <button
            onClick={handleAssignSelected}
            disabled={assigning}
            style={{
              width: "100%",
              marginTop: 12,
              background: "#00E5A0",
              border: "none",
              color: "#0D0D0D",
              padding: "12px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {assigning
              ? "Assigning..."
              : `Assign ${selectedResponderIds.size} Responder${selectedResponderIds.size > 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}
