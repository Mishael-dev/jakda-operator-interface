import { Routes, Route, Navigate } from "react-router-dom";
import RegisterScreen from "./components/register-screen";
import LoginScreen from "./components/login-screen";
import DashboardScreen from "./components/dashboard-screen";

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}