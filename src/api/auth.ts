import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://jakada-server.onrender.com";

export async function registerUser(
  username: string,
  phoneNumber: string
): Promise<void> {
  // Begin registration
  const beginRes = await fetch(`${BASE_URL}/auth/register/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, phone_number: phoneNumber }),
  });
  if (!beginRes.ok) {
    const err = await beginRes.json();
    throw new Error(err.detail || "Registration failed");
  }
  const options = await beginRes.json();

  // Trigger browser passkey prompt
  const credential = await startRegistration({ optionsJSON: options });

  // Complete registration
  const completeRes = await fetch(`${BASE_URL}/auth/register/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, credential }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json();
    throw new Error(err.detail || "Registration verification failed");
  }

  const data = await completeRes.json();
  localStorage.setItem("jakada_user_id", data.user_id);
  localStorage.setItem("jakada_username", username);
}

export async function loginUser(username: string): Promise<string> {
  // Begin login
  const beginRes = await fetch(`${BASE_URL}/auth/login/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!beginRes.ok) {
    const err = await beginRes.json();
    throw new Error(err.detail || "Login failed");
  }
  const options = await beginRes.json();

  // Trigger browser passkey prompt
  const credential = await startAuthentication({ optionsJSON: options });

  // Complete login
  const completeRes = await fetch(`${BASE_URL}/auth/login/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, credential }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json();
    throw new Error(err.detail || "Login verification failed");
  }

  const data = await completeRes.json();
  localStorage.setItem("jakada_user_id", data.user_id);
  localStorage.setItem("jakada_username", username);

  // Fetch user details to get role
  try {
    const userRes = await fetch(`${BASE_URL}/users/me`, {
      headers: { "user-id": data.user_id },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      localStorage.setItem("jakada_role", userData.role || "civilian");
    } else {
      localStorage.setItem("jakada_role", data.role || "civilian");
    }
  } catch {
    localStorage.setItem("jakada_role", data.role || "civilian");
  }

  return data.user_id;
}

export async function getCurrentUser(): Promise<{ id: string; username: string; role: string } | null> {
  const userId = localStorage.getItem("jakada_user_id");
  if (!userId) return null;

  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) return null;
  return res.json();
}

export function isOperator(): boolean {
  return localStorage.getItem("jakada_role") === "operator";
}

export function logout(): void {
  localStorage.removeItem("jakada_user_id");
  localStorage.removeItem("jakada_username");
  localStorage.removeItem("jakada_role");
}