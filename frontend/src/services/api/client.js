const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

/**
 * Get the JWT token from localStorage.
 * Safe to call during SSR — returns null if window is not available.
 */
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/**
 * Build request headers.
 * Injects Authorization: Bearer token automatically on every request.
 */
function buildHeaders(extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle 401 — clear token and redirect to login.
 * Called automatically when any API response returns 401 Unauthorized.
 * This handles expired tokens without requiring the user to manually log out.
 */
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("lankalink_user");
  window.location.href = "/auth/login";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  // Auto-redirect on expired / invalid token
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const apiClient = {
  get:    (path)          => request(path),
  post:   (path, payload) => request(path, { method: "POST",   body: JSON.stringify(payload) }),
  put:    (path, payload) => request(path, { method: "PUT",    body: JSON.stringify(payload) }),
  delete: (path)          => request(path, { method: "DELETE" }),
};
