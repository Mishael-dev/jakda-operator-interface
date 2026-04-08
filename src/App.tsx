import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./components/login-screen";
import DashboardScreen from "./components/dashboard-screen";
import { isOperator } from "./api/auth";

// Simple auth check
const isAuthenticated = () => {
  const userId = localStorage.getItem("jakada_user_id");
  return !!userId;
};

// Operator-only route wrapper
function OperatorRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!isOperator()) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0D0D0D",
          color: "#FFFFFF",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255, 77, 77, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            fontSize: 32,
          }}
        >
          ⚠️
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Access Denied</h1>
        <p style={{ fontSize: 16, color: "#8A8A8A", marginBottom: 24 }}>
          This dashboard is for operators only.
        </p>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
          style={{
            background: "#00E5A0",
            border: "none",
            color: "#0D0D0D",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/dashboard"
        element={
          <OperatorRoute>
            <DashboardScreen />
          </OperatorRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
