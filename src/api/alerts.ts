const BASE_URL = "https://jakada-server.onrender.com";

export async function getAlerts() {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/alerts`, {
    headers: { "user-id": userId },
  });
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function getAlert(alertId: string) {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/alerts/${alertId}`, {
    headers: { "user-id": userId },
  });
  if (!res.ok) throw new Error("Failed to fetch alert");
  return res.json();
}

export async function updateAlertStatus(alertId: string, status: string) {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/alerts/${alertId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update alert status");
  return res.json();
}