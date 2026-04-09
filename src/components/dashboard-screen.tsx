import { useState, useCallback, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { OperatorMap } from "./Map/OperatorMap";
import { AlertMarker } from "./Map/AlertMarker";
import { ResponderMarker } from "./Map/ResponderMarker";
import { RadiusCircle } from "./Map/RadiusCircle";
import { AlertDetailsPanel } from "./AlertDetailsPanel";
import { useAlerts } from "../hooks/useAlerts";
import { useResponders } from "../hooks/useResponders";
import { useOperations } from "../hooks/useOperations";
import { useAudioAlarm } from "../hooks/useAudioAlarm";

export default function DashboardScreen() {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const { alerts, loading, hasNewAlerts, newAlertIds, acknowledgeNewAlert } =
    useAlerts();

  const { operations, getOperationForAlert } = useOperations();

  // Use audio alarm when there are new alerts
  useAudioAlarm(hasNewAlerts);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId);
  const selectedAlertOperation = selectedAlert
    ? getOperationForAlert(selectedAlert.id)
    : null;

  const { responders } = useResponders(
    selectedAlert?.lat ?? null,
    selectedAlert?.lng ?? null,
    5
  );

  const handleMapReady = useCallback((mapInstance: maplibregl.Map) => {
    setMap(mapInstance);
  }, []);

  const handleAlertClick = useCallback(
    (alertId: string) => {
      setSelectedAlertId(alertId);
      acknowledgeNewAlert(alertId);

      // Zoom to alert
      const alert = alerts.find((a) => a.id === alertId);
      if (alert && map) {
        map.flyTo({
          center: [alert.lng, alert.lat],
          zoom: 13,
          duration: 1000,
        });
      }
    },
    [alerts, map, acknowledgeNewAlert]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedAlertId(null);
  }, []);

  const handleAssign = useCallback(() => {
    // Keep panel open but refresh operations
    // The operation will now be linked to the alert
  }, []);

  const handleReassign = useCallback(() => {
    // Reset operations and allow new assignment
    // The alert will be back to active status
  }, []);

  // Auto-zoom to first new alert
  useEffect(() => {
    if (hasNewAlerts && map && alerts.length > 0) {
      const firstNewAlert = alerts.find((a) => newAlertIds.has(a.id));
      if (firstNewAlert) {
        map.flyTo({
          center: [firstNewAlert.lng, firstNewAlert.lat],
          zoom: 13,
          duration: 1000,
        });
      }
    }
  }, [hasNewAlerts, newAlertIds, alerts, map]);

  const activeCount = alerts.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0D0D0D",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Map */}
      <OperatorMap onMapReady={handleMapReady} />

      {/* Alert Markers */}
      {map &&
        alerts.map((alert) => (
          <AlertMarker
            key={alert.id}
            map={map}
            alertId={alert.id}
            lat={alert.lat}
            lng={alert.lng}
            isNew={newAlertIds.has(alert.id)}
            onClick={() => handleAlertClick(alert.id)}
          />
        ))}

      {/* Radius Circle (when alert selected) */}
      {map && selectedAlert && (
        <RadiusCircle
          map={map}
          centerLat={selectedAlert.lat}
          centerLng={selectedAlert.lng}
          radiusKm={5}
          visible={true}
        />
      )}

      {/* Responder Markers */}
      {map &&
        responders.map((responder) => (
          <ResponderMarker
            key={responder.id}
            map={map}
            responderId={responder.id}
            lat={responder.lat}
            lng={responder.lng}
            username={responder.username}
          />
        ))}

      {/* Top Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "rgba(20, 20, 20, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(42, 42, 42, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: hasNewAlerts ? "#FF4D4D" : "#00E5A0",
              boxShadow: hasNewAlerts
                ? "0 0 8px rgba(255, 77, 77, 0.8)"
                : "0 0 8px rgba(0, 229, 160, 0.6)",
              animation: hasNewAlerts ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "0.05em",
            }}
          >
            JAKADA
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#8A8A8A",
            }}
          >
            Operator Dashboard
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#8A8A8A" }}>
              {activeCount} Active Alert{activeCount !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            style={{
              background: "rgba(26, 26, 26, 1)",
              border: "1px solid rgba(42, 42, 42, 1)",
              color: "#8A8A8A",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Left Panel - Alert List */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 0,
          bottom: 0,
          width: 280,
          background: "rgba(20, 20, 20, 0.9)",
          backdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(42, 42, 42, 1)",
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(42, 42, 42, 1)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "#8A8A8A",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Active Alerts
          </span>
        </div>

        {/* Alert List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
          }}
        >
          {!loading && alerts.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(0, 229, 160, 0.1)",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 24 }}>✓</span>
              </div>
              <p style={{ fontSize: 14, color: "#8A8A8A" }}>No active alerts</p>
            </div>
          )}

          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.id)}
              style={{
                padding: 16,
                marginBottom: 8,
                background:
                  selectedAlertId === alert.id
                    ? "rgba(255, 77, 77, 0.1)"
                    : newAlertIds.has(alert.id)
                    ? "rgba(255, 77, 77, 0.05)"
                    : "rgba(26, 26, 26, 1)",
                borderRadius: 8,
                border:
                  selectedAlertId === alert.id
                    ? "1px solid rgba(255, 77, 77, 0.5)"
                    : newAlertIds.has(alert.id)
                    ? "1px solid rgba(255, 77, 77, 0.3)"
                    : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: newAlertIds.has(alert.id) ? "#FF4D4D" : "#8A8A8A",
                    animation: newAlertIds.has(alert.id)
                      ? "pulse 1.5s ease-in-out infinite"
                      : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: newAlertIds.has(alert.id) ? "#FF4D4D" : "#FFFFFF",
                    fontWeight: 500,
                  }}
                >
                  {newAlertIds.has(alert.id) ? "NEW ALERT" : "Alert"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8A8A8A",
                  fontFamily: "monospace",
                }}
              >
                {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
              </div>
            </div>
          ))}
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(42, 42, 42, 1)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#00E5A0",
            }}
          />
          <span style={{ fontSize: 11, color: "#8A8A8A" }}>
            Updating every 3s
          </span>
        </div>
      </div>

      {/* Alert Details Panel */}
      {selectedAlert && (
        <AlertDetailsPanel
          alertId={selectedAlert.id}
          userId={selectedAlert.user_id}
          lat={selectedAlert.lat}
          lng={selectedAlert.lng}
          triggeredAt={selectedAlert.triggered_at}
          responders={responders}
          operation={selectedAlertOperation}
          onClose={handleClosePanel}
          onAssign={handleAssign}
          onReassign={handleReassign}
        />
      )}

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        @keyframes alertPulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.5), 0 0 20px rgba(255, 77, 77, 0.8);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(255, 77, 77, 0.3), 0 0 30px rgba(255, 77, 77, 1);
          }
        }

        @keyframes alertRipple {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(42, 42, 42, 1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
