import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { User, Lock, Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "https://jakada-server.onrender.com";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    try {
      const userId = await loginUser(username.trim());

      // Verify operator role
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: { "user-id": userId },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const profile = await res.json();

      if (profile.role !== "operator") {
        localStorage.clear();
        throw new Error("Access denied: Operators only");
      }

      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0D0D0D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "11px",
              color: "#8A8A8A",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            System Operator
          </p>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#00E5A0",
              margin: 0,
            }}
          >
            JAKADA
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "#8A8A8A",
              marginTop: "4px",
            }}
          >
            Command Dashboard
          </p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 500,
                color: "#8A8A8A",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Operator ID
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "8px",
                padding: "12px 16px",
                transition: "border-color 150ms ease",
              }}
            >
              <User size={20} color="#8A8A8A" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your username"
                disabled={loading}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "rgba(255, 77, 77, 0.1)",
                borderLeft: "3px solid #FF4D4D",
                padding: "12px 16px",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "#FF4D4D" }}>
                {error}
              </p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !username.trim()}
            style={{
              marginTop: "8px",
              padding: "12px 24px",
              backgroundColor: loading ? "#00C896" : "#00E5A0",
              color: "#000000",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1,
              transition: "all 150ms ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Authenticating...
              </>
            ) : (
              <>
                <Lock size={18} />
                Login with Passkey
              </>
            )}
          </button>
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "#444444",
            textAlign: "center",
            margin: 0,
          }}
        >
          Restricted Access — Authorized Personnel Only
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
