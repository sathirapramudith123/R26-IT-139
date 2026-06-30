const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}
function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("lankalink_user");
  window.location.href = "/auth/login";
}
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    let msg = data?.error ?? data?.message ?? data?.detail ?? `Request failed (${res.status})`;
    if (Array.isArray(msg)) msg = msg.join(", ");
    throw new Error(msg);
  }
  return data;
}
export const apiClient = {
  get:    (p)       => request(p),
  post:   (p, body) => request(p, { method: "POST",   body: JSON.stringify(body) }),
  put:    (p, body) => request(p, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (p)       => request(p, { method: "DELETE" }),
};