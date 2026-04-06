import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const BASE_URL = "https://jakada-server.onrender.com";

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
  return data.user_id;
}