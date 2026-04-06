import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth";

localStorage.setItem("jakada_user_id", "bf89e3a7-d667-41d2-8f75-58226673f9c0")

const BASE_URL = "https://jakada-server.onrender.com";

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
        throw new Error("Access denied — operator accounts only");
      }

      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a07] flex flex-col items-center justify-center font-mono px-8">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <p className="text-[rgba(0,255,100,0.4)] text-[10px] tracking-widest">
            SYS//OPERATOR
          </p>
          <h1 className="text-[#00ff64] text-3xl tracking-widest font-bold">
            JAKADA
          </h1>
          <p className="text-[rgba(0,255,100,0.3)] text-[10px] tracking-widest">
            COMMAND DASHBOARD
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[rgba(0,255,100,0.5)] text-[9px] tracking-widest">
              OPERATOR ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter username"
              className="bg-[#0a0e0b] border border-[rgba(0,255,100,0.2)] text-[#00ff64] px-4 py-3 text-sm tracking-widest outline-none focus:border-[rgba(0,255,100,0.5)] placeholder:text-[rgba(0,255,100,0.2)]"
            />
          </div>

          {error && (
            <p className="text-[#ff3b3b] text-[9px] tracking-widest">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !username.trim()}
            className="border border-[rgba(0,255,100,0.3)] py-3 text-[#00ff64] text-[11px] tracking-widest hover:bg-[rgba(0,255,100,0.05)] transition-colors disabled:opacity-40"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN WITH PASSKEY"}
          </button>
        </div>

        <p className="text-[rgba(0,255,100,0.3)] text-[9px] tracking-widest text-center">
          NEW OPERATOR?{" "}
          <Link
            to="/register"
            className="text-[#00ff64] hover:underline"
          >
            CREATE ACCOUNT
          </Link>
        </p>

        <p className="text-[rgba(0,255,100,0.2)] text-[8px] tracking-widest text-center">
          RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}