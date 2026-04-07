import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getAlerts } from "../api/alerts";

type Responder = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_km?: number;
  phone?: string;
  assigned?: boolean;
};

type Alert = {
  id: string;
  user_id: string;
  user_name?: string;
  phone?: string;
  status: string;
  lat: number;
  lng: number;
  legitimacy_score: number;
  ai_brief: string | null;
  triggered_at: string;
  crowd_responses?: { yes: number; no: number };
  nearby_responders?: Responder[];
  responders?: Responder[];
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
  const responderMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responderAssignments, setResponderAssignments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const selectedAlert = alerts.find((alert) => alert.id === selectedId) || null;
  const responders = selectedAlert?.nearby_responders ?? selectedAlert?.responders ?? [];

  const getNearbyResponders = (alert: Alert | null) => alert?.nearby_responders ?? alert?.responders ?? [];

  const formatResponderDistance = (distance?: number) =>
    distance == null ? "--" : `${distance.toFixed(1)} km`;

  const handleAssignResponder = (responder: Responder) => {
    setResponderAssignments((prev) => ({
      ...prev,
      [responder.id]: !prev[responder.id],
    }));
  };

  const handleAssignAll = () => {
    const nextAssignments = { ...responderAssignments };
    responders.forEach((responder) => {
      nextAssignments[responder.id] = true;
    });
    setResponderAssignments(nextAssignments);
  };

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

  useEffect(() => {
    if (selectedId && !alerts.some((alert) => alert.id === selectedId)) {
      setSelectedId(null);
    }
  }, [alerts, selectedId]);

  const activeCount = alerts.filter(
    (a) => a.status === "active" || a.status === "pending"
  ).length;

  useEffect(() => {
    const audio = new Audio("/alert.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const unattended = alerts.some(
      (a) => a.status === "active" || a.status === "pending"
    );

    if (unattended) {
      audio.play().catch(() => {
        console.warn("Alert audio is blocked until user interaction.");
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [alerts]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nearby = getNearbyResponders(selectedAlert);
    const seen = new Set(nearby.map((responder) => responder.id));

    Object.keys(responderMarkersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        responderMarkersRef.current[id].remove();
        delete responderMarkersRef.current[id];
      }
    });

    if (!selectedAlert) return;

    nearby.forEach((responder) => {
      if (responderMarkersRef.current[responder.id]) return;

      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#ffb800";
      el.style.boxShadow = "0 0 12px rgba(255,184,0,0.6), 0 0 24px rgba(255,184,0,0.15)";
      el.style.border = "2px solid rgba(255,255,255,0.18)";
      el.style.cursor = "pointer";
      el.title = responder.name || "Responder";
      el.addEventListener("click", () => setSelectedId(selectedAlert.id));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([responder.lng, responder.lat])
        .addTo(map);

      responderMarkersRef.current[responder.id] = marker;
    });
  }, [selectedAlert]);

  const assignedCount = responders.filter((responder) => responderAssignments[responder.id]).length;

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

      {/* Selected alert detail — full-screen modal */}
      {selectedAlert && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          background: "rgba(0,0,0,0.62)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            width: "min(100%, 960px)",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
            background: "rgba(6,10,7,0.96)",
            border: "1px solid rgba(0,255,100,0.16)",
            borderRadius: 22,
            boxShadow: "0 0 60px rgba(0,0,0,0.55)",
            padding: 28,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <HexBadge status={selectedAlert.status} />
                <div>
                  <div style={{
                    fontSize: 14,
                    letterSpacing: "0.25em",
                    color: STATUS_COLOR[selectedAlert.status],
                    textShadow: `0 0 12px ${STATUS_GLOW[selectedAlert.status]}`,
                    marginBottom: 4,
                  }}>
                    {selectedAlert.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(0,255,100,0.45)" }}>
                    {timeAgo(selectedAlert.triggered_at)} AGO • {selectedAlert.lat.toFixed(4)}°N · {selectedAlert.lng.toFixed(4)}°E
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(0,255,100,0.45)",
                  cursor: "pointer",
                  fontSize: 22,
                  lineHeight: 1,
                  padding: 0,
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px", minWidth: 300, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{
                    padding: "16px 18px",
                    background: "rgba(0,255,100,0.03)",
                    border: "1px solid rgba(0,255,100,0.08)",
                    borderRadius: 16,
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,255,100,0.35)", marginBottom: 6 }}>
                      USER RECORD
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(0,255,100,0.85)", marginBottom: 6 }}>
                      {selectedAlert.user_name || selectedAlert.user_id}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(0,255,100,0.55)", letterSpacing: "0.1em" }}>
                      {selectedAlert.phone || "Phone not available"}
                    </div>
                  </div>

                  <div style={{
                    padding: "16px 18px",
                    background: "rgba(0,255,100,0.03)",
                    border: "1px solid rgba(0,255,100,0.08)",
                    borderRadius: 16,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,255,100,0.35)" }}>
                        CROWD RESPONSES
                      </span>
                      <span style={{ fontSize: 8, color: "rgba(0,255,100,0.35)", letterSpacing: "0.12em" }}>
                        {selectedAlert.crowd_responses?.yes ?? 0} ✓ / {selectedAlert.crowd_responses?.no ?? 0} ✗
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(0,255,100,0.6)", lineHeight: 1.6 }}>
                      {selectedAlert.crowd_responses
                        ? "Realtime civilian confirmation data from the site."
                        : "No crowd response data available yet."}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: "16px 18px",
                  background: "rgba(0,255,100,0.03)",
                  border: "1px solid rgba(0,255,100,0.08)",
                  borderRadius: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,255,100,0.35)" }}>
                      ALERT SCORE
                    </span>
                    <span style={{ fontSize: 8, color: "rgba(0,255,100,0.45)", letterSpacing: "0.12em" }}>
                      {selectedAlert.legitimacy_score}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: "rgba(0,255,100,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${selectedAlert.legitimacy_score}%`,
                      height: "100%",
                      background: selectedAlert.legitimacy_score > 60 ? "#00ff64" : selectedAlert.legitimacy_score > 30 ? "#ffb800" : "#ff3b3b",
                      boxShadow: selectedAlert.legitimacy_score > 60
                        ? "0 0 8px rgba(0,255,100,0.4)"
                        : selectedAlert.legitimacy_score > 30
                        ? "0 0 8px rgba(255,184,0,0.4)"
                        : "0 0 8px rgba(255,59,59,0.4)",
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>

                {selectedAlert.ai_brief && (
                  <div style={{
                    padding: "16px 18px",
                    background: "rgba(0,255,100,0.03)",
                    border: "1px solid rgba(0,255,100,0.08)",
                    borderRadius: 16,
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,255,100,0.35)", marginBottom: 8 }}>
                      AI BRIEF
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(0,255,100,0.6)", lineHeight: 1.6 }}>
                      {selectedAlert.ai_brief}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: "1 1 340px", minWidth: 300, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,255,100,0.35)", marginBottom: 4 }}>
                      NEARBY RESPONDERS
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(0,255,100,0.75)" }}>
                      {responders.length} responders detected
                    </div>
                  </div>
                  <button
                    onClick={handleAssignAll}
                    disabled={responders.length === 0}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: responders.length === 0 ? "rgba(0,255,100,0.08)" : "rgba(0,255,100,0.12)",
                      border: "1px solid rgba(0,255,100,0.18)",
                      color: "#00ff64",
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      cursor: responders.length === 0 ? "not-allowed" : "pointer",
                      fontFamily: "'Share Tech Mono', monospace",
                    }}
                  >
                    ASSIGN ALL
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  minHeight: 180,
                  overflowY: "auto",
                  display: "grid",
                  gap: 12,
                }}>
                  {responders.length === 0 ? (
                    <div style={{
                      padding: "24px 20px",
                      background: "rgba(0,255,100,0.02)",
                      border: "1px dashed rgba(0,255,100,0.12)",
                      borderRadius: 16,
                      textAlign: "center",
                      color: "rgba(0,255,100,0.4)",
                      fontSize: 9,
                      letterSpacing: "0.12em",
                    }}>
                      No nearby responders available for this incident.
                    </div>
                  ) : responders.map((responder) => {
                    const assigned = responderAssignments[responder.id];
                    return (
                      <div key={responder.id} style={{
                        padding: "14px 16px",
                        background: "rgba(0,255,100,0.03)",
                        border: "1px solid rgba(0,255,100,0.08)",
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: "rgba(0,255,100,0.85)", marginBottom: 4 }}>
                            {responder.name || responder.id}
                          </div>
                          <div style={{ fontSize: 8, color: "rgba(0,255,100,0.45)", letterSpacing: "0.1em" }}>
                            {formatResponderDistance(responder.distance_km)} • {responder.phone || "no phone"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignResponder(responder)}
                          style={{
                            minWidth: 96,
                            padding: "8px 12px",
                            borderRadius: 12,
                            background: assigned ? "#00ff64" : "rgba(0,255,100,0.08)",
                            border: assigned ? "1px solid rgba(0,255,100,0.2)" : "1px solid rgba(0,255,100,0.12)",
                            color: assigned ? "#060a07" : "#00ff64",
                            fontSize: 8,
                            letterSpacing: "0.15em",
                            cursor: "pointer",
                            fontFamily: "'Share Tech Mono', monospace",
                          }}
                        >
                          {assigned ? "ASSIGNED" : "ASSIGN"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  padding: "14px 16px",
                  background: "rgba(0,255,100,0.02)",
                  border: "1px solid rgba(0,255,100,0.08)",
                  borderRadius: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 8, color: "rgba(0,255,100,0.45)", letterSpacing: "0.12em" }}>
                    {assignedCount} of {responders.length} responders assigned
                  </span>
                  <span style={{ fontSize: 8, color: "rgba(0,255,100,0.25)", letterSpacing: "0.12em" }}>
                    MAP MARKERS SHOWN IN YELLOW
                  </span>
                </div>
              </div>
            </div>
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