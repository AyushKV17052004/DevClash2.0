import { API_BASE } from "../config/api";
import { store } from "../redux/store";
import { logout } from "../redux/authSlice";

function getAuthHeaders() {
  const auth = store.getState()?.auth;
  const token = auth?.token;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Load learner profile (weak topics, concepts, flashcards, adaptive totals).
 * Returns null if DB unavailable or request fails — app keeps localStorage state.
 */
export async function fetchUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/user/profile`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      store.dispatch(logout());
      return null;
    }
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Persist full profile snapshot to MongoDB (debounced from the client).
 */
export async function saveUserProfile(payload) {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.status === 503) return { ok: false, skipped: true };
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed (${res.status})`);
  }
  return res.json();
}
