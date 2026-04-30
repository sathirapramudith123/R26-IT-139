const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "API request failed");
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path),

  post: (path, payload) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  put: (path, payload) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};