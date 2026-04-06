import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !phoneNumber.trim()) return;
    setLoading(true);
    setError("");
    try {
      await registerUser(username.trim(), phoneNumber.trim());
      navigate("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            CREATE OPERATOR ACCOUNT
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[rgba(0,255,100,0.5)] text-[9px] tracking-widest">
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="bg-[#0a0e0b] border border-[rgba(0,255,100,0.2)] text-[#00ff64] px-4 py-3 text-sm tracking-widest outline-none focus:border-[rgba(0,255,100,0.5)] placeholder:text-[rgba(0,255,100,0.2)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[rgba(0,255,100,0.5)] text-[9px] tracking-widest">
              PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              placeholder="+234..."
              className="bg-[#0a0e0b] border border-[rgba(0,255,100,0.2)] text-[#00ff64] px-4 py-3 text-sm tracking-widest outline-none focus:border-[rgba(0,255,100,0.5)] placeholder:text-[rgba(0,255,100,0.2)]"
            />
          </div>

          {error && (
            <p className="text-[#ff3b3b] text-[9px] tracking-widest">
              {error}
            </p>
          )}

          <button
            onClick={handleRegister}
            disabled={loading || !username.trim() || !phoneNumber.trim()}
            className="border border-[rgba(0,255,100,0.3)] py-3 text-[#00ff64] text-[11px] tracking-widest hover:bg-[rgba(0,255,100,0.05)] transition-colors disabled:opacity-40"
          >
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT WITH PASSKEY"}
          </button>
        </div>

        <p className="text-[rgba(0,255,100,0.3)] text-[9px] tracking-widest text-center">
          ALREADY HAVE AN ACCOUNT?{" "}
          <Link
            to="/login"
            className="text-[#00ff64] hover:underline"
          >
            LOGIN
          </Link>
        </p>

        <p className="text-[rgba(0,255,100,0.2)] text-[8px] tracking-widest text-center">
          RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}