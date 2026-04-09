const BASE_URL =
  import.meta.env.VITE_API_URL || "https://jakada-server.onrender.com";

export interface OperationCreate {
  alert_id: string;
  responder_ids: string[];
}

export interface Operation {
  id: string;
  alert_id: string;
  operator_id: string;
  status: "pending_dispatch" | "active" | "completed" | "cancelled" | "failed";
  created_at: string;
  completed_at: string | null;
  alert?: Alert;
  assignments?: OperationAssignment[];
}

export interface OperationAssignment {
  id: string;
  operation_id: string;
  responder_id: string;
  status: "pending" | "accepted" | "declined" | "en_route" | "on_scene" | "completed";
  responded_at: string | null;
  eta_minutes: number | null;
  responder?: Responder;
}

export interface Alert {
  id: string;
  user_id: string;
  status: string;
  lat: number;
  lng: number;
  triggered_at: string;
}

export interface Responder {
  id: string;
  username: string;
  last_lat: number | null;
  last_lng: number | null;
  last_seen: string | null;
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

export async function getActiveOperations(): Promise<{ operations: Operation[] }> {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/operations/active`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to fetch operations");
  return res.json();
}

export async function getOperation(operationId: string): Promise<{ operation: Operation }> {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/operations/${operationId}`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to fetch operation");
  return res.json();
}

export async function cancelOperation(operationId: string) {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/operations/${operationId}/cancel`, {
    method: "POST",
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to cancel operation");
  return res.json();
}

export async function getUser(userId: string) {
  // For fetching other users, we need to query by the user-id header
  // The /users/me endpoint returns the current user's data
  // For now, we'll use a query param approach if the backend supports it
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// Search responders by name (new endpoint)
export async function searchResponders(query: string): Promise<{ responders: Responder[] }> {
  const userId = localStorage.getItem("jakada_user_id") || "";
  const res = await fetch(`${BASE_URL}/responders/search?q=${encodeURIComponent(query)}`, {
    headers: { "user-id": userId },
  });

  if (!res.ok) throw new Error("Failed to search responders");
  return res.json();
}
