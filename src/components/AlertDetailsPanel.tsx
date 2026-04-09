import { useState, useEffect } from "react";
import type { Responder } from "../hooks/useResponders";
import {
  getUser,
  createOperation,
  cancelOperation,
  type Operation,
} from "../api/operations";

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
  operation?: Operation | null;
  onClose: () => void;
  onAssign: () => void;
  onReassign?: () => void;
}

export function AlertDetailsPanel({
  alertId,
  userId,
  lat,
  lng,
  triggeredAt,
  responders,
  operation,
  onClose,
  onAssign,
  onReassign,
}: AlertDetailsPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResponderIds, setSelectedResponderIds] = useState<Set<string>>(
    new Set()
  );

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

  // Filter responders based on search query
  const filteredResponders = searchQuery.trim()
    ? responders.filter((r) =>
        r.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : responders;

  // Get operation status display
  const getOperationStatusDisplay = () => {
    if (!operation) return null;

    const statusColors: Record<string, string> = {
      pending_dispatch: "#FFA500",
      active: "#00E5A0",
      completed: "#4A4A4A",
      cancelled: "#FF4D4D",
      failed: "#FF4D4D",
    };

    const statusLabels: Record<string, string> = {
      pending_dispatch: "Awaiting Response",
      active: "Help is on the way",
      completed: "Completed",
      cancelled: "Cancelled",
      failed: "Failed - All Declined",
    };

    return {
      color: statusColors[operation.status] || "#8A8A8A",
      label: statusLabels[operation.status] || operation.status,
    };
  };

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
    const availableResponders = responders.filter((r) => !r.is_offline);
    if (availableResponders.length === 0) {
      alert("No available responders to assign.");
      return;
    }
    setAssigning(true);
    try {
      await createOperation({
        alert_id: alertId,
        responder_ids: availableResponders.map((r) => r.id),
      });
      onAssign();
    } catch (e) {
      console.error("Failed to assign all:", e);
      alert("Failed to assign responders. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelOperation = async () => {
    if (!operation) return;
    if (!confirm("Cancel this operation? The alert will return to active status."))
      return;

    setCancelling(true);
    try {
      await cancelOperation(operation.id);
      onReassign?.();
    } catch (e) {
      console.error("Failed to cancel:", e);
      alert("Failed to cancel operation. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const statusDisplay = getOperationStatusDisplay();
  const hasActiveOperation = operation && ["pending_dispatch", "active"].includes(operation.status);

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

      {/* Operation Status */}
      {statusDisplay && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: `${statusDisplay.color}15`,
            border: `1px solid ${statusDisplay.color}`,
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: statusDisplay.color,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Operation Status
            </div>
            <div style={{ fontSize: 14, color: "#FFFFFF", fontWeight: 500 }}>
              {statusDisplay.label}
            </div>
          </div>
          {hasActiveOperation && (
            <button
              onClick={handleCancelOperation}
              disabled={cancelling}
              style={{
                background: "transparent",
                border: "1px solid #FF4D4D",
                color: "#FF4D4D",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      )}

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
            Responders ({filteredResponders.length})
          </div>
          {!hasActiveOperation && filteredResponders.length > 0 && (
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
              {assigning ? "Assigning..." : "Assign Available"}
            </button>
          )}
        </div>

        {/* Search Input */}
        {!hasActiveOperation && (
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search responders by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(26, 26, 26, 1)",
                border: "1px solid rgba(42, 42, 42, 1)",
                borderRadius: 8,
                color: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Assigned Responders (when operation exists) */}
        {hasActiveOperation && operation?.assignments && (
          <div
            style={{
              marginBottom: 16,
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
              Assigned Responders
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {operation.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(20, 20, 20, 0.5)",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 13, color: "#FFFFFF" }}>
                    {assignment.responder?.username || "Unknown"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        assignment.status === "accepted"
                          ? "#00E5A0"
                          : assignment.status === "declined"
                          ? "#FF4D4D"
                          : "#FFA500",
                      textTransform: "capitalize",
                    }}
                  >
                    {assignment.status.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responder Selection List */}
        {!hasActiveOperation && (
          <>
            {filteredResponders.length === 0 ? (
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
                {searchQuery
                  ? "No responders found"
                  : "No responders within 5km"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredResponders.map((responder) => (
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
                      opacity: responder.is_offline ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: "#FFFFFF" }}>
                        {responder.username}
                        {responder.is_offline && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#FF4D4D",
                              marginLeft: 8,
                              padding: "2px 6px",
                              background: "rgba(255, 77, 77, 0.15)",
                              borderRadius: 4,
                            }}
                          >
                            Offline
                          </span>
                        )}
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
                        <span>
                          {responder.distance_km?.toFixed(1) || "?"} km
                        </span>
                        <span>
                          ETA: {responder.is_offline ? "N/A" : `${responder.eta_minutes || "?"} min`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectResponder(responder.id)}
                      disabled={assigning || responder.is_offline}
                      style={{
                        background: selectedResponderIds.has(responder.id)
                          ? "#00E5A0"
                          : "transparent",
                        border: responder.is_offline
                          ? "1px solid #4A4A4A"
                          : "1px solid #00E5A0",
                        color: selectedResponderIds.has(responder.id)
                          ? "#0D0D0D"
                          : responder.is_offline
                          ? "#4A4A4A"
                          : "#00E5A0",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: responder.is_offline ? "not-allowed" : "pointer",
                        minWidth: 70,
                      }}
                    >
                      {selectedResponderIds.has(responder.id)
                        ? "Selected"
                        : responder.is_offline
                        ? "Offline"
                        : "Assign"}
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
                  : `Dispatch ${selectedResponderIds.size} Responder${
                      selectedResponderIds.size > 1 ? "s" : ""
                    }`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
