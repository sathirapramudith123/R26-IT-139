import { apiClient } from "./client";
export const authApi = {
  login: (p) => apiClient.post("/auth/login", p),
  register: (p) => apiClient.post("/auth/register", p),
  forgotPassword: (p) => apiClient.post("/auth/forgot-password", p),
  resetPassword: (p) => apiClient.post("/auth/reset-password", p),
  // the signed-in user's own profile
  me: () => apiClient.get("/auth/me"),
  updateMe: (p) => apiClient.put("/auth/me", p),
  changePassword: (p) => apiClient.post("/auth/change-password", p),
};
