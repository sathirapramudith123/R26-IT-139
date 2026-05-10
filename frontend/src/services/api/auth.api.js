import { apiClient } from "./client";

export const authApi = {
  login:          (payload) => apiClient.post("/auth/login", payload),
  register:       (payload) => apiClient.post("/auth/register", payload),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  me:             ()        => apiClient.get("/auth/me"),

  // Switch role without re-entering password.
  // Backend validates the new role is within the user's actual permissions.
  switchRole:     (role)    => apiClient.post("/auth/switch-role", { role }),
};
