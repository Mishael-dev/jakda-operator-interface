import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./components/login-screen";
import DashboardScreen from "./components/dashboard-screen";

// Simple auth check
const isAuthenticated = () => {
  const userId = localStorage.getItem("jakada_user_id");
  return !!userId;
};

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
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
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
