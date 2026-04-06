import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getAlerts } from "../api/alerts";

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

const STATUS_COLOR: Record<string, string> = {
  active: "#ff3b3b",
  pending: "#ffb800",
  dispatched: "#378ADD",
  resolved: "#00ff64",
  ignored: "#444",
};

const STATUS_GLOW: Record<string, string> = {
  active: "rgba(255,59,59,0.6)",
  pending: "rgba(255,184,0,0.6)",
  dispatched: "rgba(55,138,221,0.6)",
  resolved: "rgba(0,255,100,0.6)",
  ignored: "rgba(80,80,80,0.4)",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function HexBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || "#00ff64";
  const glow = STATUS_GLOW[status] || "rgba(0,255,100,0.4)";
  return (
    <div
      style={{
        width: 36,
        height: 36,
        flexShrink: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 36 36" width="36" height="36" style={{ position: "absolute" }}>
        <polygon
          points="18,2 33,10 33,26 18,34 3,26 3,10"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
        />
      </svg>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />
    </div>
  );
}

function AlertCard({
  alert,
  selected,
  onClick,
}: {
  alert: Alert;
  selected: boolean;
  onClick: () => void;
}) {
  const color = STATUS_COLOR[alert.status] || "#00ff64";
  const glow = STATUS_GLOW[alert.status] || "rgba(0,255,100,0.4)";

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid rgba(0,255,100,0.06)",
        cursor: "pointer",
        background: selected
          ? "rgba(0,255,100,0.04)"
          : "transparent",
        borderLeft: selected ? `2px solid ${color}` : "2px solid transparent",
        transition: "all 0.15s ease",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <HexBadge status={alert.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{
            fontSize: 9,
            letterSpacing: "0.15em",
            color,
            textShadow: `0 0 8px ${glow}`,
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            {alert.status.toUpperCase()}
          </span>
          <span style={{ fontSize: 9, color: "rgba(0,255,100,0.3)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>
            {timeAgo(alert.triggered_at)} AGO
          </span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(0,255,100,0.6)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
          {alert.lat.toFixed(4)}°N {alert.lng.toFixed(4)}°E
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 2, background: "rgba(0,255,100,0.08)", borderRadius: 1 }}>
            <div style={{
              height: "100%",
              width: `${alert.legitimacy_score}%`,
              background: alert.legitimacy_score > 60 ? "#00ff64"
                : alert.legitimacy_score > 30 ? "#ffb800" : "#ff3b3b",
              borderRadius: 1,
              boxShadow: alert.legitimacy_score > 60
                ? "0 0 4px rgba(0,255,100,0.6)"
                : alert.legitimacy_score > 30
                ? "0 0 4px rgba(255,184,0,0.6)"
                : "0 0 4px rgba(255,59,59,0.6)",
              transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{ fontSize: 8, color: "rgba(0,255,100,0.3)", fontFamily: "'Share Tech Mono', monospace" }}>
            {alert.legitimacy_score}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Init map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
      center: [9.5179, 9.2182],
      zoom: 10,
    });
    return () => { mapRef.current?.remove(); };
  }, []);

  // Tick for time display refresh
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      const list: Alert[] = data.alerts || [];
      setAlerts(list);

      // Sync markers
      const map = mapRef.current;
      if (!map) return;

      const seen = new Set<string>();
      list.forEach((alert) => {
        seen.add(alert.id);
        const color = STATUS_COLOR[alert.status] || "#00ff64";
        const glow = STATUS_GLOW[alert.status] || "rgba(0,255,100,0.4)";

        if (markersRef.current[alert.id]) {
          // Update existing marker color
          const el = markersRef.current[alert.id].getElement();
          el.style.backgroundColor = color;
          el.style.boxShadow = `0 0 10px ${glow}, 0 0 20px ${glow}`;
        } else {
          // Create new marker
          const el = document.createElement("div");
          el.style.width = "12px";
          el.style.height = "12px";
          el.style.backgroundColor = color;
          el.style.borderRadius = "50%";
          el.style.boxShadow = `0 0 10px ${glow}, 0 0 20px ${glow}`;
          el.style.border = "1px solid rgba(255,255,255,0.2)";
          el.style.cursor = "pointer";
          el.style.transition = "all 0.2s ease";
          el.addEventListener("mouseenter", () => {
            el.style.width = "16px";
            el.style.height = "16px";
            el.style.marginLeft = "-2px";
            el.style.marginTop = "-2px";
          });
          el.addEventListener("mouseleave", () => {
            el.style.width = "12px";
            el.style.height = "12px";
            el.style.marginLeft = "0";
            el.style.marginTop = "0";
          });
          el.addEventListener("click", () => setSelectedId(alert.id));

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([alert.lng, alert.lat])
            .addTo(map);
          markersRef.current[alert.id] = marker;
        }
      });

      // Remove stale markers
      Object.keys(markersRef.current).forEach((id) => {
        if (!seen.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });
    } catch (e) {
      console.error(e);
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
    (a) => a.status === "active" || a.status === "pending"
  ).length;

  const selectedAlert = alerts.find((a) => a.id === selectedId);

  // Fly to selected alert
  useEffect(() => {
    if (selectedAlert && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedAlert.lng, selectedAlert.lat],
        zoom: 14,
        duration: 800,
      });
    }
  }, [selectedAlert]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#060a07", fontFamily: "'Share Tech Mono', monospace" }}>

      {/* Map — full screen base */}
      <div ref={mapContainer} style={{ position: "absolute", inset: 0 }} />

      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        zIndex: 1,
      }} />

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 52,
        background: "rgba(6,10,7,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,255,100,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Hex logo */}
          <svg viewBox="0 0 28 28" width="28" height="28">
            <polygon
              points="14,1 26,7.5 26,20.5 14,27 2,20.5 2,7.5"
              fill="none"
              stroke="#00ff64"
              strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,255,100,0.8))" }}
            />
            <polygon
              points="14,6 21,10 21,18 14,22 7,18 7,10"
              fill="rgba(0,255,100,0.08)"
              stroke="rgba(0,255,100,0.3)"
              strokeWidth="0.5"
            />
          </svg>
          <div>
            <div style={{ fontSize: 14, letterSpacing: "0.3em", color: "#00ff64", textShadow: "0 0 10px rgba(0,255,100,0.6)", lineHeight: 1 }}>
              JAKADA
            </div>
            <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(0,255,100,0.35)", marginTop: 2 }}>
              COMMAND OPERATIONS
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Active count */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: activeCount > 0 ? "#ff3b3b" : "#00ff64",
              boxShadow: activeCount > 0
                ? "0 0 8px rgba(255,59,59,0.8)"
                : "0 0 8px rgba(0,255,100,0.6)",
              animation: activeCount > 0 ? "pulse 1s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: 9, letterSpacing: "0.15em", color: activeCount > 0 ? "#ff3b3b" : "rgba(0,255,100,0.5)" }}>
              {activeCount} ACTIVE INCIDENT{activeCount !== 1 ? "S" : ""}
            </span>
          </div>

          <div style={{ width: 1, height: 16, background: "rgba(0,255,100,0.1)" }} />

          <span style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(0,255,100,0.3)" }}>
            {alerts.length} TOTAL
          </span>

          <div style={{ width: 1, height: 16, background: "rgba(0,255,100,0.1)" }} />

          <button
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
            style={{
              background: "none",
              border: "1px solid rgba(0,255,100,0.15)",
              color: "rgba(0,255,100,0.4)",
              fontSize: 8,
              letterSpacing: "0.15em",
              padding: "4px 12px",
              cursor: "pointer",
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Left panel — alert feed */}
      <div style={{
        position: "absolute",
        top: 52,
        left: 0,
        bottom: 0,
        width: 280,
        background: "rgba(6,10,7,0.82)",
        backdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(0,255,100,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}>
        {/* Panel header */}
        <div style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(0,255,100,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(0,255,100,0.4)" }}>
            LIVE FEED
          </span>
          {loading && (
            <span style={{ fontSize: 8, letterSpacing: "0.1em", color: "rgba(0,255,100,0.2)" }}>
              SYNCING...
            </span>
          )}
        </div>

        {/* Alert list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!loading && alerts.length === 0 && (
            <div style={{ padding: 24, textAlign: "center" }}>
              <svg viewBox="0 0 40 40" width="40" height="40" style={{ margin: "0 auto 12px", display: "block", opacity: 0.2 }}>
                <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke="#00ff64" strokeWidth="1" />
              </svg>
              <p style={{ fontSize: 8, letterSpacing: "0.15em", color: "rgba(0,255,100,0.2)" }}>
                NO INCIDENTS
              </p>
            </div>
          )}
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id + tick}
              alert={alert}
              selected={selectedId === alert.id}
              onClick={() => setSelectedId(prev => prev === alert.id ? null : alert.id)}
            />
          ))}
        </div>

        {/* Bottom status bar */}
        <div style={{
          padding: "8px 14px",
          borderTop: "1px solid rgba(0,255,100,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <div style={{
            width: 4, height: 4, borderRadius: "50%",
            background: "#00ff64",
            boxShadow: "0 0 6px rgba(0,255,100,0.6)",
          }} />
          <span style={{ fontSize: 7, letterSpacing: "0.15em", color: "rgba(0,255,100,0.25)" }}>
            POLLING EVERY 5S
          </span>
        </div>
      </div>

      {/* Selected alert detail — floating card bottom right */}
      {selectedAlert && (
        <div style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 300,
          background: "rgba(6,10,7,0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(0,255,100,0.15)",
          boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,100,0.05)",
          zIndex: 10,
          padding: 16,
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <HexBadge status={selectedAlert.status} />
              <div>
                <div style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: STATUS_COLOR[selectedAlert.status],
                  textShadow: `0 0 8px ${STATUS_GLOW[selectedAlert.status]}`,
                  marginBottom: 2,
                }}>
                  {selectedAlert.status.toUpperCase()}
                </div>
                <div style={{ fontSize: 7, color: "rgba(0,255,100,0.3)", letterSpacing: "0.1em" }}>
                  {timeAgo(selectedAlert.triggered_at)} AGO
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(0,255,100,0.3)",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              ✕
            </button>
          </div>

          {/* Coordinates */}
          <div style={{
            padding: "8px 10px",
            background: "rgba(0,255,100,0.03)",
            border: "1px solid rgba(0,255,100,0.08)",
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 7, letterSpacing: "0.15em", color: "rgba(0,255,100,0.35)", marginBottom: 4 }}>
              COORDINATES
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "rgba(0,255,100,0.8)" }}>
              {selectedAlert.lat.toFixed(6)}°N
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "rgba(0,255,100,0.8)" }}>
              {selectedAlert.lng.toFixed(6)}°E
            </div>
          </div>

          {/* Legitimacy */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 7, letterSpacing: "0.15em", color: "rgba(0,255,100,0.35)" }}>
                LEGITIMACY SCORE
              </span>
              <span style={{ fontSize: 7, letterSpacing: "0.1em", color: "rgba(0,255,100,0.5)" }}>
                {selectedAlert.legitimacy_score}%
              </span>
            </div>
            <div style={{ height: 3, background: "rgba(0,255,100,0.08)", borderRadius: 2 }}>
              <div style={{
                height: "100%",
                width: `${selectedAlert.legitimacy_score}%`,
                background: selectedAlert.legitimacy_score > 60 ? "#00ff64"
                  : selectedAlert.legitimacy_score > 30 ? "#ffb800" : "#ff3b3b",
                borderRadius: 2,
                transition: "width 0.3s ease",
                boxShadow: selectedAlert.legitimacy_score > 60
                  ? "0 0 6px rgba(0,255,100,0.5)"
                  : selectedAlert.legitimacy_score > 30
                  ? "0 0 6px rgba(255,184,0,0.5)"
                  : "0 0 6px rgba(255,59,59,0.5)",
              }} />
            </div>
          </div>

          {/* AI Brief */}
          {selectedAlert.ai_brief && (
            <div style={{
              padding: "8px 10px",
              background: "rgba(0,255,100,0.02)",
              border: "1px solid rgba(0,255,100,0.06)",
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 7, letterSpacing: "0.15em", color: "rgba(0,255,100,0.35)", marginBottom: 4 }}>
                AI BRIEF
              </div>
              <div style={{ fontSize: 9, color: "rgba(0,255,100,0.6)", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                {selectedAlert.ai_brief}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { /* Phase 3 — open full modal */ }}
              style={{
                flex: 1,
                padding: "8px 0",
                background: "rgba(0,255,100,0.08)",
                border: "1px solid rgba(0,255,100,0.2)",
                color: "#00ff64",
                fontSize: 8,
                letterSpacing: "0.15em",
                cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace",
                textShadow: "0 0 8px rgba(0,255,100,0.4)",
              }}
            >
              FULL DETAIL
            </button>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                padding: "8px 14px",
                background: "none",
                border: "1px solid rgba(0,255,100,0.08)",
                color: "rgba(0,255,100,0.3)",
                fontSize: 8,
                letterSpacing: "0.15em",
                cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,100,0.15); border-radius: 2px; }
      `}</style>
    </div>
  );
}