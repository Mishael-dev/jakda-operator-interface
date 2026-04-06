import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAlerts } from "../api/alerts";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type Alert = {
  id: string;
  user_id: string;
  status: string;
  lat: number;
  lng: number;
  legitimacy_score: number;
  ai_brief: string | null;
  triggered_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "#ff3b3b",
  pending: "#ffb800",
  dispatched: "#378ADD",
  resolved: "#00ff64",
  ignored: "rgba(0,255,100,0.2)",
};

const STATUS_BG: Record<string, string> = {
  active: "rgba(255,59,59,0.1)",
  pending: "rgba(255,184,0,0.1)",
  dispatched: "rgba(55,138,221,0.1)",
  resolved: "rgba(0,255,100,0.1)",
  ignored: "rgba(255,255,255,0.05)",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function createAlertIcon(status: string) {
  const color = STATUS_COLORS[status] || "#00ff64";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border:2px solid #060a07;
      border-radius:50%;
      box-shadow:0 0 6px ${color};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data.alerts || []);
      setLastUpdated(new Date());
      setError("");
    } catch {
      setError("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const activeCount = alerts.filter(
    (a) => a.status === "active" || a.status === "dispatched"
  ).length;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col font-mono"
      style={{ background: "#060a07" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "rgba(0,255,100,0.1)" }}
      >
        <div className="flex items-center gap-6">
          <h1
            className="text-lg tracking-widest font-bold"
            style={{ color: "#00ff64" }}
          >
            JAKADA
          </h1>
          <span
            className="text-[9px] tracking-widest"
            style={{ color: "rgba(0,255,100,0.4)" }}
          >
            COMMAND DASHBOARD
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: activeCount > 0 ? "#ff3b3b" : "#00ff64",
                boxShadow:
                  activeCount > 0
                    ? "0 0 6px #ff3b3b"
                    : "0 0 6px #00ff64",
              }}
            />
            <span
              className="text-[9px] tracking-widest"
              style={{ color: "rgba(0,255,100,0.6)" }}
            >
              {activeCount} ACTIVE
            </span>
          </div>

          {lastUpdated && (
            <span
              className="text-[8px] tracking-widest"
              style={{ color: "rgba(0,255,100,0.3)" }}
            >
              UPDATED {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={handleLogout}
            className="text-[9px] tracking-widest px-4 py-1 border"
            style={{
              color: "rgba(0,255,100,0.4)",
              borderColor: "rgba(0,255,100,0.15)",
            }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — alert feed */}
        <div
          className="w-96 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: "rgba(0,255,100,0.1)" }}
        >
          {/* Panel header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "rgba(0,255,100,0.1)" }}
          >
            <p
              className="text-[9px] tracking-widest"
              style={{ color: "rgba(0,255,100,0.4)" }}
            >
              LIVE ALERT FEED — {alerts.length} TOTAL
            </p>
          </div>

          {/* Alert list */}
          <div className="flex-1">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <p
                  className="text-[9px] tracking-widest animate-pulse"
                  style={{ color: "rgba(0,255,100,0.4)" }}
                >
                  LOADING...
                </p>
              </div>
            )}

            {error && (
              <div className="px-4 py-3">
                <p className="text-[9px] tracking-widest" style={{ color: "#ff3b3b" }}>
                  {error}
                </p>
              </div>
            )}

            {!loading && alerts.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p
                  className="text-[9px] tracking-widest"
                  style={{ color: "rgba(0,255,100,0.2)" }}
                >
                  NO ALERTS
                </p>
              </div>
            )}

            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => navigate(`/alert/${alert.id}`)}
                className="px-4 py-4 border-b cursor-pointer transition-all"
                style={{
                  borderColor: "rgba(0,255,100,0.08)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(0,255,100,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }}
              >
                {/* Status + time */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[8px] tracking-widest px-2 py-0.5"
                    style={{
                      color: STATUS_COLORS[alert.status] || "#00ff64",
                      background: STATUS_BG[alert.status] || "transparent",
                      border: `1px solid ${STATUS_COLORS[alert.status] || "#00ff64"}33`,
                    }}
                  >
                    {alert.status.toUpperCase()}
                  </span>
                  <span
                    className="text-[8px] tracking-widest"
                    style={{ color: "rgba(0,255,100,0.3)" }}
                  >
                    {timeAgo(alert.triggered_at)}
                  </span>
                </div>

                {/* Location */}
                <p
                  className="text-[10px] tracking-widest mb-2"
                  style={{ color: "rgba(0,255,100,0.7)" }}
                >
                  {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                </p>

                {/* Legitimacy score */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-0.5"
                    style={{ background: "rgba(0,255,100,0.1)" }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${alert.legitimacy_score}%`,
                        background:
                          alert.legitimacy_score > 60
                            ? "#00ff64"
                            : alert.legitimacy_score > 30
                            ? "#ffb800"
                            : "#ff3b3b",
                      }}
                    />
                  </div>
                  <span
                    className="text-[8px] tracking-widest"
                    style={{ color: "rgba(0,255,100,0.4)" }}
                  >
                    {alert.legitimacy_score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[9.2182, 9.5179]}
            zoom={10}
            style={{ height: "100%", width: "100%", background: "#060a07" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {alerts
              .filter((a) => a.status !== "resolved" && a.status !== "ignored")
              .map((alert) => (
                <Marker
                  key={alert.id}
                  position={[alert.lat, alert.lng]}
                  icon={createAlertIcon(alert.status)}
                >
                  <Popup>
                    <div style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      <p><strong>{alert.status.toUpperCase()}</strong></p>
                      <p>{alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</p>
                      <p
                        style={{ cursor: "pointer", color: "#0078d4", marginTop: "4px" }}
                        onClick={() => navigate(`/alert/${alert.id}`)}
                      >
                        VIEW DETAIL →
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}