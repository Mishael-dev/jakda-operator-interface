const BASE_URL = "https://jakada-server.onrender.com";

export interface OperationCreate {
  alert_id: string;
  responder_ids: string[];
}

export async function createOperation(data: OperationCreate) {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/operations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create operation");
  return res.json();
}

export async function getUser(userId: string) {
  const currentUserId = localStorage.getItem("jakada_user_id") || "";
  // For fetching other users, we need to query by the user-id header
  // The /users/me endpoint returns the current user's data
  // For now, we'll use a query param approach if the backend supports it
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}
