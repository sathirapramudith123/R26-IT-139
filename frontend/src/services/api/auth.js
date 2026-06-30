import { apiClient } from "./client";
export const authApi = {
  login:          (p) => apiClient.post("/auth/login", p),
  register:       (p) => apiClient.post("/auth/register", p),
  forgotPassword: (p) => apiClient.post("/auth/forgot-password", p),
  resetPassword:  (p) => apiClient.post("/auth/reset-password", p),
};